import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { NumberingModule } from "../../../platform/numbering/numbering.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { WorkflowEngineModule } from "../../../platform/workflow-engine/workflow-engine.module";
import { AssetCategoryService } from "./asset-category.service";
import { AssetDisposalWorkflowCompletionListener } from "./asset-disposal-workflow-completion.listener";
import { AssetTransferService } from "./asset-transfer.service";
import { AssetController } from "./asset.controller";
import { AssetService } from "./asset.service";
import { MaintenanceDueScanQueueService } from "./maintenance-due-scan-queue.service";
import { MaintenanceDueScanService } from "./maintenance-due-scan.service";
import { MaintenanceRecordService } from "./maintenance-record.service";
import { MaintenanceScheduleService } from "./maintenance-schedule.service";

// Task 6.1 (Modul 15 Asset & Equipment Management), modul DOMAIN
// KESEMBILAN BELAS, Phase 6 dimulai. TIDAK mengimpor modul domain lain
// (Modul 16 Calibration/Modul 14 Emergency Response/Modul 08 Inspection
// SEMUA merujuk BALIK ke modul ini via bare-UUID/FK opsional, arah
// dependency SEARAH — pola sama modul "fondasi data" lain sesi ini spt
// Regulatory Compliance 2.2 utk licenses_permits). TIDAK menggunakan
// Workflow Engine utk pendaftaran aset dasar (PRD §4 eksplisit) — HANYA
// disposal aset berkategori requires_disposal_approval (BR-03, workflow
// ASSET_DISPOSAL 1-stage, PERTAMA KALI sesi ini Workflow Engine dipicu
// KONDISIONAL PER-BARIS bukan per-tenant/module_code, lihat banner comment
// AssetTransferService). SATU job cron baru (maintenance-due-scan 06:45,
// PRD §8 baris 1-2 digabung satu scan pass) — KEDUA *QueueService (producer)
// DAN *ScanService (consumer) didaftarkan di sini SEKALIGUS di
// AssetEquipmentWorkerModule (apps/worker), pola PERSIS seluruh modul sejak
// CAPA 4.2 (createTestApp() tidak pernah boot modul worker terpisah,
// app.get(ScanService) test butuh provider itu ada di modul API juga).
@Module({
  imports: [TenancyModule, ObservabilityModule, WorkflowEngineModule, NumberingModule, NotificationModule],
  controllers: [AssetController],
  providers: [
    AssetCategoryService,
    AssetService,
    MaintenanceScheduleService,
    MaintenanceRecordService,
    AssetTransferService,
    AssetDisposalWorkflowCompletionListener,
    MaintenanceDueScanQueueService,
    MaintenanceDueScanService,
  ],
  exports: [AssetCategoryService, AssetService, MaintenanceScheduleService, MaintenanceRecordService, AssetTransferService],
})
export class AssetEquipmentModule {}
