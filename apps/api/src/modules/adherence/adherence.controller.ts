import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdherenceService } from './adherence.service';
import { CreateReminderSchema, type CreateReminderDto } from './dto/create-reminder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('adherence')
@ApiBearerAuth()
@Controller('adherence')
@UseGuards(JwtAuthGuard)
export class AdherenceController {
  constructor(private readonly adherenceService: AdherenceService) {}

  @Post('reminders')
  @UseGuards(RolesGuard)
  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  async createReminder(
    @Body(new ZodValidationPipe(CreateReminderSchema)) dto: CreateReminderDto,
    @CurrentUser() user: any,
  ) {
    const reminder = await this.adherenceService.createReminder(dto, user.id);
    return { success: true, data: reminder, message: 'สร้างการแจ้งเตือนเรียบร้อยแล้ว' };
  }

  @Get('reminders')
  @UseGuards(RolesGuard)
  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
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

  @Patch('reminders/:id/acknowledge')
  async acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const reminder = await this.adherenceService.acknowledge(id, user.id);
    return { success: true, data: reminder, message: 'รับทราบการแจ้งเตือนเรียบร้อยแล้ว' };
  }

  @Get('stats/:patientId')
  @UseGuards(RolesGuard)
  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  async getStats(@Param('patientId', ParseUUIDPipe) patientId: string) {
    const stats = await this.adherenceService.getAdherenceStats(patientId);
    return { success: true, data: stats };
  }

  @Post('reminders/:id/send-now')
  @UseGuards(RolesGuard)
  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  async sendNow(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.adherenceService.sendReminderNow(id);
    return { success: true, ...result };
  }
}
