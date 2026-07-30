import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { LicenseExpiryScanService } from "./license-expiry-scan.service";
import { ObligationDueScanService } from "./obligation-due-scan.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama DmsWorkerModule
// (2.1): TIDAK ada HTTP/guard/JWT, TIDAK ada *QueueService (producer, cuma
// dipakai sisi apps/api onApplicationBootstrap()) maupun
// ComplianceEvaluationWorkflowCompletionListener (reaksi ke actOnTask() yang
// jalan di apps/api, bukan konsep worker) — cuma 2 scan service yang
// genuinely dikonsumsi worker. NotificationModule (BUKAN
// NotificationWorkerModule) krn scan service ini PRODUCER notifikasi
// (enqueue()), bukan consumer delivery job.
@Module({
  imports: [TenancyModule, ObservabilityModule, NotificationModule],
  providers: [LicenseExpiryScanService, ObligationDueScanService],
  exports: [LicenseExpiryScanService, ObligationDueScanService],
})
export class RegulatoryComplianceWorkerModule {}
