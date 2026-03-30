import { IsArray, IsOptional, IsString, IsNumber, IsUUID, ValidateNested, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class DeliveryAddressDto {
  @IsString()
  address!: string;

  @IsOptional()
  @IsString()
  subDistrict?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsString()
  province!: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  recipient?: string;
}

export class CreateOtcOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress!: DeliveryAddressDto;

  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @IsOptional()
  @IsString()
  discountCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usePoints?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['promptpay', 'bank_transfer', 'cod', 'mobile_banking', 'credit_card'])
  paymentMethod?: string;
}
