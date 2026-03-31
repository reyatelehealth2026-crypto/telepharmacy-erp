import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../../database/database.constants';
import * as schema from '@telepharmacy/db';
import { eq, and, or, sql } from 'drizzle-orm';
import { TelemedicineAuditService } from '../audit/audit.service';
import * as crypto from 'crypto';

const {
  patients,
  kycVerifications,
  videoConsultations,
  patientConsents,
  emergencyReferrals,
} = schema;

export interface DataExportRequestDto {
  patientId: string;
  requestReason: string;
  deliveryMethod: 'email' | 'download';
}

export interface DataDeletionRequestDto {
  patientId: string;
  deletionReason: string;
  confirmationCode: string;
}

export interface ConsentPreferencesDto {
  marketingConsent: boolean;
  researchConsent: boolean;
  thirdPartySharing: boolean;
  dataRetentionConsent: boolean;
}

@Injectable()
export class PdpaService {
  private readonly encryptionKey: Buffer;
  private readonly dataRetentionYears = 10; // Thai medical records retention

  constructor(
    @Inject(DRIZZLE) private db: any,
    private readonly config: ConfigService,
    private readonly auditService: TelemedicineAuditService,
  ) {
    const key = this.config.get<string>('telemedicine.audit.encryptionKey');
    if (key && key.length >= 32) {
      this.encryptionKey = Buffer.from(key.substring(0, 64).padEnd(64, '0'), 'hex');
    } else {
      const crypto = require('crypto');
      this.encryptionKey = crypto.createHash('sha256').update('telepharmacy-pdpa-fallback-key').digest();
    }
  }

  /**
   * Request patient data export (PDPA Right to Access)
   * Processing time: 30 days as per PDPA
   */
  async requestDataExport(dto: DataExportRequestDto): Promise<{
    requestId: string;
    status: string;
    estimatedCompletionDate: Date;
  }> {
    // Verify patient exists
    const [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, dto.patientId));

    if (!patient) {
      throw new NotFoundException('ไม่พบข้อมูลผู้ป่วย');
    }

    // Create export request record
    const requestId = crypto.randomUUID();
    const estimatedCompletionDate = new Date();
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 30);

    // TODO: Store in pdpa_export_requests table
    // For now, log in audit trail
    await this.auditService.log({
      actorId: dto.patientId,
      actorType: 'patient',
      actionType: 'data_export_requested',
      entityType: 'patient',
      entityId: dto.patientId,
      metadata: {
        requestId,
        reason: dto.requestReason,
        deliveryMethod: dto.deliveryMethod,
      },
    });

    // TODO: Queue background job for data export

    return {
      requestId,
      status: 'pending',
      estimatedCompletionDate,
    };
  }

  /**
   * Export all patient data (PDPA compliance)
   */
  async exportPatientData(patientId: string): Promise<any> {
    // 1. Get patient basic info
    const [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId));

    if (!patient) {
      throw new NotFoundException('ไม่พบข้อมูลผู้ป่วย');
    }

    // 2. Get KYC verifications
    const kycRecords = await this.db
      .select()
      .from(kycVerifications)
      .where(eq(kycVerifications.patientId, patientId));

    // 3. Get consultations
    const consultations = await this.db
      .select()
      .from(videoConsultations)
      .where(eq(videoConsultations.patientId, patientId));

    // 4. Get consents
    const consents = await this.db
      .select()
      .from(patientConsents)
      .where(eq(patientConsents.patientId, patientId));

    // 5. Get referrals
    const referrals = await this.db
      .select()
      .from(emergencyReferrals)
      .where(eq(emergencyReferrals.patientId, patientId));

    // 6. Compile complete data export
    const exportData = {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0.0',
      patient: {
        id: patient.id,
        hn: patient.hn,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        phoneNumber: patient.phoneNumber,
        email: patient.email,
        address: patient.address,
        province: patient.province,
        district: patient.district,
        postalCode: patient.postalCode,
        lineUserId: patient.lineUserId,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      },
      kycVerifications: kycRecords.map((kyc: any) => ({
        id: kyc.id,
        status: kyc.status,
        completedAt: kyc.completedAt,
        expiresAt: kyc.expiresAt,
        // Exclude sensitive document URLs
      })),
      consultations: consultations.map((c: any) => ({
        id: c.id,
        sessionId: c.sessionId,
        type: c.type,
        status: c.status,
        chiefComplaint: c.chiefComplaint,
        startedAt: c.startedAt,
        endedAt: c.endedAt,
        durationSeconds: c.durationSeconds,
        pharmacistNotes: c.pharmacistNotes,
        createdAt: c.createdAt,
      })),
      consents: consents.map((c: any) => ({
        id: c.id,
        templateId: c.templateId,
        accepted: c.accepted,
        acceptedAt: c.acceptedAt,
        withdrawnAt: c.withdrawnAt,
        createdAt: c.createdAt,
      })),
      referrals: referrals.map((r: any) => ({
        id: r.id,
        reason: r.reason,
        urgencyLevel: r.urgencyLevel,
        clinicalSummary: r.clinicalSummary,
        status: r.status,
        acknowledgedAt: r.acknowledgedAt,
        createdAt: r.createdAt,
      })),
      metadata: {
        totalRecords: {
          kycVerifications: kycRecords.length,
          consultations: consultations.length,
          consents: consents.length,
          referrals: referrals.length,
        },
        dataRetentionPolicy: `${this.dataRetentionYears} years`,
        exportFormat: 'JSON',
      },
    };

    // Audit log
    await this.auditService.log({
      actorId: patientId,
      actorType: 'patient',
      actionType: 'data_exported',
      entityType: 'patient',
      entityId: patientId,
      metadata: {
        recordCount: exportData.metadata.totalRecords,
      },
    });

    return exportData;
  }

  /**
   * Request patient data deletion (PDPA Right to Erasure)
   * Processing time: 30 days as per PDPA
   */
  async requestDataDeletion(dto: DataDeletionRequestDto): Promise<{
    requestId: string;
    status: string;
    estimatedCompletionDate: Date;
    retentionNotice: string;
  }> {
    // Verify patient exists
    const [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, dto.patientId));

    if (!patient) {
      throw new NotFoundException('ไม่พบข้อมูลผู้ป่วย');
    }

    // Verify confirmation code
    // TODO: Implement confirmation code verification

    // Create deletion request
    const requestId = crypto.randomUUID();
    const estimatedCompletionDate = new Date();
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 30);

    // Audit log
    await this.auditService.log({
      actorId: dto.patientId,
      actorType: 'patient',
      actionType: 'data_deletion_requested',
      entityType: 'patient',
      entityId: dto.patientId,
      metadata: {
        requestId,
        reason: dto.deletionReason,
      },
    });

    // TODO: Queue background job for data deletion

    return {
      requestId,
      status: 'pending',
      estimatedCompletionDate,
      retentionNotice: `ข้อมูลทางการแพทย์จะถูกเก็บไว้เป็นเวลา ${this.dataRetentionYears} ปีตามกฎหมาย โดยจะทำการ anonymize ข้อมูลส่วนบุคคล`,
    };
  }

  /**
   * Process data deletion (anonymization)
   * Retains medical records but anonymizes personal identifiers
   */
  async processDataDeletion(patientId: string): Promise<{
    deleted: boolean;
    anonymized: boolean;
    retainedRecords: string[];
  }> {
    const [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId));

    if (!patient) {
      throw new NotFoundException('ไม่พบข้อมูลผู้ป่วย');
    }

    // Anonymize patient personal data
    const anonymizedData = {
      firstName: 'DELETED',
      lastName: 'DELETED',
      phoneNumber: null,
      email: null,
      lineUserId: null,
      address: null,
      province: null,
      district: null,
      postalCode: null,
      nationalId: null,
      deletedAt: new Date(),
    };

    await this.db
      .update(patients)
      .set(anonymizedData)
      .where(eq(patients.id, patientId));

    // Anonymize KYC documents (delete document URLs)
    await this.db
      .update(kycVerifications)
      .set({
        idDocumentUrl: null,
        livenessVideoUrl: null,
        selfieUrl: null,
        extractedData: null,
      })
      .where(eq(kycVerifications.patientId, patientId));

    // Keep medical records (consultations, referrals) but anonymized
    // These are retained for legal/medical reasons

    // Audit log
    await this.auditService.log({
      actorId: 'system',
      actorType: 'system',
      actionType: 'data_deletion_processed',
      entityType: 'patient',
      entityId: patientId,
      metadata: {
        anonymized: true,
        retentionPeriod: `${this.dataRetentionYears} years`,
      },
    });

    return {
      deleted: true,
      anonymized: true,
      retainedRecords: [
        'consultations',
        'referrals',
        'audit_logs',
      ],
    };
  }

  /**
   * Get consent status for patient
   */
  async getConsentStatus(patientId: string): Promise<{
    marketingConsent: boolean;
    researchConsent: boolean;
    thirdPartySharing: boolean;
    dataRetentionConsent: boolean;
    lastUpdated: Date;
  }> {
    // TODO: Implement consent preferences table
    // For now, return default values

    return {
      marketingConsent: false,
      researchConsent: false,
      thirdPartySharing: false,
      dataRetentionConsent: true,
      lastUpdated: new Date(),
    };
  }

  /**
   * Update consent preferences
   */
  async updateConsentPreferences(
    patientId: string,
    preferences: ConsentPreferencesDto,
  ): Promise<{ updated: boolean }> {
    // Verify patient exists
    const [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId));

    if (!patient) {
      throw new NotFoundException('ไม่พบข้อมูลผู้ป่วย');
    }

    // TODO: Store in consent_preferences table

    // Audit log
    await this.auditService.log({
      actorId: patientId,
      actorType: 'patient',
      actionType: 'consent_preferences_updated',
      entityType: 'patient',
      entityId: patientId,
      metadata: preferences,
    });

    return { updated: true };
  }

  /**
   * Verify data residency compliance
   */
  async verifyDataResidency(): Promise<{
    compliant: boolean;
    checks: {
      database: { location: string; compliant: boolean };
      storage: { location: string; compliant: boolean };
      cache: { location: string; compliant: boolean };
    };
  }> {
    // Check database location
    const dbHost = this.config.get<string>('database.host') || 'localhost';
    const dbCompliant = this.isThailandLocation(dbHost);

    // Check MinIO location
    const minioEndpoint = this.config.get<string>('minio.endpoint') || 'localhost';
    const storageCompliant = this.isThailandLocation(minioEndpoint);

    // Check Redis location
    const redisHost = this.config.get<string>('redis.host') || 'localhost';
    const cacheCompliant = this.isThailandLocation(redisHost);

    const allCompliant = dbCompliant && storageCompliant && cacheCompliant;

    return {
      compliant: allCompliant,
      checks: {
        database: {
          location: dbHost || 'unknown',
          compliant: dbCompliant,
        },
        storage: {
          location: minioEndpoint || 'unknown',
          compliant: storageCompliant,
        },
        cache: {
          location: redisHost || 'unknown',
          compliant: cacheCompliant,
        },
      },
    };
  }

  /**
   * Check if location is in Thailand
   */
  private isThailandLocation(host: string): boolean {
    if (!host) return false;

    // Check for localhost (development)
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return true; // Allow for development
    }

    // Check for Thailand-specific domains or IPs
    // In production, this should verify actual data center location
    const thailandIndicators = [
      '.th',
      'thailand',
      'bangkok',
      'ap-southeast-1', // AWS Bangkok region
    ];

    return thailandIndicators.some((indicator) =>
      host.toLowerCase().includes(indicator),
    );
  }

  /**
   * Log data access for PDPA compliance
   */
  async logDataAccess(
    accessorId: string,
    accessorType: 'patient' | 'pharmacist' | 'admin' | 'system',
    patientId: string,
    accessReason: string,
    dataTypes: string[],
  ): Promise<void> {
    await this.auditService.log({
      actorId: accessorId,
      actorType: accessorType,
      actionType: 'data_accessed',
      entityType: 'patient',
      entityId: patientId,
      metadata: {
        accessReason,
        dataTypes,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Generate PDPA compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    period: { start: Date; end: Date };
    dataExportRequests: number;
    dataDeletionRequests: number;
    dataAccessLogs: number;
    consentUpdates: number;
    dataResidencyCompliant: boolean;
  }> {
    // TODO: Implement proper aggregation queries

    const residencyCheck = await this.verifyDataResidency();

    return {
      period: { start: startDate, end: endDate },
      dataExportRequests: 0,
      dataDeletionRequests: 0,
      dataAccessLogs: 0,
      consentUpdates: 0,
      dataResidencyCompliant: residencyCheck.compliant,
    };
  }
}
