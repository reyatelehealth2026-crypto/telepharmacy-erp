import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';

const contentTypes = [
  'health_article',
  'product_review',
  'faq',
  'drug_info',
  'promotion_banner',
] as const;

export class CreateContentDto {
  @IsEnum(contentTypes)
  type!: (typeof contentTypes)[number];

  @IsString()
  @IsNotEmpty()
  titleTh!: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seoKeywords?: string[];

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsString()
  featuredImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedProductIds?: string[];
}
