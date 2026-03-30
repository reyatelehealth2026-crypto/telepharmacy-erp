import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @MinLength(1, { message: 'กรุณาระบุ refresh token' })
  refreshToken!: string;
}
