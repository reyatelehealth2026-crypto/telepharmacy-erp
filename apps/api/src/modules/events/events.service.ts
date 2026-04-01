import { Injectable, Logger } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly eventsGateway: EventsGateway) {}

  emitPrescriptionUpdate(data: Record<string, unknown>): void {
    this.eventsGateway.server
      .to('room:prescriptions')
      .emit('prescription:update', data);
    this.logger.debug(`Emitted prescription:update to room:prescriptions`);
  }

  emitOrderUpdate(data: Record<string, unknown>): void {
    this.eventsGateway.server
      .to('room:orders')
      .emit('order:update', data);
    this.logger.debug(`Emitted order:update to room:orders`);
  }

  emitChatMessage(data: Record<string, unknown>): void {
    this.eventsGateway.server
      .to('room:chat')
      .emit('chat:message', data);
    this.logger.debug(`Emitted chat:message to room:chat`);
  }

  emitNewComplaint(data: Record<string, unknown>): void {
    this.eventsGateway.server
      .to('room:complaints')
      .emit('complaint:new', data);
    this.logger.debug(`Emitted complaint:new to room:complaints`);
  }
}
