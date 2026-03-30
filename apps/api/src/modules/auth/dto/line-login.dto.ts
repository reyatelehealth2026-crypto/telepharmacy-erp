import { IsString, IsUrl, MinLength } from 'class-validator';

export class LineLoginDto {
  @IsString()
  @MinLength(1, { message: 'กรุณาระบุ authorization code' })
  code!: string;

  @IsUrl({}, { message: 'รูปแบบ redirect URI ไม่ถูกต้อง' })
  redirectUri!: string;
}
