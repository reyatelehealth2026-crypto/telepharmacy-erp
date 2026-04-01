import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ComplaintsService, NOTIFICATION_SENDER } from './complaints.service';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsStaffController } from './complaints-staff.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationSenderService } from '../notifications/notification-sender.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [DatabaseModule, NotificationsModule, EventsModule],
  providers: [
    ComplaintsService,
    {
      provide: NOTIFICATION_SENDER,
      useExisting: NotificationSenderService,
    },
  ],
  controllers: [ComplaintsController, ComplaintsStaffController],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
