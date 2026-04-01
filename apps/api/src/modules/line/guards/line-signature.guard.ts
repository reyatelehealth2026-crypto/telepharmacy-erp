import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { DynamicConfigService } from '../../health/dynamic-config.service';
import { LINE_SIGNATURE_HEADER } from '../line.constants';

@Injectable()
export class LineSignatureGuard implements CanActivate {
  private readonly logger = new Logger(LineSignatureGuard.name);

  constructor(private readonly dynamicConfig: DynamicConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers[LINE_SIGNATURE_HEADER] as
      | string
      | undefined;

    if (!signature) {
      this.logger.warn('Missing X-Line-Signature header');
      throw new ForbiddenException('Missing LINE signature');
    }

    const rawBody: Buffer | undefined = request.rawBody;
    if (!rawBody) {
      this.logger.warn('Raw body not available for signature verification');
      throw new ForbiddenException('Cannot verify LINE signature');
    }

    const channelSecret = await this.dynamicConfig.resolve(
      'line.channelSecret',
      'LINE_CHANNEL_SECRET',
    );
    const expectedSignature = createHmac('SHA256', channelSecret)
      .update(rawBody)
      .digest('base64');

    const signatureBuffer = Buffer.from(signature, 'base64');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64');

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      this.logger.warn('Invalid LINE webhook signature');
      throw new ForbiddenException('Invalid LINE signature');
    }

    return true;
  }
}
