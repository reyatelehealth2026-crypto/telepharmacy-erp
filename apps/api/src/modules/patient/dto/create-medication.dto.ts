import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateMedicationDto {
  @IsString()
  @MaxLength(255)
  drugName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  genericName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  strength?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  dosageForm?: string;

  @IsOptional()
  @IsString()
  sig?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  duration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  prescribedBy?: string;

  @IsOptional()
  @IsString()
  prescribedAt?: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
