import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EConsentService } from './consent.service';
import {
  GetConsentTemplateSchema,
  AcceptConsentSchema,
  WithdrawConsentSchema,
  CreateConsentTemplateSchema,
  ConsentTemplateDto,
  PatientConsentDto,
  ConsentAcceptanceResult,
  ConsentStatusDto,
} from './dto/consent.dto';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('telemedicine/consent')
export class ConsentController {
  constructor(private readonly consentService: EConsentService) {}

  /** GET /v1/telemedicine/consent/template */
  @Get('template')
  async getActiveTemplate(
    @Query(new ZodValidationPipe(GetConsentTemplateSchema))
    query: { version?: string; language?: string },
  ): Promise<ConsentTemplateDto> {
    if (query.version) {
      return this.consentService.getTemplateByVersion(query.version, query.language || 'th');
    }
    return this.consentService.getActiveTemplate(query.language || 'th');
  }

  /** GET /v1/telemedicine/consent/status */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getConsentStatus(@CurrentUser() user: any): Promise<ConsentStatusDto> {
    return this.consentService.getConsentStatus(user.id);
  }

  /** POST /v1/telemedicine/consent/accept */
  @Post('accept')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async acceptConsent(
    @CurrentUser() user: any,
    @Req() req: any,
    @Body(new ZodValidationPipe(AcceptConsentSchema)) dto: any,
  ): Promise<ConsentAcceptanceResult> {
    const metadata = {
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'] || '',
      deviceId: req.headers['x-device-id'] || '',
    };
    return this.consentService.acceptConsent(user.id, dto, metadata);
  }

  /** POST /v1/telemedicine/consent/withdraw */
  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async withdrawConsent(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(WithdrawConsentSchema)) dto: any,
  ): Promise<{ message: string }> {
    await this.consentService.withdrawConsent(user.id, dto);
    return { message: 'Consent withdrawn successfully' };
  }

  /** GET /v1/telemedicine/consent/history */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getConsentHistory(@CurrentUser() user: any): Promise<PatientConsentDto[]> {
    return this.consentService.getConsentHistory(user.id);
  }

  /** POST /v1/telemedicine/consent/template (admin only) */
  @Post('template')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async createTemplate(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(CreateConsentTemplateSchema)) dto: any,
  ): Promise<ConsentTemplateDto> {
    return this.consentService.createTemplate(dto, user.id);
  }

  /** POST /v1/telemedicine/consent/template/:id/deactivate (admin only) */
  @Post('template/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async deactivateTemplate(@Param('id') templateId: string): Promise<{ message: string }> {
    await this.consentService.deactivateTemplate(templateId);
    return { message: 'Template deactivated successfully' };
  }

  /** GET /v1/telemedicine/consent/:id */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getConsentById(
    @Param('id') consentId: string,
    @CurrentUser() user: any,
  ): Promise<PatientConsentDto> {
    const history = await this.consentService.getConsentHistory(user.id);
    const consent = history.find((c) => c.id === consentId);
    if (!consent) throw new Error('Consent not found');
    return consent;
  }
}
