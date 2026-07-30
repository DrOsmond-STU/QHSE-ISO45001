import { Module } from "@nestjs/common";
import { AuditLogModule } from "../../../platform/audit-log/audit-log.module";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { NumberingModule } from "../../../platform/numbering/numbering.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { WorkflowEngineModule } from "../../../platform/workflow-engine/workflow-engine.module";
import { CalibrationCertificateReviewCompletionListener } from "./calibration-certificate-review-completion.listener";
import { CalibrationCertificateService } from "./calibration-certificate.service";
import { CalibrationDueScanQueueService } from "./calibration-due-scan-queue.service";
import { CalibrationDueScanService } from "./calibration-due-scan.service";
import { CalibrationItemAssetSiteSyncListener } from "./calibration-item-asset-site-sync.listener";
import { CalibrationItemService } from "./calibration-item.service";
import { CalibrationProviderService } from "./calibration-provider.service";
import { CalibrationScheduleService } from "./calibration-schedule.service";
import { OutOfToleranceRecordService } from "./out-of-tolerance-record.service";

// Task 6.2 (Modul 16 Calibration Management), modul DOMAIN KEDUA PULUH.
// "bergantung penuh" (PRD §1 literal) pada Asset & Equipment Management
// (6.1, LEBIH TUA) — TIDAK mengimpor AssetEquipmentModule (tidak butuh
// service-nya, hanya baca tabel assets langsung via withRls() spt modul
// "fondasi data" lain, mis. Regulatory Compliance 2.2 utk licenses_permits),
// KECUALI import TIPE EVENT dari asset-transfer.service.ts (BR-08 listener,
// arah SEARAH Modul 15->16, lihat banner comment file itu). SATU workflow
// (calibration_certificate review, §4.1 poin 6, bootstrap privat di
// CalibrationCertificateService — pola sama AssetTransferService disposal
// 6.1, BUKAN file bootstrap terpisah krn hanya 1 workflow). SATU job cron
// baru (calibration-due-scan 07:00, PRD §8 baris 1/2/5 + BR-09 digabung
// satu scan pass) — KEDUA *QueueService (producer) DAN *ScanService
// (consumer) didaftarkan di sini SEKALIGUS di CalibrationWorkerModule
// (apps/worker), pola PERSIS seluruh modul sejak CAPA 4.2 (createTestApp()
// tidak pernah boot modul worker terpisah, test app.get(ScanService) butuh
// provider itu ada di modul API juga).
@Module({
  imports: [TenancyModule, ObservabilityModule, WorkflowEngineModule, NumberingModule, NotificationModule, AuditLogModule],
  providers: [
    CalibrationItemService,
    CalibrationProviderService,
    CalibrationScheduleService,
    CalibrationCertificateService,
    OutOfToleranceRecordService,
    CalibrationCertificateReviewCompletionListener,
    CalibrationItemAssetSiteSyncListener,
    CalibrationDueScanQueueService,
    CalibrationDueScanService,
  ],
  exports: [CalibrationItemService, CalibrationProviderService, CalibrationScheduleService, CalibrationCertificateService, OutOfToleranceRecordService],
})
export class CalibrationModule {}
