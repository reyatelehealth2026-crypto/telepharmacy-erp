import { IsEnum, IsOptional, IsString } from 'class-validator';

export class VerifyPrescriptionDto {
  @IsEnum(['approved', 'rejected', 'partial', 'referred'])
  decision!: 'approved' | 'rejected' | 'partial' | 'referred';

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  interventionNote?: string;

  @IsOptional()
  @IsEnum([
    'drug_interaction_prevented',
    'allergy_prevented',
    'dose_adjustment',
    'drug_substitution',
    'therapy_duplication',
    'contraindication',
    'patient_education',
    'referral_to_doctor',
    'other',
  ])
  interventionType?: string;
}
