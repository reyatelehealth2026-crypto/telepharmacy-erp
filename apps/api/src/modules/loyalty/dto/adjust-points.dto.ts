import { IsNumber, IsString } from 'class-validator';

export class AdjustPointsDto {
  @IsNumber()
  points!: number;

  @IsString()
  reason!: string;
}
