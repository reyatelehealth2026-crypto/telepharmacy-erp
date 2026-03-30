import type {
  PatientStatus,
  PatientTitle,
  Gender,
  BloodType,
  InsuranceType,
  AllergySeverity,
  AllergyReactionType,
  AllergySource,
  ChronicDiseaseStatus,
  MembershipTier,
} from "./enums";
import type { Address } from "./common";

export interface Patient {
  id: string;
  patientNo: string;
  lineUserId?: string;
  title: PatientTitle;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  idCardNumber?: string;
  phone: string;
  email?: string;
  address?: Address;
  province?: string;
  bloodType?: BloodType;
  weight?: number;
  height?: number;
  insuranceType: InsuranceType;
  insurancePolicyNo?: string;
  status: PatientStatus;
  pdpaConsentedAt?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientAllergy {
  id: string;
  patientId: string;
  drugName: string;
  genericNames?: string[];
  allergyGroup?: string;
  reactionType: AllergyReactionType;
  severity: AllergySeverity;
  symptoms?: string[];
  source: AllergySource;
  notes?: string;
  reportedAt: string;
  createdAt: string;
}

export interface PatientChronicDisease {
  id: string;
  patientId: string;
  diseaseName: string;
  icd10Code?: string;
  status: ChronicDiseaseStatus;
  diagnosedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientMedication {
  id: string;
  patientId: string;
  drugName: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  sig: string;
  duration?: string;
  prescribedBy?: string;
  isCurrent: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyInfo {
  tier: MembershipTier;
  totalPoints: number;
  availablePoints: number;
  totalSpent: number;
  tierExpiresAt?: string;
}

export interface PatientProfile extends Patient {
  allergies: PatientAllergy[];
  chronicDiseases: PatientChronicDisease[];
  currentMedications: PatientMedication[];
  loyalty?: LoyaltyInfo;
}

export interface CreatePatientInput {
  title: PatientTitle;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  phone: string;
  email?: string;
  idCardNumber?: string;
  address?: Address;
  province?: string;
  bloodType?: BloodType;
  weight?: number;
  height?: number;
  insuranceType?: InsuranceType;
  insurancePolicyNo?: string;
  lineUserId?: string;
}

export interface UpdatePatientInput {
  title?: PatientTitle;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  gender?: Gender;
  phone?: string;
  email?: string;
  idCardNumber?: string;
  address?: Address;
  province?: string;
  bloodType?: BloodType;
  weight?: number;
  height?: number;
  insuranceType?: InsuranceType;
  insurancePolicyNo?: string;
  status?: PatientStatus;
}
