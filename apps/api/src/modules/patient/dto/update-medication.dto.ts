import { PartialType } from '@nestjs/mapped-types';
import { CreateMedicationDto } from './create-medication.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateMedicationDto extends PartialType(CreateMedicationDto) {
  @IsOptional()
  @IsString()
  discontinuedReason?: string;
}
