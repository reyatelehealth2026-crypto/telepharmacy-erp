import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';

const contentTypes = [
  'health_article',
  'product_review',
  'faq',
  'drug_info',
  'promotion_banner',
] as const;

export class QueryContentDto {
  @IsOptional()
  @IsEnum(contentTypes)
  type?: (typeof contentTypes)[number];

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
