import { Controller, Post, Body, UseGuards, BadRequestException, Logger } from '@nestjs/common';
import { chatWithPatientSync, type ChatMessage } from '@telepharmacy/ai';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DynamicConfigService } from '../health/dynamic-config.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiChatController {
  private readonly logger = new Logger(AiChatController.name);

  constructor(private readonly dynamicConfig: DynamicConfigService) {}

  @Post('chat')
  async chat(
    @Body() body: { message: string; history?: ChatMessage[] },
    @CurrentUser() _user: unknown,
  ) {
    const geminiApiKey = await this.dynamicConfig.resolve('ai.geminiApiKey', 'GEMINI_API_KEY');
    if (!geminiApiKey?.trim()) {
      throw new BadRequestException(
        'ยังไม่ได้ตั้งค่า Gemini API key — ตั้งใน Admin (System → integrations → ai) หรือ GEMINI_API_KEY ใน environment',
      );
    }
    try {
      const response = await chatWithPatientSync(body.message, body.history ?? [], undefined, {
        geminiApiKey: geminiApiKey.trim(),
      });
      return { data: response };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`AI chat failed: ${msg}`);
      throw new BadRequestException(msg || 'AI chat failed');
    }
  }
}
