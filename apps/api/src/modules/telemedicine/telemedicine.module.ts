import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';

// Telemedicine submodules
import { KycModule } from './kyc/kyc.module';
import { TelemedicineAuditModule } from './audit/audit.module';
import { ConsentModule } from './consent/consent.module';
import { ScopeModule } from './scope/scope.module';
import { ConsultationModule } from './consultation/consultation.module';
import { ReferralModule } from './referral/referral.module';
import { LicenseModule } from './license/license.module';
import { PdpaModule } from './pdpa/pdpa.module';
import { ComplianceModule } from './compliance/compliance.module';

/**
 * Telemedicine Module
 *
 * Implements Thai Telemedicine 2569 Legal Compliance
 *
 * Features:
 * - KYC & Identity Verification (Task 2) ✅
 * - Medical-Grade Audit Trail (Task 3) ✅
 * - E-Consent & Disclaimer System (Task 5) ✅
 * - Consultation Scope Validation (Task 6) ✅
 * - Video Consultation Infrastructure (Task 7) ✅
 * - Emergency Referral System (Task 8) ✅
 * - Pharmacist License Verification (Task 10) ✅
 * - PDPA Compliance & Data Residency (Task 11) ✅
 * - Quality Metrics & Compliance Monitoring (Task 13) ✅
 *
 * Pending Implementation:
 * - ส.พ. 16 Compliance Documentation (Task 12)
 * - Recording Parser & Pretty Printer (Task 14)
 * - Background Jobs & Scheduled Tasks (Task 18)
 */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    KycModule,
    TelemedicineAuditModule,
    ConsentModule,
    ScopeModule,
    ConsultationModule,
    ReferralModule,
    LicenseModule,
    PdpaModule,
    ComplianceModule,
  ],
  exports: [
    KycModule,
    TelemedicineAuditModule,
    ConsentModule,
    ScopeModule,
    ConsultationModule,
    ReferralModule,
    LicenseModule,
    PdpaModule,
    ComplianceModule,
  ],
})
export class TelemedicineModule {}
