import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc, ilike } from 'drizzle-orm';
import { medicationReviewRequests, tdmRequests, patientMedications, drugs } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import type { CreateMedicationReviewDto, CompleteMedicationReviewDto } from './dto/create-drug-info.dto';
import type { CreateTdmRequestDto, RecordTdmResultDto } from './dto/medication-review.dto';

@Injectable()
export class DrugInfoService {
  private readonly logger = new Logger(DrugInfoService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async lookupDrug(query: string) {
    if (!query || query.trim().length === 0) return { data: [] };

    const results = await this.db
      .select()
      .from(drugs)
      .where(ilike(drugs.genericName, `%${query}%`))
      .limit(20);

    return { data: results };
  }

  async createMedicationReview(dto: CreateMedicationReviewDto, requestedBy: string) {
    const [request] = await this.db
      .insert(medicationReviewRequests)
      .values({
        patientId: dto.patientId,
        reason: dto.reason ?? null,
        requestedBy,
        status: 'pending',
      })
      .returning();

    this.logger.log(`Medication review request created: ${request.id}`);
    return request;
  }

  async findMedicationReviews(filters: {
    patientId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (filters.patientId) conditions.push(eq(medicationReviewRequests.patientId, filters.patientId));
    if (filters.status) conditions.push(eq(medicationReviewRequests.status, filters.status as any));

    const query = this.db
      .select()
      .from(medicationReviewRequests)
      .orderBy(desc(medicationReviewRequests.createdAt))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) query.where(and(...conditions));

    const rows = await query;
    return { data: rows, page, limit };
  }

  async completeMedicationReview(id: string, dto: CompleteMedicationReviewDto, pharmacistId: string) {
    const [existing] = await this.db
      .select()
      .from(medicationReviewRequests)
      .where(eq(medicationReviewRequests.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException(`ไม่พบคำขอ medication review รหัส ${id}`);

    const [updated] = await this.db
      .update(medicationReviewRequests)
      .set({
        status: 'completed',
        pharmacistId,
        reviewNote: dto.reviewNote,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(medicationReviewRequests.id, id))
      .returning();

    return updated;
  }

  async createTdmRequest(dto: CreateTdmRequestDto, requestedBy: string) {
    const [request] = await this.db
      .insert(tdmRequests)
      .values({
        patientId: dto.patientId,
        drugName: dto.drugName,
        indication: dto.indication ?? null,
        currentDose: dto.currentDose ?? null,
        requestedBy,
        status: 'pending',
      })
      .returning();

    this.logger.log(`TDM request created: ${request.id}`);
    return request;
  }

  async findTdmRequests(filters: {
    patientId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (filters.patientId) conditions.push(eq(tdmRequests.patientId, filters.patientId));
    if (filters.status) conditions.push(eq(tdmRequests.status, filters.status as any));

    const query = this.db
      .select()
      .from(tdmRequests)
      .orderBy(desc(tdmRequests.createdAt))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) query.where(and(...conditions));

    const rows = await query;
    return { data: rows, page, limit };
  }

  async recordTdmResult(id: string, dto: RecordTdmResultDto, pharmacistId: string) {
    const [existing] = await this.db
      .select()
      .from(tdmRequests)
      .where(eq(tdmRequests.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException(`ไม่พบคำขอ TDM รหัส ${id}`);

    const [updated] = await this.db
      .update(tdmRequests)
      .set({
        status: 'result_available',
        pharmacistId,
        result: dto.result,
        interpretation: dto.interpretation,
        recommendation: dto.recommendation ?? null,
        resultRecordedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tdmRequests.id, id))
      .returning();

    return updated;
  }
}
