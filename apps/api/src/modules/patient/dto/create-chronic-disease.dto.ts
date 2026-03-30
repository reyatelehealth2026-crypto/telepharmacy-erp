import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

const CHRONIC_DISEASE_STATUSES = ['active', 'resolved', 'under_treatment'] as const;

export class CreateChronicDiseaseDto {
  @IsString()
  @MaxLength(255)
  diseaseName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  icd10Code?: string;

  @IsOptional()
  @IsEnum(CHRONIC_DISEASE_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  diagnosedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  doctorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  hospital?: string;
}
