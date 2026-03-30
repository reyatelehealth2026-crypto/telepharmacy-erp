import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { or, and, eq } from 'drizzle-orm';
import { drugs, drugInteractions } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import type { DrugToCheck, DdiCheckResult } from './drug-safety.types';

@Injectable()
export class DrugInteractionService {
  private readonly logger = new Logger(DrugInteractionService.name);
  private readonly cache = new Map<string, { result: DdiCheckResult[]; expiresAt: number }>();
  private readonly cacheTtlMs = 60 * 60 * 1000;

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async checkInteractions(drugsToCheck: DrugToCheck[]): Promise<DdiCheckResult[]> {
    if (drugsToCheck.length < 2) return [];

    const results: DdiCheckResult[] = [];

    for (let i = 0; i < drugsToCheck.length; i++) {
      for (let j = i + 1; j < drugsToCheck.length; j++) {
        const drugA = drugsToCheck[i]!;
        const drugB = drugsToCheck[j]!;
        const cacheKey = this.cacheKey(drugA.name, drugB.name);

        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          results.push(...cached.result);
          continue;
        }

        const interactions = await this.queryInteractions(drugA, drugB);
        this.cache.set(cacheKey, { result: interactions, expiresAt: Date.now() + this.cacheTtlMs });
        results.push(...interactions);
      }
    }

    return results;
  }

  private async queryInteractions(drugA: DrugToCheck, drugB: DrugToCheck): Promise<DdiCheckResult[]> {
    try {
      const drugARecord = await this.findDrugByName(drugA.name, drugA.genericName);
      const drugBRecord = await this.findDrugByName(drugB.name, drugB.genericName);

      if (!drugARecord || !drugBRecord) return [];

      const rows = await this.db
        .select({
          severity: drugInteractions.severity,
          mechanism: drugInteractions.mechanism,
          clinicalEffect: drugInteractions.clinicalEffect,
          management: drugInteractions.management,
          evidenceLevel: drugInteractions.evidenceLevel,
          drugAName: drugs.genericName,
        })
        .from(drugInteractions)
        .innerJoin(drugs, eq(drugInteractions.drugAId, drugs.id))
        .where(
          or(
            and(
              eq(drugInteractions.drugAId, drugARecord.id),
              eq(drugInteractions.drugBId, drugBRecord.id),
            ),
            and(
              eq(drugInteractions.drugAId, drugBRecord.id),
              eq(drugInteractions.drugBId, drugARecord.id),
            ),
          ),
        );

      return rows.map((row: any) => ({
        type: 'ddi' as const,
        drugA: drugA.name,
        drugB: drugB.name,
        severity: row.severity ?? 'moderate',
        mechanism: row.mechanism ?? '',
        clinicalEffect: row.clinicalEffect ?? '',
        management: row.management ?? '',
        evidenceLevel: row.evidenceLevel ?? undefined,
        fromDatabase: true,
      }));
    } catch (err) {
      this.logger.warn(`DDI query failed for ${drugA.name}/${drugB.name}: ${(err as Error).message}`);
      return [];
    }
  }

  private async findDrugByName(name: string, genericName?: string) {
    const nameLower = name.toLowerCase();

    const rows = await this.db.select({ id: drugs.id, genericName: drugs.genericName }).from(drugs);

    return (
      rows.find(
        (r: any) =>
          r.genericName.toLowerCase() === nameLower ||
          r.genericName.toLowerCase() === genericName?.toLowerCase() ||
          nameLower.includes(r.genericName.toLowerCase()) ||
          r.genericName.toLowerCase().includes(nameLower),
      ) ?? null
    );
  }

  private cacheKey(a: string, b: string): string {
    const sorted = [a.toLowerCase(), b.toLowerCase()].sort();
    return `${sorted[0]}::${sorted[1]}`;
  }

  clearCache() {
    this.cache.clear();
  }
}
