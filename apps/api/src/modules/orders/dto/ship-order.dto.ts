import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';

export class ShipOrderDto {
  @IsEnum(['kerry', 'flash', 'ninja_van', 'j_and_t', 'dhl', 'own_driver', 'customer_pickup'])
  provider!: string;

  @IsOptional()
  @IsString()
  trackingNo?: string;

  @IsOptional()
  @IsBoolean()
  coldChain?: boolean;

  @IsOptional()
  @IsString()
  courierName?: string;

  @IsOptional()
  @IsString()
  courierPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
