import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../../database/database.constants';
import { consentTemplates, patientConsents } from '@telepharmacy/db/schema';
import {
  AcceptConsentDto,
  WithdrawConsentDto,
  CreateConsentTemplateDto,
  ConsentTemplateDto,
  PatientConsentDto,
  ConsentAcceptanceResult,
  ConsentStatusDto,
} from './dto/consent.dto';
import { MinioStorageService } from '../kyc/minio.service';
import { PdfService } from './pdf.service';

@Injectable()
export class EConsentService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly minioService: MinioStorageService,
    private readonly pdfService: PdfService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Get active consent template
   */
  async getActiveTemplate(language: string = 'th'): Promise<ConsentTemplateDto> {
    const [template] = await this.db
      .select()
      .from(consentTemplates)
      .where(
        and(
          eq(consentTemplates.language, language),
          eq(consentTemplates.isActive, true),
        ),
      )
      .orderBy(desc(consentTemplates.effectiveFrom))
      .limit(1);

    if (!template) {
      throw new NotFoundException(
        `No active consent template found for language: ${language}`,
      );
    }

    return this.mapTemplateToDto(template);
  }

  /**
   * Get consent template by version
   */
  async getTemplateByVersion(
    version: string,
    language: string = 'th',
  ): Promise<ConsentTemplateDto> {
    const [template] = await this.db
      .select()
      .from(consentTemplates)
      .where(
        and(
          eq(consentTemplates.version, version),
          eq(consentTemplates.language, language),
        ),
      )
      .limit(1);

    if (!template) {
      throw new NotFoundException(
        `Consent template not found: ${version} (${language})`,
      );
    }

    return this.mapTemplateToDto(template);
  }

  /**
   * Get patient's consent status
   */
  async getConsentStatus(patientId: string): Promise<ConsentStatusDto> {
    // Get patient's most recent consent
    const [latestConsent] = await this.db
      .select()
      .from(patientConsents)
      .where(
        and(
          eq(patientConsents.patientId, patientId),
          eq(patientConsents.accepted, true),
          isNull(patientConsents.withdrawnAt),
        ),
      )
      .orderBy(desc(patientConsents.acceptedAt))
      .limit(1);

    if (!latestConsent) {
      return {
        hasActiveConsent: false,
        currentConsent: null,
        requiresNewConsent: true,
        reason: 'No consent found',
      };
    }

    // Get the template to check if it's still active
    const [template] = await this.db
      .select()
      .from(consentTemplates)
      .where(eq(consentTemplates.id, latestConsent.templateId))
      .limit(1);

    // Check if template is still active
    const isTemplateActive = template?.isActive === true;
    const isTemplateExpired =
      template?.effectiveUntil && new Date(template.effectiveUntil) < new Date();

    const requiresNewConsent = !isTemplateActive || isTemplateExpired;

    return {
      hasActiveConsent: !requiresNewConsent,
      currentConsent: latestConsent ? await this.mapConsentToDto(latestConsent) : null,
      requiresNewConsent,
      reason: requiresNewConsent
        ? isTemplateExpired
          ? 'Consent template expired'
          : 'Consent template no longer active'
        : null,
    };
  }

  /**
   * Accept consent (patient signs)
   */
  async acceptConsent(
    patientId: string,
    dto: AcceptConsentDto,
    metadata: {
      ipAddress: string;
      userAgent: string;
      deviceId: string;
    },
  ): Promise<ConsentAcceptanceResult> {
    // Validate template exists
    const [template] = await this.db
      .select()
      .from(consentTemplates)
      .where(eq(consentTemplates.id, dto.templateId))
      .limit(1);

    if (!template) {
      throw new NotFoundException('Consent template not found');
    }

    if (!template.isActive) {
      throw new BadRequestException('Consent template is not active');
    }

    // Validate scroll tracking
    if (!dto.scrolledToEnd) {
      throw new BadRequestException(
        'Patient must scroll to the end of the consent document',
      );
    }

    // Validate minimum time spent (at least 30 seconds)
    if (dto.timeSpentSeconds < 30) {
      throw new BadRequestException(
        'Patient must spend at least 30 seconds reading the consent',
      );
    }

    // Upload signature image to MinIO
    const signatureUrl = await this.uploadSignature(
      patientId,
      dto.signatureDataUrl,
    );

    // Create consent record
    const [consent] = await this.db
      .insert(patientConsents)
      .values({
        patientId,
        templateId: dto.templateId,
        consultationId: dto.consultationId || null,
        accepted: true,
        acceptedAt: new Date(),
        signatureUrl,
        scrolledToEnd: dto.scrolledToEnd,
        timeSpentSeconds: dto.timeSpentSeconds,
        ipAddress: metadata.ipAddress,
        deviceId: metadata.deviceId,
        userAgent: metadata.userAgent,
        geolocation: dto.geolocation || null,
      })
      .returning();

    // Generate PDF for patient download
    const pdfUrl = await this.generateConsentPdf(consent, template);

    // Update consent with PDF URL
    await this.db
      .update(patientConsents)
      .set({
        pdfUrl,
        pdfGeneratedAt: new Date(),
      })
      .where(eq(patientConsents.id, consent.id));

    return {
      success: true,
      consentId: consent.id,
      pdfUrl,
      message: 'Consent accepted successfully',
    };
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(
    patientId: string,
    dto: WithdrawConsentDto,
  ): Promise<void> {
    const [consent] = await this.db
      .select()
      .from(patientConsents)
      .where(
        and(
          eq(patientConsents.id, dto.consentId),
          eq(patientConsents.patientId, patientId),
        ),
      )
      .limit(1);

    if (!consent) {
      throw new NotFoundException('Consent not found');
    }

    if (consent.withdrawnAt) {
      throw new BadRequestException('Consent already withdrawn');
    }

    await this.db
      .update(patientConsents)
      .set({
        withdrawnAt: new Date(),
        withdrawalReason: dto.reason,
      })
      .where(eq(patientConsents.id, dto.consentId));
  }

  /**
   * Create new consent template (admin only)
   */
  async createTemplate(
    dto: CreateConsentTemplateDto,
    createdBy: string,
  ): Promise<ConsentTemplateDto> {
    // Check if version already exists
    const [existing] = await this.db
      .select()
      .from(consentTemplates)
      .where(
        and(
          eq(consentTemplates.version, dto.version),
          eq(consentTemplates.language, dto.language),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException(
        `Consent template version ${dto.version} already exists for language ${dto.language}`,
      );
    }

    const [template] = await this.db
      .insert(consentTemplates)
      .values({
        version: dto.version,
        language: dto.language,
        title: dto.title,
        content: dto.content,
        clauses: dto.clauses,
        isActive: true,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : null,
        createdBy,
      })
      .returning();

    return this.mapTemplateToDto(template);
  }

  /**
   * Deactivate consent template
   */
  async deactivateTemplate(templateId: string): Promise<void> {
    await this.db
      .update(consentTemplates)
      .set({ isActive: false })
      .where(eq(consentTemplates.id, templateId));
  }

  /**
   * Get patient's consent history
   */
  async getConsentHistory(patientId: string): Promise<PatientConsentDto[]> {
    const consents = await this.db
      .select()
      .from(patientConsents)
      .where(eq(patientConsents.patientId, patientId))
      .orderBy(desc(patientConsents.createdAt));

    return Promise.all(consents.map((c) => this.mapConsentToDto(c)));
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async uploadSignature(
    patientId: string,
    signatureDataUrl: string,
  ): Promise<string> {
    // Extract base64 data from data URL
    const matches = signatureDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new BadRequestException('Invalid signature data URL format');
    }

    const [, extension, base64Data] = matches;
    const buffer = Buffer.from(base64Data, 'base64');

    const filename = `consent-signatures/${patientId}/${Date.now()}.${extension}`;
    const bucket = this.config.get('telemedicine.storage.documentsBucket');

    return await this.minioService.upload(bucket, filename, buffer);
  }

  private async generateConsentPdf(
    consent: any,
    template: any,
  ): Promise<string> {
    const pdfBuffer = await this.pdfService.generateConsentPdf({
      consent,
      template,
    });

    const filename = `consent-pdfs/${consent.patientId}/${consent.id}.pdf`;
    const bucket = this.config.get('telemedicine.storage.documentsBucket');

    return await this.minioService.upload(bucket, filename, pdfBuffer);
  }

  private mapTemplateToDto(template: any): ConsentTemplateDto {
    return {
      id: template.id,
      version: template.version,
      language: template.language,
      title: template.title,
      content: template.content,
      clauses: template.clauses,
      isActive: template.isActive,
      effectiveFrom: template.effectiveFrom,
      effectiveUntil: template.effectiveUntil,
      createdAt: template.createdAt,
    };
  }

  private async mapConsentToDto(consent: any): Promise<PatientConsentDto> {
    // Fetch template
    const [template] = await this.db
      .select()
      .from(consentTemplates)
      .where(eq(consentTemplates.id, consent.templateId))
      .limit(1);

    return {
      id: consent.id,
      patientId: consent.patientId,
      templateId: consent.templateId,
      template: template ? this.mapTemplateToDto(template) : null,
      consultationId: consent.consultationId,
      accepted: consent.accepted,
      acceptedAt: consent.acceptedAt,
      signatureUrl: consent.signatureUrl,
      scrolledToEnd: consent.scrolledToEnd,
      timeSpentSeconds: consent.timeSpentSeconds,
      ipAddress: consent.ipAddress,
      deviceId: consent.deviceId,
      userAgent: consent.userAgent,
      geolocation: consent.geolocation,
      withdrawnAt: consent.withdrawnAt,
      withdrawalReason: consent.withdrawalReason,
      pdfUrl: consent.pdfUrl,
      pdfGeneratedAt: consent.pdfGeneratedAt,
      createdAt: consent.createdAt,
    };
  }
}
