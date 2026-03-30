import { IsString, IsEnum, IsOptional } from 'class-validator';

export class ShippingWebhookDto {
  @IsString()
  trackingNo!: string;

  @IsEnum([
    'pending', 'picking', 'packed', 'ready', 'picked_up',
    'in_transit', 'out_for_delivery', 'nearby',
    'delivered', 'failed', 'returned_to_sender',
  ])
  status!: string;

  @IsOptional()
  @IsString()
  receiverName?: string;

  @IsOptional()
  @IsString()
  receiverPhone?: string;

  @IsOptional()
  @IsString()
  failureReason?: string;

  @IsOptional()
  @IsString()
  deliveryProofUrl?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;
}
