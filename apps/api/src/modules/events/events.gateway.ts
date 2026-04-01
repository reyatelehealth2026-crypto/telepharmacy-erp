import { Logger, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload, RequestUser } from '../auth/interfaces';
import { WsJwtGuard } from './guards/ws-jwt.guard';

const VALID_ROOMS = [
  'room:prescriptions',
  'room:orders',
  'room:chat',
  'room:complaints',
] as const;

type ValidRoom = (typeof VALID_ROOMS)[number];

@WebSocketGateway({
  path: '/ws',
  cors: { origin: '*' },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        client.handshake?.auth?.token ??
        (client.handshake?.query?.token as string | undefined);

      if (!token) {
        this.logger.warn(`Client ${client.id} rejected: no token`);
        client.emit('error', { message: 'Unauthorized' });
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(token);

      if (!payload.sub || !payload.type) {
        this.logger.warn(`Client ${client.id} rejected: invalid payload`);
        client.emit('error', { message: 'Unauthorized' });
        client.disconnect(true);
        return;
      }

      const user: RequestUser = {
        id: payload.sub,
        type: payload.type,
        role: payload.role,
        lineUserId: payload.lineUserId,
      };

      client.data.user = user;
      this.logger.log(`Client connected: ${client.id} (user: ${user.id}, type: ${user.type})`);
    } catch {
      this.logger.warn(`Client ${client.id} rejected: invalid token`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() rooms: string[],
  ): { event: string; data: { joined: string[] } } {
    const validRooms = (rooms ?? []).filter((room): room is ValidRoom =>
      (VALID_ROOMS as readonly string[]).includes(room),
    );

    for (const room of validRooms) {
      client.join(room);
    }

    this.logger.log(`Client ${client.id} joined rooms: ${validRooms.join(', ')}`);

    return {
      event: 'subscribed',
      data: { joined: validRooms },
    };
  }
}
