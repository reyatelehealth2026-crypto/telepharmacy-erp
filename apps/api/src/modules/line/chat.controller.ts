import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ChatService } from './services/chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions')
  async createOrGetSession(@CurrentUser() user: RequestUser) {
    return this.chatService.getOrCreateSession(user.id);
  }

  @Get('sessions/:id/messages')
  async getMessages(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: RequestUser,
    @Query('after') after?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.chatService.getMessages(sessionId, user.id, after, limit);
  }

  @Post('sessions/:id/messages')
  async sendMessage(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { content: string },
  ) {
    return this.chatService.sendMessage(sessionId, user.id, body.content);
  }
}
