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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RichMenuService } from './services/rich-menu.service';
import { BroadcastService } from './services/broadcast.service';
import { InboxService } from './services/inbox.service';
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
    private readonly config: ConfigService,
  ) {
    this.shopUrl = this.config.get<string>('NEXT_PUBLIC_SHOP_URL') ?? 'https://shop.re-ya.com';
  }

  // ─── Rich Menu ─────────────────────────────────────────────

  @Post('rich-menu/sync')
  @UseInterceptors(FileInterceptor('image'))
  async syncRichMenu(@UploadedFile() file: Express.Multer.File) {
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
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit?: number,
  ) {
    return this.inboxService.listSessions({ status, page: page!, limit: limit! });
  }

  @Get('inbox/:sessionId')
  async getSessionMessages(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
  ) {
    return this.inboxService.getSessionMessages(sessionId, limit!);
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
  ) {
    return this.inboxService.resolveSession(sessionId);
  }
}
