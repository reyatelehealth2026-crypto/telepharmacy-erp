import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreatePrescriptionDto {
  @IsOptional()
  @IsArray()
  imageUrls?: string[];

  @IsOptional()
  @IsEnum(['paper_rx', 'electronic_rx', 'walk_in', 'phone_call', 'line_chat'])
  source?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;
}
