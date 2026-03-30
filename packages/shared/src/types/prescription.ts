import type { RxStatus, RxPriority, RxSource, AllergySeverity } from "./enums";

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  drugName: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  quantity: number;
  sig: string;
  duration?: string;
  matchedProductId?: string;
  matchConfidence?: number;
  status: "pending" | "approved" | "rejected" | "substituted";
  rejectionReason?: string;
  substitutedProductId?: string;
}

export interface SafetyCheck {
  id: string;
  prescriptionId: string;
  checkType:
    | "drug_allergy"
    | "drug_interaction"
    | "duplicate_therapy"
    | "dose_range"
    | "contraindication"
    | "pregnancy"
    | "renal_adjustment";
  result: "pass" | "warning" | "critical";
  severity: AllergySeverity;
  description: string;
  recommendation?: string;
  drugNames: string[];
  overriddenBy?: string;
  overriddenAt?: string;
}

export interface PharmacistIntervention {
  id: string;
  prescriptionId: string;
  pharmacistId: string;
  pharmacistName: string;
  interventionType:
    | "dose_adjustment"
    | "drug_substitution"
    | "therapy_change"
    | "patient_education"
    | "prescriber_contact"
    | "refusal";
  description: string;
  outcome?: string;
  createdAt: string;
}

export interface Prescription {
  id: string;
  rxNo: string;
  patientId: string;
  prescriberName?: string;
  prescriberLicense?: string;
  hospitalName?: string;
  source: RxSource;
  status: RxStatus;
  priority: RxPriority;
  images: string[];
  ocrResult?: Record<string, unknown>;
  aiConfidence?: number;
  items: PrescriptionItem[];
  safetyChecks: SafetyCheck[];
  interventions: PharmacistIntervention[];
  pharmacistId?: string;
  pharmacistNotes?: string;
  verifiedAt?: string;
  dispensedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrescriptionInput {
  patientId: string;
  source: RxSource;
  priority?: RxPriority;
  prescriberName?: string;
  prescriberLicense?: string;
  hospitalName?: string;
  images: string[];
  notes?: string;
}

export interface VerifyPrescriptionItemInput {
  itemId: string;
  decision: "approved" | "rejected" | "substituted";
  rejectionReason?: string;
  substitutedProductId?: string;
  adjustedQuantity?: number;
  adjustedSig?: string;
}

export interface VerifyPrescriptionInput {
  decision: "approved" | "partial" | "rejected" | "referred";
  items: VerifyPrescriptionItemInput[];
  pharmacistNotes?: string;
  overrideSafetyCheckIds?: string[];
}
