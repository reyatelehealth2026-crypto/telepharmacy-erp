import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../../database/database.constants';
import * as schema from '@telepharmacy/db';
import { eq, and, lt, gte, desc } from 'drizzle-orm';
import { TelemedicineAuditService } from '../audit/audit.service';
import axios from 'axios';

const { pharmacistLicenseVerifications, staff } = schema;

export interface VerifyLicenseDto {
  pharmacistId: string;
  licenseNumber: string;
  licenseType?: string;
  issueDate?: Date;
  expiryDate: Date;
}

export interface ManualReviewDto {
  documentUrl: string;
  reviewNotes: string;
  approved: boolean;
}

@Injectable()
export class LicenseVerifierService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private readonly config: ConfigService,
    private readonly auditService: TelemedicineAuditService,
  ) {}

  /**
   * Verify pharmacist license via Thai Pharmacy Council API
   */
  async verifyLicense(dto: VerifyLicenseDto): Promise<any> {
    // 1. Validate license number format
    if (!this.isValidLicenseNumber(dto.licenseNumber)) {
      throw new BadRequestException('รูปแบบเลขใบอนุญาตไม่ถูกต้อง');
    }

    // 2. Check if already verified
    const [existing] = await this.db
      .select()
      .from(pharmacistLicenseVerifications)
      .where(
        and(
          eq(pharmacistLicenseVerifications.pharmacistId, dto.pharmacistId),
          eq(pharmacistLicenseVerifications.licenseNumber, dto.licenseNumber),
        ),
      )
      .orderBy(desc(pharmacistLicenseVerifications.createdAt))
      .limit(1);

    if (
      existing &&
      existing.verificationStatus === 'verified' &&
      new Date(existing.expiryDate) > new Date()
    ) {
      return {
        verificationId: existing.id,
        status: 'verified',
        message: 'ใบอนุญาตได้รับการยืนยันแล้ว',
        expiryDate: existing.expiryDate,
      };
    }

    // 3. Try API verification
    let apiResponse = null;
    let verificationMethod = 'manual'; // Default to manual
    let verificationStatus = 'pending';

    try {
      apiResponse = await this.verifyViaPharmacyCouncilAPI(dto.licenseNumber);
      verificationMethod = 'api';
      verificationStatus = apiResponse.isValid ? 'verified' : 'failed';
    } catch (error) {
      console.error('Pharmacy Council API verification failed:', error);
      // Fall back to manual verification
    }

    // 4. Create verification record
    const [verification] = await this.db
      .insert(pharmacistLicenseVerifications)
      .values({
        pharmacistId: dto.pharmacistId,
        licenseNumber: dto.licenseNumber,
        licenseType: dto.licenseType || 'pharmacist',
        issueDate: dto.issueDate,
        expiryDate: dto.expiryDate,
        verificationMethod,
        verificationStatus,
        apiResponse,
        verifiedAt: verificationStatus === 'verified' ? new Date() : null,
        lastCheckedAt: new Date(),
      })
      .returning();

    // 5. Audit log
    await this.auditService.log({
      actorId: dto.pharmacistId,
      actorType: 'pharmacist',
      actionType: 'license_verification_initiated',
      entityType: 'license_verification',
      entityId: verification.id,
      metadata: {
        licenseNumber: dto.licenseNumber,
        verificationMethod,
        verificationStatus,
      },
    });

    return {
      verificationId: verification.id,
      status: verificationStatus,
      method: verificationMethod,
      message:
        verificationStatus === 'verified'
          ? 'ใบอนุญาตได้รับการยืนยันแล้ว'
          : 'รอการตรวจสอบด้วยตนเอง',
      expiryDate: dto.expiryDate,
      requiresManualReview: verificationMethod === 'manual',
    };
  }

  /**
   * Get license status for pharmacist
   */
  async getLicenseStatus(pharmacistId: string): Promise<any> {
    const [verification] = await this.db
      .select()
      .from(pharmacistLicenseVerifications)
      .where(eq(pharmacistLicenseVerifications.pharmacistId, pharmacistId))
      .orderBy(desc(pharmacistLicenseVerifications.createdAt))
      .limit(1);

    if (!verification) {
      return {
        hasLicense: false,
        status: 'not_verified',
        message: 'ยังไม่มีการยืนยันใบอนุญาต',
      };
    }

    const isExpired = new Date(verification.expiryDate) < new Date();
    const daysUntilExpiry = Math.floor(
      (new Date(verification.expiryDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return {
      hasLicense: true,
      verificationId: verification.id,
      licenseNumber: verification.licenseNumber,
      licenseType: verification.licenseType,
      status: verification.verificationStatus,
      isExpired,
      expiryDate: verification.expiryDate,
      daysUntilExpiry,
      requiresRenewal: daysUntilExpiry <= 60,
      lastCheckedAt: verification.lastCheckedAt,
    };
  }

  /**
   * Manual review of license verification
   */
  async manualReview(
    verificationId: string,
    adminId: string,
    dto: ManualReviewDto,
  ): Promise<any> {
    const [verification] = await this.db
      .select()
      .from(pharmacistLicenseVerifications)
      .where(eq(pharmacistLicenseVerifications.id, verificationId));

    if (!verification) {
      throw new NotFoundException('ไม่พบการยืนยันใบอนุญาต');
    }

    const newStatus = dto.approved ? 'verified' : 'failed';

    await this.db
      .update(pharmacistLicenseVerifications)
      .set({
        verificationStatus: newStatus,
        documentUrl: dto.documentUrl,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes,
        verifiedAt: dto.approved ? new Date() : null,
      })
      .where(eq(pharmacistLicenseVerifications.id, verificationId));

    // Audit log
    await this.auditService.log({
      actorId: adminId,
      actorType: 'admin',
      actionType: 'license_manual_review',
      entityType: 'license_verification',
      entityId: verificationId,
      metadata: {
        approved: dto.approved,
        pharmacistId: verification.pharmacistId,
      },
    });

    return {
      verificationId,
      status: newStatus,
      message: dto.approved
        ? 'ใบอนุญาตได้รับการอนุมัติ'
        : 'ใบอนุญาตไม่ได้รับการอนุมัติ',
    };
  }

  /**
   * Get expiring licenses (within 60 days)
   */
  async getExpiringLicenses(): Promise<any[]> {
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    const expiring = await this.db
      .select()
      .from(pharmacistLicenseVerifications)
      .where(
        and(
          eq(pharmacistLicenseVerifications.verificationStatus, 'verified'),
          lt(pharmacistLicenseVerifications.expiryDate, sixtyDaysFromNow),
          gte(pharmacistLicenseVerifications.expiryDate, new Date()),
        ),
      )
      .orderBy(pharmacistLicenseVerifications.expiryDate);

    return expiring.map((v) => ({
      verificationId: v.id,
      pharmacistId: v.pharmacistId,
      licenseNumber: v.licenseNumber,
      expiryDate: v.expiryDate,
      daysUntilExpiry: Math.floor(
        (new Date(v.expiryDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    }));
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(): Promise<{
    totalPharmacists: number;
    verified: number;
    pending: number;
    expired: number;
    expiringSoon: number;
    complianceRate: number;
  }> {
    // Get all latest verifications per pharmacist
    const allVerifications = await this.db
      .select()
      .from(pharmacistLicenseVerifications)
      .orderBy(desc(pharmacistLicenseVerifications.createdAt));

    // Group by pharmacist (get latest for each)
    const latestByPharmacist = new Map();
    for (const v of allVerifications) {
      if (!latestByPharmacist.has(v.pharmacistId)) {
        latestByPharmacist.set(v.pharmacistId, v);
      }
    }

    const latest = Array.from(latestByPharmacist.values());
    const now = new Date();
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    const verified = latest.filter(
      (v) => v.verificationStatus === 'verified' && new Date(v.expiryDate) > now,
    ).length;

    const pending = latest.filter((v) => v.verificationStatus === 'pending')
      .length;

    const expired = latest.filter(
      (v) =>
        v.verificationStatus === 'verified' && new Date(v.expiryDate) <= now,
    ).length;

    const expiringSoon = latest.filter(
      (v) =>
        v.verificationStatus === 'verified' &&
        new Date(v.expiryDate) > now &&
        new Date(v.expiryDate) <= sixtyDaysFromNow,
    ).length;

    const totalPharmacists = latest.length;
    const complianceRate =
      totalPharmacists > 0 ? (verified / totalPharmacists) * 100 : 0;

    return {
      totalPharmacists,
      verified,
      pending,
      expired,
      expiringSoon,
      complianceRate: Math.round(complianceRate * 100) / 100,
    };
  }

  /**
   * Check and suspend expired licenses (scheduled job)
   */
  async checkAndSuspendExpiredLicenses(): Promise<{
    suspended: number;
    notified: number;
  }> {
    const expired = await this.db
      .select()
      .from(pharmacistLicenseVerifications)
      .where(
        and(
          eq(pharmacistLicenseVerifications.verificationStatus, 'verified'),
          lt(pharmacistLicenseVerifications.expiryDate, new Date()),
        ),
      );

    let suspended = 0;
    let notified = 0;

    for (const verification of expired) {
      if (!verification.suspendedAt) {
        // Suspend license
        await this.db
          .update(pharmacistLicenseVerifications)
          .set({
            verificationStatus: 'expired',
            suspendedAt: new Date(),
            suspensionReason: 'ใบอนุญาตหมดอายุ',
          })
          .where(eq(pharmacistLicenseVerifications.id, verification.id));

        // TODO: Send suspension notification email
        // TODO: Disable pharmacist account from accepting consultations

        suspended++;
        notified++;

        // Audit log
        await this.auditService.log({
          actorId: 'system',
          actorType: 'system',
          actionType: 'license_auto_suspended',
          entityType: 'license_verification',
          entityId: verification.id,
          metadata: {
            pharmacistId: verification.pharmacistId,
            reason: 'expired',
          },
        });
      }
    }

    return { suspended, notified };
  }

  /**
   * Send renewal reminders (scheduled job)
   */
  async sendRenewalReminders(): Promise<{ sent: number }> {
    const expiring = await this.getExpiringLicenses();
    let sent = 0;

    for (const license of expiring) {
      // Check if reminder already sent recently
      const [verification] = await this.db
        .select()
        .from(pharmacistLicenseVerifications)
        .where(eq(pharmacistLicenseVerifications.id, license.verificationId));

      if (verification.expiryReminderSentAt) {
        const daysSinceReminder = Math.floor(
          (new Date().getTime() -
            new Date(verification.expiryReminderSentAt).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        // Send reminder every 14 days
        if (daysSinceReminder < 14) {
          continue;
        }
      }

      // TODO: Send renewal reminder email
      console.log(
        `Sending renewal reminder to pharmacist ${license.pharmacistId}`,
      );

      // Update reminder sent timestamp
      await this.db
        .update(pharmacistLicenseVerifications)
        .set({
          expiryReminderSentAt: new Date(),
        })
        .where(eq(pharmacistLicenseVerifications.id, license.verificationId));

      sent++;
    }

    return { sent };
  }

  /**
   * Validate license number format
   */
  private isValidLicenseNumber(licenseNumber: string): boolean {
    // Thai pharmacist license format: ภ.XXXXX or similar
    // This is a simplified validation
    return /^[ภภก-ฮ]{1,2}\.?\d{4,6}$/.test(licenseNumber);
  }

  /**
   * Verify via Thai Pharmacy Council API (mock implementation)
   */
  private async verifyViaPharmacyCouncilAPI(
    licenseNumber: string,
  ): Promise<any> {
    const apiKey = this.config.get<string>('telemedicine.pharmacyCouncilApiKey');

    if (!apiKey) {
      throw new Error('Pharmacy Council API key not configured');
    }

    // Mock API call - in production, this would call the actual API
    // const response = await axios.get(
    //   `https://api.pharmacycouncil.org/verify/${licenseNumber}`,
    //   {
    //     headers: { 'X-API-Key': apiKey },
    //   },
    // );

    // For now, return mock response
    return {
      isValid: true,
      licenseNumber,
      pharmacistName: 'Mock Pharmacist',
      issueDate: '2020-01-01',
      expiryDate: '2025-12-31',
      status: 'active',
    };
  }
}
