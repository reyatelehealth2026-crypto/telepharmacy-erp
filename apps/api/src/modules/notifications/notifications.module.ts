import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationSenderService, NOTIFICATION_QUEUE } from './notification-sender.service';
import { NotificationProcessor } from './notification.processor';
import { DatabaseModule } from '../../database/database.module';
import { LineModule } from '../line/line.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
    forwardRef(() => LineModule),
  ],
  providers: [NotificationsService, NotificationSenderService, NotificationProcessor],
  controllers: [NotificationsController],
  exports: [NotificationsService, NotificationSenderService],
})
export class NotificationsModule {}
