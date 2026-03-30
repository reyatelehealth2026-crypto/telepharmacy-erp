// Example: PDPA Compliance Service Following Telepharmacy Best Practices
// This demonstrates the power's security and compliance guidelines

import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '@telepharmacy/db';
import { patients, pdpaConsents, auditLogs } from '@telepharmacy/db/schema';

@Injectable()
export class PdpaComplianceService {
  private readonly logger = new Logger(PdpaComplianceService.name);

  // ✅ GOOD: Explicit consent tracking (Best Practice #1)
  async recordConsent(patientId: string, consentType: string, ipAddress: string) {
    try {
      await db.transaction(async (tx) => {
        // Record consent
        await tx.insert(pdpaConsents).values({
          patientId,
          consentType,
          consentGiven: true,
          ipAddress,
          userAgent: 'LINE-App', // From request headers
          consentDate: new Date(),
        });

        // Audit log for compliance
        await tx.insert(auditLogs).values({
          entityType: 'patient',
          entityId: patientId,
          action: 'consent_given',
          details: { consentType, ipAddress },
          performedBy: patientId,
          performedAt: new Date(),
        });
      });

      this.logger.log(`PDPA consent recorded`, {
        patientId,
        consentType,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to record PDPA consent', {
        patientId,
        consentType,
        error: error.message,
      });
      throw error;
    }
  }

  // ✅ GOOD: Data export capability (Best Practice #2)
  async exportPatientData(patientId: string) {
    try {
      // Log data access for audit
      await this.logDataAccess(patientId, 'data_export');

      const patientData = await db
        .select({
          personalInfo: {
            name: patients.name,
            phone: patients.phone,
            email: patients.email,
            dateOfBirth: patients.dateOfBirth,
          },
          // Include related data as per PDPA requirements
          // prescriptions, orders, etc.
        })
        .from(patients)
        .where(eq(patients.id, patientId));

      return {
        exportDate: new Date().toISOString(),
        patientId,
        data: patientData[0],
        notice: 'ข้อมูลนี้ถูกส่งออกตามสิทธิของท่านภายใต้ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล',
      };
    } catch (error) {
      this.logger.error('Failed to export patient data', {
        patientId,
        error: error.message,
      });
      throw error;
    }
  }

  // ✅ GOOD: Data deletion with audit trail (Best Practice #3)
  async deletePatientData(patientId: string, reason: string) {
    try {
      await db.transaction(async (tx) => {
        // Soft delete approach for audit compliance
        await tx
          .update(patients)
          .set({
            deletedAt: new Date(),
            deletionReason: reason,
            // Anonymize sensitive data
            name: 'DELETED_USER',
            phone: null,
            email: null,
          })
          .where(eq(patients.id, patientId));

        // Audit log
        await tx.insert(auditLogs).values({
          entityType: 'patient',
          entityId: patientId,
          action: 'data_deletion',
          details: { reason },
          performedBy: 'system',
          performedAt: new Date(),
        });
      });

      this.logger.log(`Patient data deleted`, {
        patientId,
        reason,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to delete patient data', {
        patientId,
        error: error.message,
      });
      throw error;
    }
  }

  // ✅ GOOD: Access logging for compliance (Best Practice #4)
  private async logDataAccess(patientId: string, accessType: string) {
    await db.insert(auditLogs).values({
      entityType: 'patient',
      entityId: patientId,
      action: accessType,
      details: { accessedAt: new Date() },
      performedBy: 'system',
      performedAt: new Date(),
    });
  }

  // ✅ GOOD: Consent validation (Best Practice #5)
  async validateConsent(patientId: string, requiredConsentType: string): Promise<boolean> {
    const consent = await db
      .select()
      .from(pdpaConsents)
      .where(
        eq(pdpaConsents.patientId, patientId) &&
        eq(pdpaConsents.consentType, requiredConsentType) &&
        eq(pdpaConsents.consentGiven, true)
      )
      .limit(1);

    return consent.length > 0;
  }
}