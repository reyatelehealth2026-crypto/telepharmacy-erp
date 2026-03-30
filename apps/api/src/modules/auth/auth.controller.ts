import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LineLoginDto } from './dto/line-login.dto';
import { StaffLoginDto } from './dto/staff-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PdpaConsentDto } from './dto/pdpa-consent.dto';
import { Public } from './decorators/public.decorator';
import { PatientOnly } from './decorators/patient-only.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PatientOnlyGuard } from './guards/patient-only.guard';
import type { RequestUser } from './interfaces';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('line-login')
  @HttpCode(HttpStatus.CREATED)
  lineLogin(@Body() dto: LineLoginDto) {
    return this.authService.lineLogin(dto);
  }

  @Public()
  @Post('staff-login')
  @HttpCode(HttpStatus.CREATED)
  staffLogin(@Body() dto: StaffLoginDto) {
    return this.authService.staffLogin(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout() {
    // Stateless JWT — client discards tokens.
    // Future: add token to a Redis blacklist for immediate revocation.
    return;
  }

  @UseGuards(JwtAuthGuard, PatientOnlyGuard)
  @PatientOnly()
  @Post('pdpa-consent')
  @HttpCode(HttpStatus.OK)
  pdpaConsent(
    @CurrentUser() user: RequestUser,
    @Body() dto: PdpaConsentDto,
  ) {
    return this.authService.pdpaConsent(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: RequestUser) {
    return this.authService.getProfile(user);
  }
}
