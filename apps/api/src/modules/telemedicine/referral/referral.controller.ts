import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  UsePipes,
} from '@nestjs/common';
import { ReferralService, CreateReferralDto } from './referral.service';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { z } from 'zod';

// Zod schemas
const CreateReferralSchema = z.object({
  consultationId: z.string().uuid(),
  reason: z.enum([
    'emergency_symptoms',
    'diagnostic_uncertainty',
    'scope_limitation',
    'requires_physical_exam',
    'requires_lab_tests',
    'requires_specialist',
    'patient_request',
  ]),
  urgencyLevel: z.enum(['immediate', 'urgent', 'routine']),
  clinicalSummary: z.string().min(10),
  symptoms: z.array(z.any()).optional(),
  vitalSigns: z.record(z.any()).optional(),
  currentMedications: z.array(z.any()).optional(),
  pharmacistNotes: z.string().min(10),
});

const ListReferralsSchema = z.object({
  status: z.array(z.string()).optional(),
  urgencyLevel: z.string().optional(),
  startDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const ReferralStatsSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

@Controller('v1/telemedicine/referrals')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  /**
   * POST /v1/telemedicine/referrals
   * Create emergency referral
   */
  @Post()
  @UsePipes(new ZodValidationPipe(CreateReferralSchema))
  async createReferral(@Body() dto: CreateReferralDto, @Req() req: any) {
    const pharmacistId = req.user?.id || 'mock-pharmacist-id';
    return this.referralService.createReferral(pharmacistId, dto);
  }

  /**
   * POST /v1/telemedicine/referrals/:id/acknowledge
   * Patient acknowledges referral
   */
  @Post(':id/acknowledge')
  async acknowledgeReferral(@Param('id') referralId: string, @Req() req: any) {
    const patientId = req.user?.id || 'mock-patient-id';
    return this.referralService.acknowledgeReferral(patientId, referralId);
  }

  /**
   * GET /v1/telemedicine/referrals/:id
   * Get referral details
   */
  @Get(':id')
  async getReferral(@Param('id') referralId: string, @Req() req: any) {
    const userId = req.user?.id || 'mock-user-id';
    return this.referralService.getReferral(referralId, userId);
  }

  /**
   * GET /v1/telemedicine/referrals
   * List referrals with filters
   */
  @Get()
  async listReferrals(
    @Query(new ZodValidationPipe(ListReferralsSchema)) query: any,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'mock-user-id';
    const userType = req.user?.role || 'patient';

    const filters = {
      status: query.status,
      urgencyLevel: query.urgencyLevel,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      limit: query.limit,
      offset: query.offset,
    };

    return this.referralService.listReferrals(userId, userType, filters);
  }

  /**
   * GET /v1/telemedicine/referrals/stats
   * Get referral statistics
   */
  @Get('stats')
  async getReferralStats(
    @Query(new ZodValidationPipe(ReferralStatsSchema)) query: any,
  ) {
    return this.referralService.getReferralStats(
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }
}
