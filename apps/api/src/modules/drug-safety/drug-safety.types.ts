export interface DrugToCheck {
  name: string;
  genericName?: string;
  strength?: string;
  atcCode?: string;
  quantity?: number;
  sig?: string;
}

export interface PatientSafetyContext {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  weight?: number;
  height?: number;
  isPregnant: boolean;
  isBreastfeeding: boolean;
  allergies: Array<{
    drugName: string;
    genericNames?: string[];
    allergyGroup?: string;
    severity: string;
  }>;
  chronicDiseases: Array<{
    diseaseName: string;
    icd10Code?: string;
    status: string;
  }>;
  currentMedications: Array<{
    drugName: string;
    genericName?: string;
    strength?: string;
    atcCode?: string;
    sig: string;
  }>;
}

export interface AllergyCheckResult {
  type: 'allergy';
  drugName: string;
  allergyDrug: string;
  allergyGroup?: string;
  severity: string;
  isCrossAllergy: boolean;
  message: string;
}

export interface DdiCheckResult {
  type: 'ddi';
  drugA: string;
  drugB: string;
  severity: 'contraindicated' | 'major' | 'moderate' | 'minor';
  mechanism: string;
  clinicalEffect: string;
  management: string;
  evidenceLevel?: string;
  fromDatabase: boolean;
}

export interface ContraindicationResult {
  type: 'contraindication';
  drugName: string;
  diseaseName: string;
  severity: string;
  reason: string;
  alternative?: string;
}

export interface DuplicateTherapyResult {
  type: 'duplicate_therapy';
  drugA: string;
  drugB: string;
  atcClass: string;
  message: string;
}

export interface DoseCheckResult {
  type: 'dose';
  drugName: string;
  prescribedDose: string;
  verdict: 'within_range' | 'above_range' | 'below_range' | 'cannot_determine';
  warnings: string[];
}

export type SafetyIssue =
  | AllergyCheckResult
  | DdiCheckResult
  | ContraindicationResult
  | DuplicateTherapyResult
  | DoseCheckResult;

export interface SafetyCheckSummary {
  hasIssues: boolean;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  issues: SafetyIssue[];
  allergyAlerts: AllergyCheckResult[];
  ddiAlerts: DdiCheckResult[];
  contraindications: ContraindicationResult[];
  duplicateTherapy: DuplicateTherapyResult[];
  doseWarnings: DoseCheckResult[];
  summary: string;
}
