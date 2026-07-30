import { Module } from "@nestjs/common";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { NotificationController } from "./notification.controller";
import { NotificationPreferenceService } from "./notification-preference.service";
import { NotificationQueryService } from "./notification-query.service";

// Task 1.7 — modul domain notification, SENGAJA dinamai
// "NotificationDomainModule" (bukan "NotificationModule" polos) supaya
// tidak collide dgn platform/notification/notification.module.ts
// (0.11, `NotificationModule` — enqueue()/delivery, kelas SEPENUHNYA
// berbeda). TIDAK mengimpor platform NotificationModule — query di sini
// langsung ke tabel `notifications`/`notification_preferences` lewat
// PrismaService (pola sama query-langsung-ke-tabel-platform yang dipakai
// berulang di codebase ini), tidak ada method relevan di NotificationService
// 0.11 (murni write-side) utk direuse.
@Module({
  imports: [TenancyModule],
  controllers: [NotificationController],
  providers: [NotificationQueryService, NotificationPreferenceService],
  exports: [NotificationQueryService, NotificationPreferenceService],
})
export class NotificationDomainModule {}
