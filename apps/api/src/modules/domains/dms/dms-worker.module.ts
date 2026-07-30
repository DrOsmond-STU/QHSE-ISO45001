import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { DocumentReviewScanService } from "./document-review-scan.service";
import { ReadAcknowledgementScanService } from "./read-acknowledgement-scan.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// SystemAdministrationWorkerModule (1.5)/OrganizationWorkerModule (1.1):
// TIDAK ada HTTP/guard/JWT, TIDAK ada *QueueService (producer, cuma dipakai
// sisi apps/api onApplicationBootstrap()) maupun
// DocumentWorkflowCompletionListener (reaksi ke actOnTask() yang jalan di
// apps/api, bukan konsep worker) — cuma 2 scan service yang genuinely
// dikonsumsi worker. NotificationModule (BUKAN NotificationWorkerModule)
// diimpor krn scan service ini PRODUCER notifikasi (enqueue()), bukan
// consumer delivery job — lihat banner comment NotificationWorkerModule
// kenapa keduanya beda.
@Module({
  imports: [TenancyModule, ObservabilityModule, NotificationModule],
  providers: [DocumentReviewScanService, ReadAcknowledgementScanService],
  exports: [DocumentReviewScanService, ReadAcknowledgementScanService],
})
export class DmsWorkerModule {}
