import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class RedeemPointsDto {
  @IsNumber()
  @Min(1)
  points!: number;

  @IsOptional()
  @IsUUID()
  orderId?: string;
}
