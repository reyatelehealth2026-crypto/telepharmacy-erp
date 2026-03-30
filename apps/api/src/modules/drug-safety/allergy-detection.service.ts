import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { drugAllergyGroups } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import type { DrugToCheck, PatientSafetyContext, AllergyCheckResult } from './drug-safety.types';

@Injectable()
export class AllergyDetectionService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async checkAllergies(
    drugsToCheck: DrugToCheck[],
    patient: PatientSafetyContext,
  ): Promise<AllergyCheckResult[]> {
    if (patient.allergies.length === 0) return [];

    const alerts: AllergyCheckResult[] = [];
    const allergyGroupMap = await this.loadAllergyGroupMap();

    for (const drug of drugsToCheck) {
      const drugLower = drug.name.toLowerCase();
      const genericLower = drug.genericName?.toLowerCase();

      for (const allergy of patient.allergies) {
        const allergyLower = allergy.drugName.toLowerCase();
        const allergyGenerics = (allergy.genericNames ?? []).map((n) => n.toLowerCase());

        const isDirectMatch =
          drugLower.includes(allergyLower) ||
          allergyLower.includes(drugLower) ||
          (genericLower !== undefined && allergyGenerics.includes(genericLower));

        if (isDirectMatch) {
          alerts.push({
            type: 'allergy',
            drugName: drug.name,
            allergyDrug: allergy.drugName,
            allergyGroup: allergy.allergyGroup,
            severity: allergy.severity,
            isCrossAllergy: false,
            message: `⚠️ คนไข้แพ้ ${allergy.drugName} — ห้ามจ่าย ${drug.name}`,
          });
          continue;
        }

        const crossAlert = this.checkCrossAllergy(drug, allergy, allergyGroupMap);
        if (crossAlert) alerts.push(crossAlert);
      }
    }

    return alerts;
  }

  private checkCrossAllergy(
    drug: DrugToCheck,
    allergy: PatientSafetyContext['allergies'][number],
    groupMap: Map<string, string[]>,
  ): AllergyCheckResult | null {
    const group = allergy.allergyGroup?.toLowerCase();
    if (!group) return null;

    const groupDrugs = groupMap.get(group);
    if (!groupDrugs) return null;

    const drugLower = drug.name.toLowerCase();
    const genericLower = drug.genericName?.toLowerCase();

    const isCross = groupDrugs.some(
      (d) =>
        drugLower.includes(d) ||
        d.includes(drugLower) ||
        (genericLower !== undefined && (genericLower.includes(d) || d.includes(genericLower))),
    );

    if (!isCross) return null;

    return {
      type: 'allergy',
      drugName: drug.name,
      allergyDrug: allergy.drugName,
      allergyGroup: allergy.allergyGroup,
      severity: allergy.severity,
      isCrossAllergy: true,
      message: `⚠️ คนไข้แพ้ ${allergy.drugName} (กลุ่ม ${allergy.allergyGroup}) — ${drug.name} อาจมี cross-allergy`,
    };
  }

  private async loadAllergyGroupMap(): Promise<Map<string, string[]>> {
    const groups = await this.db.select().from(drugAllergyGroups);
    const map = new Map<string, string[]>();
    for (const g of groups) {
      map.set(g.groupName.toLowerCase(), (g.genericNames ?? []).map((n: string) => n.toLowerCase()));
    }
    return map;
  }
}
