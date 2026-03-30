import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdherenceService } from './adherence.service';
import { CreateReminderSchema, type CreateReminderDto } from './dto/create-reminder.dto';
import {
  CreatePatientReminderSchema,
  type CreatePatientReminderDto,
} from './dto/create-patient-reminder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

// ── Patient-facing controller ──────────────────────────────────────────────

@ApiTags('adherence')
@ApiBearerAuth()
@Controller('adherence')
@UseGuards(JwtAuthGuard)
export class AdherencePatientController {
  constructor(private readonly adherenceService: AdherenceService) {}

  /** Patient fetches their own reminders */
  @Get('my-reminders')
  async getMyReminders(
    @CurrentUser() user: any,
    @Query('isActive') isActive?: string,
  ) {
    const result = await this.adherenceService.findReminders({
      patientId: user.id,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    return { success: true, ...result };
  }

  /** Patient creates a self-service reminder */
  @Post('my-reminders')
  async createMyReminder(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(CreatePatientReminderSchema))
    dto: CreatePatientReminderDto,
  ) {
    const reminder = await this.adherenceService.createPatientReminder(dto, user.id);
    return { success: true, data: reminder, message: 'เพิ่มการแจ้งเตือนเรียบร้อยแล้ว' };
  }

  /** Patient acknowledges (marks taken) a reminder */
  @Patch('reminders/:id/acknowledge')
  async acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const reminder = await this.adherenceService.acknowledge(id, user.id);
    return { success: true, data: reminder, message: 'รับทราบการแจ้งเตือนเรียบร้อยแล้ว' };
  }

  /** Patient toggles a reminder on/off */
  @Patch('my-reminders/:id/toggle')
  async toggleReminder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const reminder = await this.adherenceService.toggleReminder(id, user.id);
    return { success: true, data: reminder };
  }

  /** Patient deletes a reminder */
  @Delete('my-reminders/:id')
  async deleteReminder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    await this.adherenceService.deleteReminder(id, user.id);
    return { success: true, message: 'ลบการแจ้งเตือนเรียบร้อยแล้ว' };
  }

  /** Patient gets their adherence stats */
  @Get('my-stats')
  async getMyStats(@CurrentUser() user: any) {
    const stats = await this.adherenceService.getAdherenceStats(user.id);
    return { success: true, data: stats };
  }
}

// ── Staff-facing controller ────────────────────────────────────────────────

@ApiTags('adherence')
@ApiBearerAuth()
@Controller('staff/adherence')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('pharmacist', 'super_admin', 'pharmacist_tech')
export class AdherenceStaffController {
  constructor(private readonly adherenceService: AdherenceService) {}

  @Post('reminders')
  async createReminder(
    @Body(new ZodValidationPipe(CreateReminderSchema)) dto: CreateReminderDto,
    @CurrentUser() user: any,
  ) {
    const reminder = await this.adherenceService.createReminder(dto, user.id);
    return { success: true, data: reminder, message: 'สร้างการแจ้งเตือนเรียบร้อยแล้ว' };
  }

  @Get('reminders')
  async findReminders(
    @Query('patientId') patientId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.adherenceService.findReminders({
      patientId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { success: true, ...result };
  }

  @Get('stats/:patientId')
  async getStats(@Param('patientId', ParseUUIDPipe) patientId: string) {
    const stats = await this.adherenceService.getAdherenceStats(patientId);
    return { success: true, data: stats };
  }

  @Post('reminders/:id/send-now')
  async sendNow(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.adherenceService.sendReminderNow(id);
    return { success: true, ...result };
  }
}
