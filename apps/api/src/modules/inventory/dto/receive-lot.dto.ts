import { IsString, IsOptional, IsUUID, IsDateString, IsNumber, Min } from 'class-validator';

export class ReceiveLotDto {
  @IsUUID()
  productId!: string;

  @IsString()
  lotNo!: string;

  @IsDateString()
  expiryDate!: string;

  @IsOptional()
  @IsDateString()
  manufacturingDate?: string;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsString()
  supplierLotRef?: string;

  @IsOptional()
  @IsString()
  warehouseLocation?: string;

  @IsOptional()
  @IsString()
  warehouseZone?: string;
}
