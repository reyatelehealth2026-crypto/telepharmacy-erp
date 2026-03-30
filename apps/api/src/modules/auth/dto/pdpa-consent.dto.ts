import { IsString, IsBoolean, MinLength } from 'class-validator';

export class PdpaConsentDto {
  @IsString()
  @MinLength(1, { message: 'กรุณาระบุเวอร์ชัน PDPA' })
  version!: string;

  @IsBoolean()
  dataSharingOpt!: boolean;
}
