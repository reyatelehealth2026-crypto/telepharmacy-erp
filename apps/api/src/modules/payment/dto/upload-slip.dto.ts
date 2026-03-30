import { IsString, IsOptional } from 'class-validator';

export class UploadSlipDto {
  @IsString()
  slipImageUrl!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
