import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { NotificationDeliveryService } from "./notification-delivery.service";
import { NOTIFICATION_PROVIDER } from "./notification-provider.interface";
import { StubNotificationProvider } from "./stub-notification.provider";

// Modul SLIM khusus proses worker (apps/worker) — TIDAK ada HTTP/guard/JWT,
// cuma yang genuinely dibutuhkan NotificationDeliveryService. TIDAK
// termasuk NotificationQueueService (producer BullMQ, cuma dipakai sisi
// apps/api enqueue()) — worker CUMA konsumen job, tidak pernah bikin job
// baru. Pola sama persis workflow-engine-worker.module.ts (task 0.9).
@Module({
  imports: [TenancyModule],
  providers: [
    StubNotificationProvider,
    { provide: NOTIFICATION_PROVIDER, useExisting: StubNotificationProvider },
    NotificationDeliveryService,
  ],
  exports: [NotificationDeliveryService],
})
export class NotificationWorkerModule {}
