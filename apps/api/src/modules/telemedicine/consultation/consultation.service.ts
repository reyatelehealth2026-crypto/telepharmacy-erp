import { Injectable, Inject, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../../database/database.constants';
import * as schema from '@telepharmacy/db';
import { eq, and, desc, gte, inArray } from 'drizzle-orm';
import { AgoraService } from './agora.service';
import { ScopeValidatorService } from '../scope/scope-validator.service';
import { EConsentService } from '../consent/consent.service';
import { TelemedicineAuditService } from '../audit/audit.service';
import * as crypto from 'crypto';
import type {
  RequestConsultationDto,
  AcceptConsentDto,
  StartSessionDto,
  EndSessionDto,
  ConsultationResponseDto,
} from './dto/consultation.dto';

const { videoConsultations, patients, staff, kycVerifications } = schema;

@Injectable()
export class ConsultationService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private readonly config: ConfigService,
    private readonly agoraService: AgoraService,
    private readonly scopeValidator: ScopeValidatorService,
    private readonly consentService: EConsentService,
    private readonly auditService: TelemedicineAuditService,
  ) {}

  /**
   * Patient requests consultation
   */
  async requestConsultation(
    patientId: string,
    dto: RequestConsultationDto,
    ipAddress?: string,
    deviceId?: string,
  ): Promise<ConsultationResponseDto> {
    // 1. Validate patient has completed KYC
    const [kycRecord] = await this.db
      .select()
      .from(kycVerifications)
      .where(
        and(
          eq(kycVerifications.patientId, patientId),
          eq(kycVerifications.status, 'completed'),
        ),
      )
      .orderBy(desc(kycVerifications.completedAt))
      .limit(1);

    if (!kycRecord) {
      throw new BadRequestException(
        'กรุณายืนยันตัวตน (KYC) ก่อนใช้บริการเภสัชกรรมทางไกล',
      );
    }

    // Check KYC expiry (1 year)
    const kycExpiryDate = new Date(kycRecord.completedAt);
    kycExpiryDate.setFullYear(kycExpiryDate.getFullYear() + 1);
    if (new Date() > kycExpiryDate) {
      throw new BadRequestException(
        'การยืนยันตัวตนหมดอายุ กรุณายืนยันตัวตนใหม่',
      );
    }

    // 2. Create consultation record
    const sessionId = this.agoraService.generateChannelName(
      crypto.randomUUID(),
    );

    const [consultation] = await this.db
      .insert(videoConsultations)
      .values({
        sessionId,
        patientId,
        type: dto.type,
        status: 'requested',
        chiefComplaint: dto.chiefComplaint,
        symptoms: dto.symptoms,
      })
      .returning();

    // 3. Run scope validation
    const scopeResult = await this.scopeValidator.validateConsultationScope(
      {
        patientId,
        consultationId: consultation.id,
        consultationType: dto.type,
        chiefComplaint: dto.chiefComplaint,
        symptoms: dto.symptoms || [],
        requestedMedications: dto.requestedMedications || [],
      },
      patientId,
      'patient',
    );

    // 4. Update consultation with scope validation result
    await this.db
      .update(videoConsultations)
      .set({
        scopeValidationResult: scopeResult,
        scopeValidatedAt: new Date(),
        status: scopeResult.canProceed ? 'scope_validated' : 'cancelled',
      })
      .where(eq(videoConsultations.id, consultation.id));

    // 5. Audit log
    await this.auditService.log({
      actorId: patientId,
      actorType: 'patient',
      actionType: 'consultation_requested',
      entityType: 'consultation',
      entityId: consultation.id,
      metadata: {
        type: dto.type,
        scopeResult: scopeResult.overallResult,
      },
      ipAddress,
      sessionId,
    });

    // 6. If scope validation failed, return rejection
    if (!scopeResult.canProceed) {
      return {
        consultationId: consultation.id,
        status: 'rejected',
        canProceed: false,
        scopeValidation: scopeResult,
        message: scopeResult.message,
        nextStep: 'referral_required',
      };
    }

    // 7. Get active consent template
    const consentTemplate = await this.consentService.getActiveTemplate('th');

    return {
      consultationId: consultation.id,
      status: 'scope_validated',
      canProceed: true,
      scopeValidation: scopeResult,
      consentTemplate,
      message: 'กรุณายอมรับข้อตกลงการให้บริการเภสัชกรรมทางไกล',
      nextStep: 'accept_consent',
    };
  }

  /**
   * Patient accepts e-consent
   */
  async acceptConsent(
    patientId: string,
    consultationId: string,
    dto: AcceptConsentDto,
  ): Promise<{ accepted: boolean; nextStep: string }> {
    // 1. Verify consultation exists and belongs to patient
    const [consultation] = await this.db
      .select()
      .from(videoConsultations)
      .where(
        and(
          eq(videoConsultations.id, consultationId),
          eq(videoConsultations.patientId, patientId),
        ),
      );

    if (!consultation) {
      throw new NotFoundException('ไม่พบคำขอให้คำปรึกษา');
    }

    if (consultation.status !== 'scope_validated') {
      throw new BadRequestException(
        'สถานะคำขอให้คำปรึกษาไม่ถูกต้อง',
      );
    }

    // 2. Record consent acceptance
    const consentResult = await this.consentService.acceptConsent(
      patientId,
      {
        templateId: dto.templateId,
        signatureDataUrl: dto.signatureData,
        scrolledToEnd: dto.scrolledToEnd,
        timeSpentSeconds: dto.timeSpentSeconds,
        consultationId,
        geolocation: dto.geolocation,
      },
      {
        ipAddress: dto.ipAddress || '',
        deviceId: dto.deviceId || '',
        userAgent: dto.userAgent || '',
      },
    );

    // 3. Update consultation status
    await this.db
      .update(videoConsultations)
      .set({
        status: 'consent_accepted',
        consentVersion: consentResult.consentId, // Store consent ID
        consentAcceptedAt: new Date(),
        consentIpAddress: dto.ipAddress,
        consentDeviceId: dto.deviceId,
        consentSignatureUrl: consentResult.pdfUrl,
      })
      .where(eq(videoConsultations.id, consultationId));

    // 4. Audit log
    await this.auditService.log({
      actorId: patientId,
      actorType: 'patient',
      actionType: 'consent_accepted',
      entityType: 'consultation',
      entityId: consultationId,
      metadata: {
        consentId: consentResult.consentId,
      },
      ipAddress: dto.ipAddress,
    });

    // TODO: Notify available pharmacists via queue/websocket

    return {
      accepted: true,
      nextStep: 'waiting_for_pharmacist',
    };
  }

  /**
   * Pharmacist accepts consultation and generates Agora token
   */
  async acceptConsultation(
    pharmacistId: string,
    consultationId: string,
  ): Promise<{ agoraToken: string; channelName: string; uid: number }> {
    // 1. Verify consultation exists and is available
    const [consultation] = await this.db
      .select()
      .from(videoConsultations)
      .where(eq(videoConsultations.id, consultationId));

    if (!consultation) {
      throw new NotFoundException('ไม่พบคำขอให้คำปรึกษา');
    }

    if (consultation.status !== 'consent_accepted') {
      throw new BadRequestException(
        'คำขอให้คำปรึกษานี้ไม่พร้อมให้บริการ',
      );
    }

    if (consultation.pharmacistId && consultation.pharmacistId !== pharmacistId) {
      throw new ForbiddenException('คำขอให้คำปรึกษานี้ถูกรับโดยเภสัชกรท่านอื่นแล้ว');
    }

    // 2. Assign pharmacist and generate Agora token
    const uid = this.agoraService.generateUid(pharmacistId);
    const agoraToken = this.agoraService.generateToken({
      channelName: consultation.sessionId,
      uid,
      role: 'publisher',
    });

    // 3. Update consultation
    await this.db
      .update(videoConsultations)
      .set({
        pharmacistId,
        status: 'pharmacist_assigned',
        agoraUid: uid,
        agoraToken: this.encryptToken(agoraToken),
      })
      .where(eq(videoConsultations.id, consultationId));

    // 4. Audit log
    await this.auditService.log({
      actorId: pharmacistId,
      actorType: 'pharmacist',
      actionType: 'consultation_accepted',
      entityType: 'consultation',
      entityId: consultationId,
      metadata: { uid },
    });

    return {
      agoraToken,
      channelName: consultation.sessionId,
      uid,
    };
  }

  /**
   * Get Agora token for patient
   */
  async getPatientToken(
    patientId: string,
    consultationId: string,
  ): Promise<{ agoraToken: string; channelName: string; uid: number }> {
    const [consultation] = await this.db
      .select()
      .from(videoConsultations)
      .where(
        and(
          eq(videoConsultations.id, consultationId),
          eq(videoConsultations.patientId, patientId),
        ),
      );

    if (!consultation) {
      throw new NotFoundException('ไม่พบคำขอให้คำปรึกษา');
    }

    if (!['pharmacist_assigned', 'in_progress'].includes(consultation.status)) {
      throw new BadRequestException(
        'คำขอให้คำปรึกษายังไม่พร้อมเริ่มวิดีโอคอล',
      );
    }

    const uid = this.agoraService.generateUid(patientId);
    const agoraToken = this.agoraService.generateToken({
      channelName: consultation.sessionId,
      uid,
      role: 'publisher',
    });

    return {
      agoraToken,
      channelName: consultation.sessionId,
      uid,
    };
  }

  /**
   * Start video session and cloud recording
   */
  async startSession(
    actorId: string,
    consultationId: string,
    dto: StartSessionDto,
  ): Promise<{ sessionStarted: boolean; recordingStarted: boolean }> {
    const [consultation] = await this.db
      .select()
      .from(videoConsultations)
      .where(eq(videoConsultations.id, consultationId));

    if (!consultation) {
      throw new NotFoundException('ไม่พบคำขอให้คำปรึกษา');
    }

    if (consultation.status !== 'pharmacist_assigned') {
      throw new BadRequestException('ไม่สามารถเริ่มวิดีโอคอลได้');
    }

    // Start cloud recording
    const recordingUid = this.agoraService.generateUid('recording-' + consultationId);
    const recordingInfo = await this.agoraService.startCloudRecording({
      channelName: consultation.sessionId,
      uid: recordingUid,
    });

    // Update consultation
    await this.db
      .update(videoConsultations)
      .set({
        status: 'in_progress',
        startedAt: new Date(),
      })
      .where(eq(videoConsultations.id, consultationId));

    // Audit log
    await this.auditService.log({
      actorId,
      actorType: dto.actorType || 'pharmacist',
      actionType: 'session_started',
      entityType: 'consultation',
      entityId: consultationId,
      metadata: {
        recordingSid: recordingInfo.sid,
        recordingResourceId: recordingInfo.resourceId,
      },
    });

    return {
      sessionStarted: true,
      recordingStarted: true,
    };
  }

  /**
   * End video session and finalize recording
   */
  async endSession(
    actorId: string,
    consultationId: string,
    dto: EndSessionDto,
  ): Promise<{ sessionEnded: boolean; recordingUrl: string | null }> {
    const [consultation] = await this.db
      .select()
      .from(videoConsultations)
      .where(eq(videoConsultations.id, consultationId));

    if (!consultation) {
      throw new NotFoundException('ไม่พบคำขอให้คำปรึกษา');
    }

    if (consultation.status !== 'in_progress') {
      throw new BadRequestException('วิดีโอคอลยังไม่ได้เริ่ม');
    }

    // Stop cloud recording
    let recordingUrl: string | null = null;
    let recordingHash: string | null = null;
    let recordingSizeMb: number | null = null;

    if (dto.recordingResourceId && dto.recordingSid) {
      const recordingInfo = await this.agoraService.stopCloudRecording(
        consultation.sessionId,
        dto.recordingResourceId,
        dto.recordingSid,
        this.agoraService.generateUid('recording-' + consultationId),
      );

      // Get recording file info
      if (recordingInfo.fileList && recordingInfo.fileList.length > 0) {
        const mainFile = recordingInfo.fileList[0];
        if (mainFile) {
          recordingUrl = `${this.config.get('minio.endpoint')}/${this.config.get('telemedicine.storage.recordingsBucket')}/${mainFile.filename}`;
          
          // Generate SHA-256 hash for non-repudiation
          recordingHash = await this.generateRecordingHash(recordingUrl);
        }
      }
    }

    // Calculate duration
    const durationSeconds = consultation.startedAt
      ? Math.floor((new Date().getTime() - new Date(consultation.startedAt).getTime()) / 1000)
      : 0;

    // Update consultation
    await this.db
      .update(videoConsultations)
      .set({
        status: 'completed',
        endedAt: new Date(),
        durationSeconds,
        recordingUrl,
        recordingHash,
        recordingSizeMb,
        avgBandwidthKbps: dto.avgBandwidthKbps,
        avgResolution: dto.avgResolution,
        avgFrameRate: dto.avgFrameRate,
        connectionDrops: dto.connectionDrops || 0,
        pharmacistNotes: dto.pharmacistNotes,
      })
      .where(eq(videoConsultations.id, consultationId));

    // Audit log
    await this.auditService.log({
      actorId,
      actorType: dto.actorType || 'pharmacist',
      actionType: 'session_ended',
      entityType: 'consultation',
      entityId: consultationId,
      metadata: {
        durationSeconds,
        recordingHash,
      },
    });

    // TODO: Queue transcript parsing job

    return {
      sessionEnded: true,
      recordingUrl,
    };
  }

  /**
   * Get consultation details
   */
  async getConsultation(
    userId: string,
    consultationId: string,
    userType: 'patient' | 'pharmacist' | 'admin',
  ): Promise<any> {
    const [consultation] = await this.db
      .select()
      .from(videoConsultations)
      .where(eq(videoConsultations.id, consultationId));

    if (!consultation) {
      throw new NotFoundException('ไม่พบคำขอให้คำปรึกษา');
    }

    // Authorization check
    if (userType === 'patient' && consultation.patientId !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
    }

    if (userType === 'pharmacist' && consultation.pharmacistId !== userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
    }

    return consultation;
  }

  /**
   * List consultations with filters
   */
  async listConsultations(
    userId: string,
    userType: 'patient' | 'pharmacist' | 'admin',
    filters: {
      status?: string[];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ consultations: any[]; total: number }> {
    const conditions = [];

    if (userType === 'patient') {
      conditions.push(eq(videoConsultations.patientId, userId));
    } else if (userType === 'pharmacist') {
      conditions.push(eq(videoConsultations.pharmacistId, userId));
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(videoConsultations.status, filters.status as any));
    }

    if (filters.startDate) {
      conditions.push(gte(videoConsultations.createdAt, filters.startDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const consultations = await this.db
      .select()
      .from(videoConsultations)
      .where(whereClause)
      .orderBy(desc(videoConsultations.createdAt))
      .limit(filters.limit || 20)
      .offset(filters.offset || 0);

    return {
      consultations,
      total: consultations.length,
    };
  }

  /**
   * Encrypt Agora token for storage
   */
  private encryptToken(token: string): string {
    // Simple encryption - in production use proper encryption
    return Buffer.from(token).toString('base64');
  }

  /**
   * Generate SHA-256 hash for recording file
   */
  private async generateRecordingHash(recordingUrl: string): Promise<string> {
    // In production, download file and hash it
    // For now, return placeholder
    return crypto
      .createHash('sha256')
      .update(recordingUrl + new Date().toISOString())
      .digest('hex');
  }
}
