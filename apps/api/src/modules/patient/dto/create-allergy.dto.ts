import { IsString, IsOptional, IsEnum, IsArray, MaxLength } from 'class-validator';

const ALLERGY_REACTION_TYPES = ['allergic', 'side_effect', 'intolerance'] as const;
const ALLERGY_SEVERITIES = ['mild', 'moderate', 'severe', 'life_threatening'] as const;
const ALLERGY_SOURCES = ['patient_reported', 'doctor_diagnosed', 'pharmacist_identified', 'family_history'] as const;

export class CreateAllergyDto {
  @IsString()
  @MaxLength(255)
  drugName!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genericNames?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  allergyGroup?: string;

  @IsEnum(ALLERGY_REACTION_TYPES)
  reactionType!: string;

  @IsEnum(ALLERGY_SEVERITIES)
  severity!: string;

  @IsOptional()
  @IsString()
  symptoms?: string;

  @IsOptional()
  @IsEnum(ALLERGY_SOURCES)
  source?: string;

  @IsOptional()
  @IsString()
  occurredDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
