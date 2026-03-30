import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { drugs, drugDiseaseContraindications } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import type { DrugToCheck, PatientSafetyContext, ContraindicationResult } from './drug-safety.types';

@Injectable()
export class ContraindicationCheckerService {
  private readonly logger = new Logger(ContraindicationCheckerService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async checkContraindications(
    drugsToCheck: DrugToCheck[],
    patient: PatientSafetyContext,
  ): Promise<ContraindicationResult[]> {
    if (patient.chronicDiseases.length === 0) return [];

    const results: ContraindicationResult[] = [];

    for (const drug of drugsToCheck) {
      const drugRecord = await this.findDrugByName(drug.name, drug.genericName);
      if (!drugRecord) continue;

      const contraindications = await this.db
        .select()
        .from(drugDiseaseContraindications)
        .where(eq(drugDiseaseContraindications.drugId, drugRecord.id));

      for (const ci of contraindications) {
        const matchedDisease = patient.chronicDiseases.find((d) => {
          const diseaseLower = d.diseaseName.toLowerCase();
          const ciDiseaseLower = ci.diseaseName.toLowerCase();

          if (diseaseLower.includes(ciDiseaseLower) || ciDiseaseLower.includes(diseaseLower)) {
            return true;
          }

          if (ci.icd10Pattern && d.icd10Code) {
            return this.matchIcd10Pattern(d.icd10Code, ci.icd10Pattern);
          }

          return false;
        });

        if (matchedDisease) {
          results.push({
            type: 'contraindication',
            drugName: drug.name,
            diseaseName: matchedDisease.diseaseName,
            severity: ci.severity ?? 'major',
            reason: ci.reason ?? '',
            alternative: ci.alternative ?? undefined,
          });
        }
      }
    }

    return results;
  }

  private matchIcd10Pattern(icd10Code: string, pattern: string): boolean {
    if (pattern.endsWith('%')) {
      return icd10Code.startsWith(pattern.slice(0, -1));
    }
    return icd10Code === pattern;
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
}
