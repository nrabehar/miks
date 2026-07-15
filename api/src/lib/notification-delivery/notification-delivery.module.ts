import { Global, Module } from '@nestjs/common';
import { NotificationDeliveryService } from './notification-delivery.service';

@Global()
@Module({
	providers: [NotificationDeliveryService],
	exports: [NotificationDeliveryService],
})
export class NotificationDeliveryModule {}
