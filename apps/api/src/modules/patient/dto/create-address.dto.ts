import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength, Max, Min } from 'class-validator';
import { THAI_PROVINCES } from '../constants/thai-provinces';

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @IsString()
  @MaxLength(255)
  recipientName!: string;

  @IsString()
  @Matches(/^0\d{9}$/)
  phone!: string;

  @IsString()
  @MaxLength(500)
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subDistrict?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsString()
  @MaxLength(100)
  @IsIn(THAI_PROVINCES.map((p) => p))
  province!: string;

  @IsString()
  @Matches(/^\d{5}$/)
  postalCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
