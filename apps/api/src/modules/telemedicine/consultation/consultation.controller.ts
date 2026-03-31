import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UsePipes,
} from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  RequestConsultationSchema,
  AcceptConsentSchema,
  StartSessionSchema,
  EndSessionSchema,
  ListConsultationsSchema,
  type RequestConsultationDto,
  type AcceptConsentDto,
  type StartSessionDto,
  type EndSessionDto,
  type ListConsultationsDto,
} from './dto/consultation.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('v1/telemedicine/consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  /**
   * POST /v1/telemedicine/consultations/request
   * Patient requests consultation
   */
  @Post('request')
  @UsePipes(new ZodValidationPipe(RequestConsultationSchema))
  async requestConsultation(
    @Body() dto: RequestConsultationDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const patientId = user.id;
    const ipAddress = req.ip;
    const deviceId = req.headers['x-device-id'];

    return this.consultationService.requestConsultation(
      patientId,
      dto,
      ipAddress,
      deviceId,
    );
  }

  /**
   * POST /v1/telemedicine/consultations/:id/accept-consent
   * Patient accepts e-consent
   */
  @Post(':id/accept-consent')
  @UsePipes(new ZodValidationPipe(AcceptConsentSchema))
  async acceptConsent(
    @Param('id') consultationId: string,
    @Body() dto: AcceptConsentDto,
    @CurrentUser() user: any,
  ) {
    const patientId = user.id;

    return this.consultationService.acceptConsent(
      patientId,
      consultationId,
      dto,
    );
  }

  /**
   * POST /v1/telemedicine/consultations/:id/accept
   * Pharmacist accepts consultation (generates Agora token)
   */
  @Post(':id/accept')
  @UseGuards(RolesGuard)
  @Roles('pharmacist', 'super_admin')
  async acceptConsultation(
    @Param('id') consultationId: string,
    @CurrentUser() user: any,
  ) {
    const pharmacistId = user.id;

    return this.consultationService.acceptConsultation(
      pharmacistId,
      consultationId,
    );
  }

  /**
   * GET /v1/telemedicine/consultations/:id/token
   * Get Agora token for patient
   */
  @Get(':id/token')
  async getPatientToken(
    @Param('id') consultationId: string,
    @CurrentUser() user: any,
  ) {
    const patientId = user.id;

    return this.consultationService.getPatientToken(patientId, consultationId);
  }

  /**
   * POST /v1/telemedicine/consultations/:id/start
   * Start video session
   */
  @Post(':id/start')
  @UsePipes(new ZodValidationPipe(StartSessionSchema))
  async startSession(
    @Param('id') consultationId: string,
    @Body() dto: StartSessionDto,
    @CurrentUser() user: any,
  ) {
    const actorId = user.id;

    return this.consultationService.startSession(actorId, consultationId, dto);
  }

  /**
   * POST /v1/telemedicine/consultations/:id/end
   * End video session and finalize recording
   */
  @Post(':id/end')
  @UsePipes(new ZodValidationPipe(EndSessionSchema))
  async endSession(
    @Param('id') consultationId: string,
    @Body() dto: EndSessionDto,
    @CurrentUser() user: any,
  ) {
    const actorId = user.id;

    return this.consultationService.endSession(actorId, consultationId, dto);
  }

  /**
   * GET /v1/telemedicine/consultations/:id
   * Get consultation details
   */
  @Get(':id')
  async getConsultation(@Param('id') consultationId: string, @CurrentUser() user: any) {
    const userId = user.id;
    const userType = user.role || 'patient';

    return this.consultationService.getConsultation(
      userId,
      consultationId,
      userType,
    );
  }

  /**
   * GET /v1/telemedicine/consultations
   * List consultations with filters
   */
  @Get()
  async listConsultations(
    @Query(new ZodValidationPipe(ListConsultationsSchema))
    query: ListConsultationsDto,
    @CurrentUser() user: any,
  ) {
    const userId = user.id;
    const userType = user.role || 'patient';

    const filters = {
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit,
      offset: query.offset,
    };

    return this.consultationService.listConsultations(
      userId,
      userType,
      filters,
    );
  }
}
