import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import type { JwtPayload, RequestUser } from '../../auth/interfaces';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Unauthorized: No token provided');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      if (!payload.sub || !payload.type) {
        throw new WsException('Unauthorized: Invalid token payload');
      }

      const user: RequestUser = {
        id: payload.sub,
        type: payload.type,
        role: payload.role,
        lineUserId: payload.lineUserId,
      };

      client.data.user = user;
      return true;
    } catch (error) {
      this.logger.warn(`WebSocket auth failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new WsException('Unauthorized: Invalid token');
    }
  }

  private extractToken(client: Socket): string | undefined {
    // Try handshake auth first, then query params
    return (
      client.handshake?.auth?.token ??
      (client.handshake?.query?.token as string | undefined)
    );
  }
}
