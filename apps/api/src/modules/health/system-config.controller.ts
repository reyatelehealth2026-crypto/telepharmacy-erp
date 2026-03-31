import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SystemConfigService } from './system-config.service';

@Controller('system/config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class SystemConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @Get()
  async getAll() {
    const configs = await this.configService.getAll();
    return { success: true, data: configs };
  }

  @Get('pharmacy')
  async getPharmacySettings() {
    const settings = await this.configService.getPharmacySettings();
    return { success: true, data: settings };
  }

  @Patch('pharmacy')
  async updatePharmacySettings(
    @Body() body: { pharmacyName?: string; phone?: string; email?: string; address?: string; openHours?: string },
    @CurrentUser() user: any,
  ) {
    await this.configService.setMany(
      Object.entries(body)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => ({ key: `pharmacy.${k}`, value: v })),
      user.id,
    );
    return { success: true, message: 'บันทึกเรียบร้อย' };
  }

  @Get('notifications')
  async getNotificationSettings() {
    const settings = await this.configService.getNotificationSettings();
    return { success: true, data: settings };
  }

  @Patch('notifications')
  async updateNotificationSettings(
    @Body() body: { newOrder?: boolean; lowStock?: boolean; rxPending?: boolean },
    @CurrentUser() user: any,
  ) {
    await this.configService.setMany(
      Object.entries(body)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => ({ key: `notifications.${k}`, value: v })),
      user.id,
    );
    return { success: true, message: 'บันทึกเรียบร้อย' };
  }
}
