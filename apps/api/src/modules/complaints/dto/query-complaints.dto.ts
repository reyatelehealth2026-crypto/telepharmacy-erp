import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';

const complaintStatuses = ['open', 'in_progress', 'resolved', 'closed'] as const;
const complaintSeverities = ['low', 'medium', 'high', 'critical'] as const;

export class QueryComplaintsDto {
  @IsOptional()
  @IsEnum(complaintStatuses)
  status?: (typeof complaintStatuses)[number];

  @IsOptional()
  @IsEnum(complaintSeverities)
  severity?: (typeof complaintSeverities)[number];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
