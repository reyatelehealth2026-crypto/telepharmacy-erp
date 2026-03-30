import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';

export class VerifySlipDto {
  @IsEnum(['matched', 'mismatch', 'approved', 'rejected'])
  decision!: 'matched' | 'mismatch' | 'approved' | 'rejected';

  @IsOptional()
  @IsNumber()
  verifiedAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
