import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { chatWithPatientSync } from '@telepharmacy/ai';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('v1/ai')
@UseGuards(JwtAuthGuard)
export class AiChatController {
  @Post('chat')
  async chat(
    @Body() body: { message: string; history?: Array<{ role: string; content: string }> },
    @CurrentUser() user: any,
  ) {
    const response = await chatWithPatientSync(
      body.message,
      body.history ?? [],
      undefined,
    );
    return { data: response };
  }
}
