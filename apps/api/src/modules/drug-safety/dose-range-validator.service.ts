import { Injectable, Inject, Logger } from '@nestjs/common';
import { drugs } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import type { DrugToCheck, PatientSafetyContext, DoseCheckResult } from './drug-safety.types';

@Injectable()
export class DoseRangeValidatorService {
  private readonly logger = new Logger(DoseRangeValidatorService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async checkDoses(
    drugsToCheck: DrugToCheck[],
    patient: PatientSafetyContext,
  ): Promise<DoseCheckResult[]> {
    const results: DoseCheckResult[] = [];

    for (const drug of drugsToCheck) {
      if (!drug.strength) continue;

      const doseResult = await this.validateDose(drug, patient);
      if (doseResult) results.push(doseResult);
    }

    return results;
  }

  private async validateDose(
    drug: DrugToCheck,
    patient: PatientSafetyContext,
  ): Promise<DoseCheckResult | null> {
    try {
      const drugRecord = await this.findDrugWithStrengths(drug.name, drug.genericName);
      if (!drugRecord?.availableStrengths) return null;

      const strengths = drugRecord.availableStrengths as Array<{ value: number; unit: string }>;
      if (strengths.length === 0) return null;

      const prescribedValue = this.parseStrengthValue(drug.strength ?? '');
      if (prescribedValue === null) return null;

      const warnings: string[] = [];

      if (patient.age < 18 && !drugRecord.pediatricSafe) {
        warnings.push(`⚠️ ไม่แนะนำในเด็กอายุ < 18 ปี`);
      }

      if (patient.age >= 65 && !drugRecord.geriatricSafe) {
        warnings.push(`⚠️ ใช้ด้วยความระมัดระวังในผู้สูงอายุ`);
      }

      if (patient.isPregnant && drugRecord.pregnancyCategory) {
        const cat = drugRecord.pregnancyCategory.toUpperCase();
        if (cat === 'D' || cat === 'X') {
          warnings.push(`⚠️ ยา Pregnancy Category ${cat} — ห้ามใช้ขณะตั้งครรภ์`);
        } else if (cat === 'C') {
          warnings.push(`ℹ️ ยา Pregnancy Category C — ใช้เมื่อประโยชน์มากกว่าความเสี่ยง`);
        }
      }

      if (patient.isBreastfeeding && drugRecord.breastfeedingSafe === false) {
        warnings.push(`⚠️ ไม่แนะนำขณะให้นมบุตร`);
      }

      const maxStrength = Math.max(...strengths.map((s) => s.value));
      const minStrength = Math.min(...strengths.map((s) => s.value));

      let verdict: DoseCheckResult['verdict'] = 'within_range';
      if (prescribedValue > maxStrength * 1.5) {
        verdict = 'above_range';
        warnings.push(`⚠️ ขนาดยาที่สั่ง (${prescribedValue}) สูงกว่าขนาดสูงสุดที่มีจำหน่าย (${maxStrength})`);
      } else if (prescribedValue < minStrength * 0.5) {
        verdict = 'below_range';
        warnings.push(`ℹ️ ขนาดยาที่สั่ง (${prescribedValue}) ต่ำกว่าขนาดต่ำสุดที่มีจำหน่าย (${minStrength})`);
      }

      if (warnings.length === 0 && verdict === 'within_range') return null;

      return {
        type: 'dose',
        drugName: drug.name,
        prescribedDose: drug.strength ?? '',
        verdict,
        warnings,
      };
    } catch (err) {
      this.logger.warn(`Dose validation failed for ${drug.name}: ${(err as Error).message}`);
      return null;
    }
  }

  private parseStrengthValue(strength: string): number | null {
    const match = strength.match(/^(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]!) : null;
  }

  private async findDrugWithStrengths(name: string, genericName?: string) {
    const nameLower = name.toLowerCase();
    const rows = await this.db
      .select({
        id: drugs.id,
        genericName: drugs.genericName,
        availableStrengths: drugs.availableStrengths,
        pregnancyCategory: drugs.pregnancyCategory,
        breastfeedingSafe: drugs.breastfeedingSafe,
        pediatricSafe: drugs.pediatricSafe,
        geriatricSafe: drugs.geriatricSafe,
      })
      .from(drugs);

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
}
