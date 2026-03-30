import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Patient gets their own notifications */
  @Get('me')
  async getMyNotifications(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
  ) {
    const result = await this.notificationsService.getMyNotifications(user.id, page, limit);
    return { success: true, ...result };
  }

  /** Mark a single notification as read */
  @Patch(':id/read')
  async markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const notification = await this.notificationsService.markRead(id, user.id);
    return { success: true, data: notification };
  }

  /** Mark all notifications as read */
  @Post('read-all')
  async markAllRead(@CurrentUser() user: any) {
    await this.notificationsService.markAllRead(user.id);
    return { success: true, message: 'อ่านทั้งหมดแล้ว' };
  }
}
