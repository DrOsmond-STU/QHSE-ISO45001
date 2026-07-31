import { Module } from "@nestjs/common";
import { ObservabilityModule } from "../observability/observability.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { NotificationDeliveryService } from "./notification-delivery.service";
import { NotificationPollService } from "./notification-poll.service";
import { NOTIFICATION_PROVIDER } from "./notification-provider.interface";
import { NotificationQueueService } from "./notification-queue.service";
import { NotificationService } from "./notification.service";
import { StubNotificationProvider } from "./stub-notification.provider";

@Module({
  imports: [TenancyModule, ObservabilityModule],
  providers: [
    StubNotificationProvider,
    { provide: NOTIFICATION_PROVIDER, useExisting: StubNotificationProvider },
    NotificationQueueService,
    NotificationService,
    // Diekspor juga di sini (bukan cuma NotificationWorkerModule) supaya
    // test integration apps/api bisa panggil processDeliveryJob() langsung
    // tanpa boot proses worker terpisah — lihat test/notification/.
    NotificationDeliveryService,
    // Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti
    // notification.worker.ts, dipicu CronRunnerController (lihat banner
    // comment notification-poll.service.ts).
    NotificationPollService,
  ],
  exports: [NotificationService, NotificationDeliveryService, NotificationPollService],
})
export class NotificationModule {}
