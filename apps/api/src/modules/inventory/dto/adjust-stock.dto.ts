import { IsUUID, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class AdjustStockDto {
  @IsUUID()
  lotId!: string;

  @IsEnum(['adjustment_in', 'adjustment_out', 'write_off', 'return_in', 'return_out'])
  movementType!: string;

  @IsNumber()
  quantity!: number;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;
}
