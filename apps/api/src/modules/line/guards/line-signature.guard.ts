import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { LINE_SIGNATURE_HEADER } from '../line.constants';

@Injectable()
export class LineSignatureGuard implements CanActivate {
  private readonly logger = new Logger(LineSignatureGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
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

    const channelSecret = this.config.getOrThrow<string>('line.channelSecret');
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
