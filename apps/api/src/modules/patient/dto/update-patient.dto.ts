import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum, MaxLength, Min } from 'class-validator';

const PATIENT_TITLES = ['mr', 'mrs', 'miss', 'ms', 'master', 'infant', 'other'] as const;
const GENDERS = ['male', 'female', 'other'] as const;
const BLOOD_TYPES = ['a', 'b', 'ab', 'o', 'a_rh_minus', 'b_rh_minus', 'ab_rh_minus', 'o_rh_minus', 'unknown'] as const;
const INSURANCE_TYPES = ['none', 'government_30baht', 'social_security', 'government_civil_servant', 'private'] as const;

export class UpdatePatientDto {
  @IsOptional()
  @IsEnum(PATIENT_TITLES)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsEnum(GENDERS)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @IsOptional()
  @IsEnum(BLOOD_TYPES)
  bloodType?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subDistrict?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @IsOptional()
  @IsBoolean()
  isPregnant?: boolean;

  @IsOptional()
  @IsBoolean()
  isBreastfeeding?: boolean;

  @IsOptional()
  @IsBoolean()
  smoking?: boolean;

  @IsOptional()
  @IsBoolean()
  alcohol?: boolean;

  @IsOptional()
  @IsEnum(INSURANCE_TYPES)
  insuranceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  insuranceId?: string;
}
