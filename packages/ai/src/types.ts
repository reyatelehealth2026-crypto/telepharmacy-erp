export interface PatientContext {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  weight?: number;
  allergies: Array<{
    drugName: string;
    genericNames?: string[];
    allergyGroup?: string;
    severity: string;
    symptoms?: string;
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
    sig: string;
  }>;
  isPregnant?: boolean;
  isBreastfeeding?: boolean;
}

export interface PrescriptionOcrResult {
  prescriber: {
    name: string;
    licenseNo?: string;
    hospital?: string;
    department?: string;
  };
  patient: {
    name: string;
    age?: string;
  };
  items: Array<{
    drugName: string;
    strength?: string;
    dosageForm?: string;
    quantity: string;
    sig: string;
    duration?: string;
  }>;
  diagnosis?: string;
  rxDate?: string;
  confidence: number;
  rawText?: string;
}

export interface SlipOcrResult {
  amount: number;
  date: string;
  time: string;
  senderName?: string;
  receiverName?: string;
  bankName?: string;
  referenceNo?: string;
  confidence: number;
}

export interface DrugInteraction {
  drugA: string;
  drugB: string;
  severity: 'contraindicated' | 'major' | 'moderate' | 'minor';
  mechanism: string;
  clinicalEffect: string;
  management: string;
  evidenceLevel?: string;
}

export interface AllergyAlert {
  drugName: string;
  allergyDrug: string;
  allergyGroup?: string;
  severity: string;
  isCrossAllergy: boolean;
  message: string;
}

export interface DoseCheckResult {
  drugName: string;
  prescribedDose: string;
  recommendedRange: {
    min: string;
    max: string;
    maxDaily: string;
  };
  isWithinRange: boolean;
  adjustedForWeight?: boolean;
  warnings: string[];
  verdict: 'within_range' | 'below_range' | 'above_range' | 'requires_adjustment';
}

export interface SafetyCheckResult {
  hasIssues: boolean;
  interactions: DrugInteraction[];
  allergyAlerts: AllergyAlert[];
  doseChecks: DoseCheckResult[];
  contraindications: Array<{
    drugName: string;
    diseaseName: string;
    severity: string;
    reason: string;
    alternative?: string;
  }>;
  pregnancyWarnings: Array<{
    drugName: string;
    category: string;
    warning: string;
  }>;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  message: string;
  products?: Array<{
    id: string;
    name: string;
    price: number;
    reason: string;
  }>;
  shouldTransfer: boolean;
  transferReason?: string;
  disclaimer?: string;
}

export interface SymptomSearchResult {
  understanding: {
    symptoms: string[];
    possibleCondition: string;
    confidence: number;
  };
  recommendations: Array<{
    productName: string;
    reason: string;
    priority: 'recommended' | 'alternative' | 'optional';
  }>;
  safetyAlerts: string[];
  disclaimer: string;
}
