import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
  DefaultValuePipe,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RichMenuService } from './services/rich-menu.service';
import { BroadcastService } from './services/broadcast.service';
import { InboxService } from './services/inbox.service';
import { LineWebhookLogService } from './services/line-webhook-log.service';
import { LineWebhookService } from './services/line-webhook.service';
import { PatientTimelineService } from './services/patient-timeline.service';
import { CreateBroadcastSchema, type CreateBroadcastDto } from './dto/create-broadcast.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ConfigService } from '@nestjs/config';

@Controller('staff/line')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('pharmacist', 'super_admin', 'marketing', 'customer_service', 'pharmacist_tech', 'accounting', 'delivery')
export class LineStaffController {
  private readonly shopUrl: string;

  constructor(
    private readonly richMenuService: RichMenuService,
    private readonly broadcastService: BroadcastService,
    private readonly inboxService: InboxService,
    private readonly webhookLogService: LineWebhookLogService,
    private readonly lineWebhookService: LineWebhookService,
    private readonly patientTimelineService: PatientTimelineService,
    private readonly config: ConfigService,
  ) {
    this.shopUrl = this.config.get<string>('NEXT_PUBLIC_SHOP_URL') ?? 'https://shop.re-ya.com';
  }

  // ─── Rich Menu ─────────────────────────────────────────────

  @Post('rich-menu/sync')
  @UseInterceptors(FileInterceptor('image'))
  async syncRichMenu(@UploadedFile() file: { buffer?: Buffer } | undefined) {
    const imageBuffer = file?.buffer ?? Buffer.alloc(0);
    const result = await this.richMenuService.sync(imageBuffer, this.shopUrl);
    return { success: true, ...result };
  }

  @Post('rich-menu/link')
  async linkRichMenu(
    @Body() body: { richMenuId: string; userIds?: string[] },
  ) {
    if (body.userIds && body.userIds.length > 0) {
      await this.richMenuService.linkToUsers(body.userIds, body.richMenuId);
    }
    return { success: true, message: 'Rich menu linked' };
  }

  @Post('rich-menu/switch')
  async switchRichMenu(
    @Body() body: { userId: string; richMenuId: string },
  ) {
    await this.richMenuService.linkToUser(body.userId, body.richMenuId);
    return { success: true, message: 'Rich menu switched' };
  }

  @Get('rich-menu/list')
  async listRichMenus() {
    const menus = await this.richMenuService.listAll();
    return { success: true, data: menus };
  }

  // ─── Broadcast ─────────────────────────────────────────────

  @Post('broadcast')
  async createBroadcast(
    @Body(new ZodValidationPipe(CreateBroadcastSchema)) dto: CreateBroadcastDto,
    @CurrentUser() user: any,
  ) {
    return this.broadcastService.createCampaign(dto, user.id);
  }

  @Get('broadcast')
  async listBroadcasts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.broadcastService.listCampaigns(page, limit);
  }

  @Get('broadcast/:id')
  async getBroadcast(@Param('id', ParseUUIDPipe) id: string) {
    return this.broadcastService.getCampaign(id);
  }

  // ─── Inbox (Chat Sessions) ────────────────────────────────

  @Get('inbox')
  async listSessions(
    @Query('status') status?: string,
    @Query('queueStatus') queueStatus?: string,
    @Query('priority') priority?: string,
    @Query('unreadOnly') unreadOnlyRaw?: string,
    @Query('tagId', new ParseUUIDPipe({ optional: true })) tagId?: string,
    @Query('followUp') followUp?: 'any' | 'due' | 'scheduled' | 'none',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit?: number,
  ) {
    const unreadOnly =
      unreadOnlyRaw === '1' || unreadOnlyRaw === 'true' || unreadOnlyRaw === 'yes';
    return this.inboxService.listSessions({
      status,
      queueStatus,
      priority,
      unreadOnly: unreadOnly || undefined,
      tagId,
      followUp,
      page: page!,
      limit: limit!,
    });
  }

  @Get('inbox/:sessionId')
  async getSessionMessages(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
  ) {
    return this.inboxService.getSessionMessages(sessionId, limit!);
  }

  @Get('inbox/:sessionId/customer-360')
  async getCustomer360(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.patientTimelineService.getCustomer360(sessionId);
  }

  @Post('inbox/:sessionId/reply')
  async staffReply(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() body: { content: string },
    @CurrentUser() user: any,
  ) {
    return this.inboxService.staffReply(sessionId, body.content, user.id);
  }

  @Patch('inbox/:sessionId/assign')
  async assignSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: any,
  ) {
    return this.inboxService.assignSession(sessionId, user.id);
  }

  @Patch('inbox/:sessionId/resolve')
  async resolveSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: any,
  ) {
    return this.inboxService.resolveSession(sessionId, user.id);
  }

  @Patch('inbox/:sessionId/reopen')
  async reopenSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: any,
  ) {
    return this.inboxService.reopenSession(sessionId, user.id);
  }

  @Post('inbox/:sessionId/notes')
  async addInternalNote(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() body: { content: string },
    @CurrentUser() user: any,
  ) {
    return this.inboxService.addInternalNote(sessionId, body.content, user.id);
  }

  @Patch('inbox/:sessionId/follow-up')
  async setFollowUp(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() body: { followUpAt: string | null },
    @CurrentUser() user: any,
  ) {
    const at = body.followUpAt ? new Date(body.followUpAt) : null;
    if (body.followUpAt && (at === null || Number.isNaN(at.getTime()))) {
      throw new BadRequestException('Invalid followUpAt');
    }
    return this.inboxService.setFollowUp(sessionId, at, user.id);
  }

  @Patch('inbox/:sessionId/tags')
  async setSessionTags(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() body: { tagIds: string[] },
    @CurrentUser() user: any,
  ) {
    return this.inboxService.setSessionPatientTags(sessionId, body.tagIds ?? [], user.id);
  }

  @Get('patient-tags')
  async listPatientTags() {
    return this.inboxService.listPatientTags();
  }

  @Post('patient-tags')
  async createPatientTag(
    @Body() body: { slug: string; label: string; color?: string | null },
  ) {
    return this.inboxService.createPatientTag(body);
  }

  @Get('quick-replies')
  async listQuickReplies() {
    return this.inboxService.listQuickReplies();
  }

  @Get('webhooks/stats')
  async getWebhookStats() {
    return this.webhookLogService.getStats();
  }

  @Get('webhooks/dashboard')
  async getWebhookDashboard() {
    return this.webhookLogService.getDashboard();
  }

  @Get('webhooks')
  async listWebhookEvents(
    @Query('status') status?: string,
    @Query('eventType') eventType?: string,
    @Query('lineUserId') lineUserId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('failedOnly') failedOnlyRaw?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit?: number,
  ) {
    const fromDate =
      from && !Number.isNaN(Date.parse(from)) ? new Date(from) : undefined;
    const toDate =
      to && !Number.isNaN(Date.parse(to)) ? endOfLocalDay(new Date(to)) : undefined;
    const failedOnly =
      failedOnlyRaw === '1' || failedOnlyRaw === 'true' || failedOnlyRaw === 'yes';
    return this.webhookLogService.listEventsPaginated({
      status,
      eventType,
      lineUserId,
      from: fromDate,
      to: toDate,
      failedOnly: failedOnly || undefined,
      page: page!,
      limit: Math.min(limit ?? 30, 100),
    });
  }

  @Post('webhooks/:eventId/replay')
  @Roles('super_admin', 'pharmacist', 'customer_service')
  async replayWebhookEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: any,
  ) {
    return this.lineWebhookService.replayFailedEvent(eventId, user.id);
  }

  @Get('webhooks/:eventId')
  async getWebhookEvent(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.webhookLogService.getEvent(eventId);
  }
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
