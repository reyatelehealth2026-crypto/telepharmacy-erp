import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@Module({
  imports: [AuthModule],
  providers: [EventsGateway, EventsService, WsJwtGuard],
  exports: [EventsGateway, EventsService],
})
export class EventsModule {}
