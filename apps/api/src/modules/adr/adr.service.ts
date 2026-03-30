import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { adrReports } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import type { CreateAdrDto } from './dto/create-adr.dto';
import type { UpdateAdrAssessmentDto } from './dto/update-adr.dto';

@Injectable()
export class AdrService {
  private readonly logger = new Logger(AdrService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async create(dto: CreateAdrDto, reportedBy: string) {
    const [report] = await this.db
      .insert(adrReports)
      .values({
        ...dto,
        onsetDate: dto.onsetDate ?? null,
        prescriptionId: dto.prescriptionId ?? null,
        drugCode: dto.drugCode ?? null,
        alternativeCauses: dto.alternativeCauses ?? null,
        reportedBy,
        status: 'draft',
      })
      .returning();
    this.logger.log(`ADR report created: ${report.id}`);
    return report;
  }

  async findAll(filters: {
    patientId?: string;
    drugName?: string;
    severity?: string;
    causality?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (filters.patientId) conditions.push(eq(adrReports.patientId, filters.patientId));
    if (filters.severity) conditions.push(eq(adrReports.severity, filters.severity as any));
    if (filters.causality) conditions.push(eq(adrReports.causalityAssessment, filters.causality as any));
    if (filters.status) conditions.push(eq(adrReports.status, filters.status as any));

    const query = this.db
      .select()
      .from(adrReports)
      .orderBy(desc(adrReports.reportedAt))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const rows = await query;
    return { data: rows, page, limit };
  }

  async findOne(id: string) {
    const [report] = await this.db
      .select()
      .from(adrReports)
      .where(eq(adrReports.id, id))
      .limit(1);

    if (!report) throw new NotFoundException(`ไม่พบรายงาน ADR รหัส ${id}`);
    return report;
  }

  async assess(id: string, dto: UpdateAdrAssessmentDto, staffId: string) {
    await this.findOne(id);

    const [updated] = await this.db
      .update(adrReports)
      .set({
        causalityAssessment: dto.causalityAssessment,
        causalityScore: dto.causalityScore ?? null,
        status: dto.status ?? 'reviewed',
        updatedAt: new Date(),
      })
      .where(eq(adrReports.id, id))
      .returning();

    this.logger.log(`ADR ${id} assessed by staff ${staffId}: ${dto.causalityAssessment}`);
    return updated;
  }

  async exportRegulatory(filters: { fromDate?: string; toDate?: string }) {
    const conditions: any[] = [eq(adrReports.status, 'submitted')];

    const rows = await this.db
      .select()
      .from(adrReports)
      .where(and(...conditions))
      .orderBy(desc(adrReports.reportedAt));

    await this.db
      .update(adrReports)
      .set({ regulatoryExportedAt: new Date() })
      .where(eq(adrReports.status, 'submitted'));

    return {
      exportedAt: new Date().toISOString(),
      reportingOrganization: 'Telepharmacy ERP',
      reportCount: rows.length,
      reports: rows.map((r: any) => ({
        reportId: r.id,
        patientId: r.patientId,
        drugName: r.drugName,
        drugCode: r.drugCode,
        reactionDescription: r.reactionDescription,
        severity: r.severity,
        onsetDate: r.onsetDate,
        outcome: r.outcome,
        causalityAssessment: r.causalityAssessment,
        rechallenge: r.rechallenge,
        dechallenge: r.dechallenge,
        isKnownReaction: r.isKnownReaction,
        reportedAt: r.reportedAt,
      })),
    };
  }
}
