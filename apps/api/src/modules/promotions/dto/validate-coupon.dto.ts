import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';

const membershipTiers = ['bronze', 'silver', 'gold', 'platinum'] as const;

export class ValidateCouponDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsNumber()
  @Min(0)
  orderAmount!: number;

  @IsOptional()
  @IsEnum(membershipTiers)
  patientTier?: (typeof membershipTiers)[number];
}
