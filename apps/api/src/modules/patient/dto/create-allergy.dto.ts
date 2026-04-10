import { IsString, IsOptional, IsEnum, IsArray, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const ALLERGY_REACTION_TYPES = ['allergic', 'side_effect', 'intolerance'] as const;
const ALLERGY_SEVERITIES = ['mild', 'moderate', 'severe', 'life_threatening'] as const;
const ALLERGY_SOURCES = ['patient_reported', 'doctor_diagnosed', 'pharmacist_identified', 'family_history'] as const;

/** class-validator treats `null` as a value — strip so @IsOptional skips validation */
function nullToUndef({ value }: { value: unknown }) {
  return value === null || value === '' ? undefined : value;
}

export class CreateAllergyDto {
  @IsString()
  @MaxLength(255)
  drugName!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genericNames?: string[];

  @IsOptional()
  @Transform(nullToUndef)
  @IsString()
  @MaxLength(100)
  allergyGroup?: string;

  /** Default `allergic` applied in service when omitted (shop/onboarding did not send this field). */
  @IsOptional()
  @IsEnum(ALLERGY_REACTION_TYPES)
  reactionType?: string;

  @IsEnum(ALLERGY_SEVERITIES)
  severity!: string;

  @IsOptional()
  @Transform(nullToUndef)
  @IsString()
  symptoms?: string;

  @IsOptional()
  @IsEnum(ALLERGY_SOURCES)
  source?: string;

  @IsOptional()
  @Transform(nullToUndef)
  @IsString()
  occurredDate?: string;

  @IsOptional()
  @Transform(nullToUndef)
  @IsString()
  notes?: string;
}
