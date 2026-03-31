import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../../database/database.constants';
import * as schema from '@telepharmacy/db';
import { eq, and, gte, lte, count, avg, sql } from 'drizzle-orm';

const {
  kycVerifications,
  videoConsultations,
  emergencyReferrals,
  pharmacistLicenseVerifications,
  patientConsents,
  telemedicineAuditLog,
} = schema;

export interface ComplianceMetrics {
  kycSuccessRate: number;
  consultationCompletionRate: number;
  referralRate: number;
  avgConsultationDuration: number;
  consentAcceptanceRate: number;
  licenseComplianceRate: number;
  auditTrailIntegrity: number;
  dataResidencyCompliant: boolean;
}

export interface QualityMetrics {
  avgVideoResolution: string;
  avgFrameRate: number;
  avgBandwidth: number;
  connectionDropRate: number;
  patientSatisfactionScore: number;
}

export interface Alert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
}

@Injectable()
export class ComplianceMonitorService {
  private readonly targets = {
    kycSuccessRate: 95,
    consultationCompletionRate: 90,
    referralRateThreshold: 15,
    licenseComplianceRate: 100,
    auditTrailIntegrity: 100,
  };

  constructor(
    @Inject(DRIZZLE) private db: any,
    private readonly config: ConfigService,
  ) {}

  /**
   * Get real-time compliance dashboard metrics
   */
  async getDashboardMetrics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<ComplianceMetrics> {
    const start = startDate || this.getDefaultStartDate();
    const end = endDate || new Date();

    // 1. KYC Success Rate
    const kycSuccessRate = await this.calculateKycSuccessRate(start, end);

    // 2. Consultation Completion Rate
    const consultationCompletionRate =
      await this.calculateConsultationCompletionRate(start, end);

    // 3. Referral Rate
    const referralRate = await this.calculateReferralRate(start, end);

    // 4. Average Consultation Duration
    const avgConsultationDuration =
      await this.calculateAvgConsultationDuration(start, end);

    // 5. Consent Acceptance Rate
    const consentAcceptanceRate = await this.calculateConsentAcceptanceRate(
      start,
      end,
    );

    // 6. License Compliance Rate
    const licenseComplianceRate = await this.calculateLicenseComplianceRate();

    // 7. Audit Trail Integrity
    const auditTrailIntegrity = await this.verifyAuditTrailIntegrity();

    // 8. Data Residency
    const dataResidencyCompliant = await this.verifyDataResidency();

    return {
      kycSuccessRate,
      consultationCompletionRate,
      referralRate,
      avgConsultationDuration,
      consentAcceptanceRate,
      licenseComplianceRate,
      auditTrailIntegrity,
      dataResidencyCompliant,
    };
  }

  /**
   * Get video quality metrics
   */
  async getQualityMetrics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<QualityMetrics> {
    const start = startDate || this.getDefaultStartDate();
    const end = endDate || new Date();

    const consultations = await this.db
      .select()
      .from(videoConsultations)
      .where(
        and(
          eq(videoConsultations.status, 'completed'),
          gte(videoConsultations.startedAt, start),
          lte(videoConsultations.endedAt, end),
        ),
      );

    if (consultations.length === 0) {
      return {
        avgVideoResolution: 'N/A',
        avgFrameRate: 0,
        avgBandwidth: 0,
        connectionDropRate: 0,
        patientSatisfactionScore: 0,
      };
    }

    // Calculate averages
    const totalBandwidth = consultations.reduce(
      (sum: number, c: any) => sum + (c.avgBandwidthKbps || 0),
      0,
    );
    const totalFrameRate = consultations.reduce(
      (sum: number, c: any) => sum + (c.avgFrameRate || 0),
      0,
    );
    const totalDrops = consultations.reduce(
      (sum: number, c: any) => sum + (c.connectionDrops || 0),
      0,
    );

    // Most common resolution
    const resolutions = consultations
      .map((c: any) => c.avgResolution)
      .filter(Boolean);
    const avgVideoResolution =
      resolutions.length > 0 ? this.getMostCommon(resolutions) : 'N/A';

    return {
      avgVideoResolution,
      avgFrameRate: Math.round(totalFrameRate / consultations.length),
      avgBandwidth: Math.round(totalBandwidth / consultations.length),
      connectionDropRate: (totalDrops / consultations.length) * 100,
      patientSatisfactionScore: 0, // TODO: Implement satisfaction surveys
    };
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const metrics = await this.getDashboardMetrics();

    // Check KYC success rate
    if (metrics.kycSuccessRate < this.targets.kycSuccessRate) {
      alerts.push({
        id: 'kyc-success-rate',
        type: 'warning',
        metric: 'KYC Success Rate',
        message: `อัตราความสำเร็จของ KYC ต่ำกว่าเป้าหมาย (${metrics.kycSuccessRate}% < ${this.targets.kycSuccessRate}%)`,
        threshold: this.targets.kycSuccessRate,
        currentValue: metrics.kycSuccessRate,
        timestamp: new Date(),
      });
    }

    // Check consultation completion rate
    if (
      metrics.consultationCompletionRate <
      this.targets.consultationCompletionRate
    ) {
      alerts.push({
        id: 'consultation-completion-rate',
        type: 'warning',
        metric: 'Consultation Completion Rate',
        message: `อัตราการให้คำปรึกษาสำเร็จต่ำกว่าเป้าหมาย (${metrics.consultationCompletionRate}% < ${this.targets.consultationCompletionRate}%)`,
        threshold: this.targets.consultationCompletionRate,
        currentValue: metrics.consultationCompletionRate,
        timestamp: new Date(),
      });
    }

    // Check referral rate
    if (metrics.referralRate > this.targets.referralRateThreshold) {
      alerts.push({
        id: 'referral-rate',
        type: 'critical',
        metric: 'Referral Rate',
        message: `อัตราการส่งตัวสูงกว่าเกณฑ์ (${metrics.referralRate}% > ${this.targets.referralRateThreshold}%)`,
        threshold: this.targets.referralRateThreshold,
        currentValue: metrics.referralRate,
        timestamp: new Date(),
      });
    }

    // Check license compliance
    if (metrics.licenseComplianceRate < this.targets.licenseComplianceRate) {
      alerts.push({
        id: 'license-compliance',
        type: 'critical',
        metric: 'License Compliance Rate',
        message: `อัตราการปฏิบัติตามใบอนุญาตต่ำกว่าเป้าหมาย (${metrics.licenseComplianceRate}% < ${this.targets.licenseComplianceRate}%)`,
        threshold: this.targets.licenseComplianceRate,
        currentValue: metrics.licenseComplianceRate,
        timestamp: new Date(),
      });
    }

    // Check audit trail integrity
    if (metrics.auditTrailIntegrity < this.targets.auditTrailIntegrity) {
      alerts.push({
        id: 'audit-trail-integrity',
        type: 'critical',
        metric: 'Audit Trail Integrity',
        message: `ความสมบูรณ์ของ Audit Trail มีปัญหา (${metrics.auditTrailIntegrity}%)`,
        threshold: this.targets.auditTrailIntegrity,
        currentValue: metrics.auditTrailIntegrity,
        timestamp: new Date(),
      });
    }

    // Check data residency
    if (!metrics.dataResidencyCompliant) {
      alerts.push({
        id: 'data-residency',
        type: 'critical',
        metric: 'Data Residency',
        message: 'ข้อมูลไม่ได้เก็บในประเทศไทย',
        threshold: 100,
        currentValue: 0,
        timestamp: new Date(),
      });
    }

    return alerts;
  }

  /**
   * Generate weekly compliance summary report
   */
  async generateWeeklyReport(): Promise<{
    period: { start: Date; end: Date };
    metrics: ComplianceMetrics;
    qualityMetrics: QualityMetrics;
    alerts: Alert[];
    summary: string;
  }> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);

    const metrics = await this.getDashboardMetrics(start, end);
    const qualityMetrics = await this.getQualityMetrics(start, end);
    const alerts = await this.getActiveAlerts();

    // Generate summary
    const summary = this.generateSummaryText(metrics, alerts);

    return {
      period: { start, end },
      metrics,
      qualityMetrics,
      alerts,
      summary,
    };
  }

  /**
   * Get compliance scorecard
   */
  async getComplianceScorecard(): Promise<{
    overallScore: number;
    scores: {
      kyc: number;
      consultation: number;
      referral: number;
      license: number;
      audit: number;
      dataResidency: number;
    };
    grade: string;
  }> {
    const metrics = await this.getDashboardMetrics();

    const scores = {
      kyc: (metrics.kycSuccessRate / this.targets.kycSuccessRate) * 100,
      consultation:
        (metrics.consultationCompletionRate /
          this.targets.consultationCompletionRate) *
        100,
      referral:
        metrics.referralRate <= this.targets.referralRateThreshold ? 100 : 50,
      license:
        (metrics.licenseComplianceRate / this.targets.licenseComplianceRate) *
        100,
      audit:
        (metrics.auditTrailIntegrity / this.targets.auditTrailIntegrity) * 100,
      dataResidency: metrics.dataResidencyCompliant ? 100 : 0,
    };

    const overallScore =
      (scores.kyc +
        scores.consultation +
        scores.referral +
        scores.license +
        scores.audit +
        scores.dataResidency) /
      6;

    const grade = this.calculateGrade(overallScore);

    return {
      overallScore: Math.round(overallScore),
      scores: {
        kyc: Math.round(scores.kyc),
        consultation: Math.round(scores.consultation),
        referral: Math.round(scores.referral),
        license: Math.round(scores.license),
        audit: Math.round(scores.audit),
        dataResidency: Math.round(scores.dataResidency),
      },
      grade,
    };
  }

  // Private helper methods

  private async calculateKycSuccessRate(
    start: Date,
    end: Date,
  ): Promise<number> {
    const total = await this.db
      .select({ count: count() })
      .from(kycVerifications)
      .where(
        and(
          gte(kycVerifications.createdAt, start),
          lte(kycVerifications.createdAt, end),
        ),
      );

    const completed = await this.db
      .select({ count: count() })
      .from(kycVerifications)
      .where(
        and(
          eq(kycVerifications.status, 'completed'),
          gte(kycVerifications.createdAt, start),
          lte(kycVerifications.createdAt, end),
        ),
      );

    if (total[0].count === 0) return 100;
    return (completed[0].count / total[0].count) * 100;
  }

  private async calculateConsultationCompletionRate(
    start: Date,
    end: Date,
  ): Promise<number> {
    const total = await this.db
      .select({ count: count() })
      .from(videoConsultations)
      .where(
        and(
          gte(videoConsultations.createdAt, start),
          lte(videoConsultations.createdAt, end),
        ),
      );

    const completed = await this.db
      .select({ count: count() })
      .from(videoConsultations)
      .where(
        and(
          eq(videoConsultations.status, 'completed'),
          gte(videoConsultations.createdAt, start),
          lte(videoConsultations.createdAt, end),
        ),
      );

    if (total[0].count === 0) return 100;
    return (completed[0].count / total[0].count) * 100;
  }

  private async calculateReferralRate(start: Date, end: Date): Promise<number> {
    const totalConsultations = await this.db
      .select({ count: count() })
      .from(videoConsultations)
      .where(
        and(
          gte(videoConsultations.createdAt, start),
          lte(videoConsultations.createdAt, end),
        ),
      );

    const referrals = await this.db
      .select({ count: count() })
      .from(emergencyReferrals)
      .where(
        and(
          gte(emergencyReferrals.createdAt, start),
          lte(emergencyReferrals.createdAt, end),
        ),
      );

    if (totalConsultations[0].count === 0) return 0;
    return (referrals[0].count / totalConsultations[0].count) * 100;
  }

  private async calculateAvgConsultationDuration(
    start: Date,
    end: Date,
  ): Promise<number> {
    const consultations = await this.db
      .select()
      .from(videoConsultations)
      .where(
        and(
          eq(videoConsultations.status, 'completed'),
          gte(videoConsultations.startedAt, start),
          lte(videoConsultations.endedAt, end),
        ),
      );

    if (consultations.length === 0) return 0;

    const totalDuration = consultations.reduce(
      (sum: number, c: any) => sum + (c.durationSeconds || 0),
      0,
    );

    return Math.round(totalDuration / consultations.length / 60); // Convert to minutes
  }

  private async calculateConsentAcceptanceRate(
    start: Date,
    end: Date,
  ): Promise<number> {
    const total = await this.db
      .select({ count: count() })
      .from(patientConsents)
      .where(
        and(
          gte(patientConsents.createdAt, start),
          lte(patientConsents.createdAt, end),
        ),
      );

    const accepted = await this.db
      .select({ count: count() })
      .from(patientConsents)
      .where(
        and(
          eq(patientConsents.accepted, true),
          gte(patientConsents.createdAt, start),
          lte(patientConsents.createdAt, end),
        ),
      );

    if (total[0].count === 0) return 100;
    return (accepted[0].count / total[0].count) * 100;
  }

  private async calculateLicenseComplianceRate(): Promise<number> {
    // Get all latest verifications per pharmacist
    const allVerifications = await this.db
      .select()
      .from(pharmacistLicenseVerifications);

    if (allVerifications.length === 0) return 100;

    // Group by pharmacist (get latest for each)
    const latestByPharmacist = new Map();
    for (const v of allVerifications) {
      if (!latestByPharmacist.has(v.pharmacistId)) {
        latestByPharmacist.set(v.pharmacistId, v);
      }
    }

    const latest = Array.from(latestByPharmacist.values());
    const now = new Date();

    const compliant = latest.filter(
      (v) =>
        v.verificationStatus === 'verified' && new Date(v.expiryDate) > now,
    ).length;

    return (compliant / latest.length) * 100;
  }

  private async verifyAuditTrailIntegrity(): Promise<number> {
    // TODO: Implement actual hash chain verification
    // For now, return 100%
    return 100;
  }

  private async verifyDataResidency(): Promise<boolean> {
    // TODO: Implement actual data residency check
    // For now, return true
    return true;
  }

  private getDefaultStartDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Last 30 days
    return date;
  }

  private getMostCommon(arr: string[]): string {
    const counts = arr.reduce(
      (acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.keys(counts).reduce((a, b) =>
      (counts[a] || 0) > (counts[b] || 0) ? a : b,
    );
  }

  private generateSummaryText(
    metrics: ComplianceMetrics,
    alerts: Alert[],
  ): string {
    const parts = [];

    parts.push(
      `อัตราความสำเร็จของ KYC: ${metrics.kycSuccessRate.toFixed(1)}%`,
    );
    parts.push(
      `อัตราการให้คำปรึกษาสำเร็จ: ${metrics.consultationCompletionRate.toFixed(1)}%`,
    );
    parts.push(`อัตราการส่งตัว: ${metrics.referralRate.toFixed(1)}%`);
    parts.push(
      `ระยะเวลาเฉลี่ยของการให้คำปรึกษา: ${metrics.avgConsultationDuration} นาที`,
    );

    if (alerts.length > 0) {
      parts.push(`\n⚠️ มี ${alerts.length} การแจ้งเตือน`);
    } else {
      parts.push('\n✅ ไม่มีการแจ้งเตือน');
    }

    return parts.join('\n');
  }

  private calculateGrade(score: number): string {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 65) return 'D+';
    if (score >= 60) return 'D';
    return 'F';
  }
}
