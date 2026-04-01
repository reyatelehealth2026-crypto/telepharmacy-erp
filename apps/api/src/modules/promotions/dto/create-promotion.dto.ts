import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
  Max,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';

const promotionTypes = [
  'percentage_discount',
  'fixed_discount',
  'buy_x_get_y',
  'bundle',
  'free_delivery',
  'free_gift',
  'points_multiplier',
] as const;

const membershipTiers = ['bronze', 'silver', 'gold', 'platinum'] as const;

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(promotionTypes)
  type!: (typeof promotionTypes)[number];

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  /**
   * Custom validation enforced at service level:
   * - percentage_discount: value must be 1–100, maxDiscount required
   * - buy_x_get_y: buyQuantity and getQuantity required
   */

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  /** Required when type is percentage_discount */
  @ValidateIf((o) => o.type === 'percentage_discount')
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usagePerCustomer?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsEnum(membershipTiers)
  tierRequired?: (typeof membershipTiers)[number];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  /** Required when type is buy_x_get_y */
  @ValidateIf((o) => o.type === 'buy_x_get_y')
  @IsNumber()
  @Min(1)
  buyQuantity?: number;

  /** Required when type is buy_x_get_y */
  @ValidateIf((o) => o.type === 'buy_x_get_y')
  @IsNumber()
  @Min(1)
  getQuantity?: number;
}
