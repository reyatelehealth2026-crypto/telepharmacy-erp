import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { AI_CONFIG, DRUG_SAFETY_PROMPT } from './config';
import type { PatientContext, SafetyCheckResult, DrugInteraction, AllergyAlert } from './types';

interface DrugToCheck {
  name: string;
  genericName?: string;
  strength?: string;
  quantity?: number;
  sig?: string;
}

export async function checkDrugSafety(
  drugs: DrugToCheck[],
  patient: PatientContext
): Promise<SafetyCheckResult> {
  const drugList = drugs
    .map(
      (d, i) =>
        `${i + 1}. ${d.name}${d.genericName ? ` (${d.genericName})` : ''} ${d.strength || ''} ${d.sig || ''}`
    )
    .join('\n');

  const patientInfo = [
    `ชื่อ: ${patient.firstName} ${patient.lastName}`,
    `อายุ: ${patient.age} ปี, เพศ: ${patient.gender}`,
    patient.weight ? `น้ำหนัก: ${patient.weight} kg` : '',
    patient.allergies.length > 0
      ? `แพ้ยา: ${patient.allergies.map((a) => `${a.drugName} [${a.allergyGroup || ''}] (${a.severity})`).join(', ')}`
      : 'ไม่มีประวัติแพ้ยา',
    patient.chronicDiseases.length > 0
      ? `โรคประจำตัว: ${patient.chronicDiseases.map((d) => `${d.diseaseName} (${d.icd10Code || ''})`).join(', ')}`
      : 'ไม่มีโรคประจำตัว',
    patient.currentMedications.length > 0
      ? `ยาที่กินอยู่: ${patient.currentMedications.map((m) => `${m.drugName} ${m.strength || ''} ${m.sig}`).join(', ')}`
      : 'ไม่มียาที่กินอยู่',
    patient.isPregnant ? '⚠️ กำลังตั้งครรภ์' : '',
    patient.isBreastfeeding ? '⚠️ กำลังให้นมบุตร' : '',
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = `ข้อมูลคนไข้:
${patientInfo}

รายการยาที่ต้องตรวจสอบ:
${drugList}

ตรวจสอบ:
1. Drug-Drug Interactions (ระหว่างยาที่สั่งใหม่ + ยาที่กินอยู่)
2. Drug-Allergy (ยาที่สั่ง vs ประวัติแพ้ยา รวม cross-allergy)
3. Drug-Disease Contraindications (ยา vs โรคประจำตัว)
4. Pregnancy/Breastfeeding warnings (ถ้ามี)
5. Dose appropriateness (ถ้ามีข้อมูลเพียงพอ)`;

  const { text } = await generateText({
    model: google(AI_CONFIG.defaultModel),
    system: DRUG_SAFETY_PROMPT,
    prompt,
    temperature: 0.1,
    maxTokens: 4096,
  });

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      hasIssues: false,
      interactions: [],
      allergyAlerts: [],
      doseChecks: [],
      contraindications: [],
      pregnancyWarnings: [],
      overallRisk: 'low',
      summary: 'ไม่สามารถตรวจสอบได้ กรุณาให้เภสัชกรตรวจสอบด้วยตนเอง',
    };
  }
}

export function checkLocalAllergyMatch(
  drugName: string,
  drugGenericName: string | undefined,
  patientAllergies: PatientContext['allergies']
): AllergyAlert[] {
  const alerts: AllergyAlert[] = [];
  const drugNameLower = drugName.toLowerCase();
  const genericLower = drugGenericName?.toLowerCase();

  const CROSS_ALLERGY_GROUPS: Record<string, string[]> = {
    'beta-lactam': [
      'penicillin', 'amoxicillin', 'ampicillin', 'piperacillin',
      'cephalexin', 'cefazolin', 'ceftriaxone', 'cefixime',
      'meropenem', 'imipenem',
    ],
    nsaid: [
      'aspirin', 'ibuprofen', 'naproxen', 'diclofenac',
      'piroxicam', 'meloxicam', 'celecoxib', 'indomethacin',
    ],
    sulfonamide: [
      'sulfamethoxazole', 'sulfasalazine', 'dapsone',
      'furosemide', 'hydrochlorothiazide', 'celecoxib',
    ],
  };

  for (const allergy of patientAllergies) {
    const allergyDrugLower = allergy.drugName.toLowerCase();
    const allergyGenerics = (allergy.genericNames || []).map((n) => n.toLowerCase());

    if (
      drugNameLower.includes(allergyDrugLower) ||
      allergyDrugLower.includes(drugNameLower) ||
      (genericLower && allergyGenerics.includes(genericLower))
    ) {
      alerts.push({
        drugName,
        allergyDrug: allergy.drugName,
        allergyGroup: allergy.allergyGroup,
        severity: allergy.severity,
        isCrossAllergy: false,
        message: `⚠️ คนไข้แพ้ ${allergy.drugName} — ห้ามจ่าย ${drugName}`,
      });
      continue;
    }

    const group = allergy.allergyGroup?.toLowerCase();
    if (group && CROSS_ALLERGY_GROUPS[group]) {
      const groupDrugs = CROSS_ALLERGY_GROUPS[group];
      if (
        groupDrugs.some(
          (d) => drugNameLower.includes(d) || (genericLower && genericLower.includes(d))
        )
      ) {
        alerts.push({
          drugName,
          allergyDrug: allergy.drugName,
          allergyGroup: allergy.allergyGroup,
          severity: allergy.severity,
          isCrossAllergy: true,
          message: `⚠️ คนไข้แพ้ ${allergy.drugName} (กลุ่ม ${allergy.allergyGroup}) — ${drugName} อาจมี cross-allergy`,
        });
      }
    }
  }

  return alerts;
}

export async function checkDrugInteractions(
  drugs: string[]
): Promise<DrugInteraction[]> {
  if (drugs.length < 2) return [];

  const prompt = `ตรวจสอบ drug-drug interactions ระหว่างยาต่อไปนี้:
${drugs.map((d, i) => `${i + 1}. ${d}`).join('\n')}

ตอบเป็น JSON array:
[
  {
    "drugA": "ชื่อยา A",
    "drugB": "ชื่อยา B",
    "severity": "contraindicated|major|moderate|minor",
    "mechanism": "กลไก",
    "clinicalEffect": "ผลทางคลินิก",
    "management": "วิธีจัดการ",
    "evidenceLevel": "established|probable|suspected"
  }
]

ถ้าไม่มี interaction ให้ตอบ []`;

  const { text } = await generateText({
    model: google(AI_CONFIG.defaultModel),
    prompt,
    temperature: 0.1,
    maxTokens: 2048,
  });

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}
