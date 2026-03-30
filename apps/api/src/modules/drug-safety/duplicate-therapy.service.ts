import { Injectable, Inject, Logger } from '@nestjs/common';
import { inArray } from 'drizzle-orm';
import { drugs } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import type { DrugToCheck, PatientSafetyContext, DuplicateTherapyResult } from './drug-safety.types';

@Injectable()
export class DuplicateTherapyService {
  private readonly logger = new Logger(DuplicateTherapyService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async checkDuplicateTherapy(
    drugsToCheck: DrugToCheck[],
    patient: PatientSafetyContext,
  ): Promise<DuplicateTherapyResult[]> {
    const results: DuplicateTherapyResult[] = [];

    const allDrugs = [
      ...drugsToCheck,
      ...patient.currentMedications.map((m) => ({
        name: m.drugName,
        genericName: m.genericName,
        atcCode: m.atcCode,
      })),
    ];

    if (allDrugs.length < 2) return [];

    const atcMap = await this.buildAtcMap(allDrugs);

    const byAtcClass = new Map<string, string[]>();
    for (const [drugName, atcCode] of atcMap.entries()) {
      if (!atcCode) continue;
      const atcClass = atcCode.substring(0, 5);
      const existing = byAtcClass.get(atcClass) ?? [];
      existing.push(drugName);
      byAtcClass.set(atcClass, existing);
    }

    for (const [atcClass, drugNames] of byAtcClass.entries()) {
      if (drugNames.length < 2) continue;

      const newDrugNames = drugsToCheck.map((d) => d.name.toLowerCase());
      const hasDuplicate = drugNames.some((n) => newDrugNames.includes(n.toLowerCase()));
      if (!hasDuplicate) continue;

      for (let i = 0; i < drugNames.length; i++) {
        for (let j = i + 1; j < drugNames.length; j++) {
          results.push({
            type: 'duplicate_therapy',
            drugA: drugNames[i]!,
            drugB: drugNames[j]!,
            atcClass,
            message: `⚠️ Duplicate therapy: ${drugNames[i]} และ ${drugNames[j]} อยู่ในกลุ่มยาเดียวกัน (ATC ${atcClass})`,
          });
        }
      }
    }

    return results;
  }

  private async buildAtcMap(drugsToCheck: Array<{ name: string; genericName?: string; atcCode?: string }>): Promise<Map<string, string | null>> {
    const map = new Map<string, string | null>();

    const withAtc = drugsToCheck.filter((d) => d.atcCode);
    for (const d of withAtc) {
      map.set(d.name, d.atcCode!);
    }

    const withoutAtc = drugsToCheck.filter((d) => !d.atcCode);
    if (withoutAtc.length === 0) return map;

    try {
      const allDrugRows = await this.db.select({ genericName: drugs.genericName, atcCode: drugs.atcCode }).from(drugs);

      for (const d of withoutAtc) {
        const nameLower = d.name.toLowerCase();
        const genericLower = d.genericName?.toLowerCase();

        const match = allDrugRows.find(
          (r: any) =>
            r.genericName.toLowerCase() === nameLower ||
            r.genericName.toLowerCase() === genericLower ||
            nameLower.includes(r.genericName.toLowerCase()) ||
            r.genericName.toLowerCase().includes(nameLower),
        );

        map.set(d.name, match?.atcCode ?? null);
      }
    } catch (err) {
      this.logger.warn(`ATC map build failed: ${(err as Error).message}`);
    }

    return map;
  }
}
