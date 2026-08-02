"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetEquipmentModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../platform/notification/notification.module");
const numbering_module_1 = require("../../../platform/numbering/numbering.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const workflow_engine_module_1 = require("../../../platform/workflow-engine/workflow-engine.module");
const asset_category_service_1 = require("./asset-category.service");
const asset_disposal_workflow_completion_listener_1 = require("./asset-disposal-workflow-completion.listener");
const asset_transfer_service_1 = require("./asset-transfer.service");
const asset_controller_1 = require("./asset.controller");
const asset_service_1 = require("./asset.service");
const maintenance_due_scan_queue_service_1 = require("./maintenance-due-scan-queue.service");
const maintenance_due_scan_service_1 = require("./maintenance-due-scan.service");
const maintenance_record_service_1 = require("./maintenance-record.service");
const maintenance_schedule_service_1 = require("./maintenance-schedule.service");
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
let AssetEquipmentModule = class AssetEquipmentModule {
};
exports.AssetEquipmentModule = AssetEquipmentModule;
exports.AssetEquipmentModule = AssetEquipmentModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, workflow_engine_module_1.WorkflowEngineModule, numbering_module_1.NumberingModule, notification_module_1.NotificationModule],
        controllers: [asset_controller_1.AssetController],
        providers: [
            asset_category_service_1.AssetCategoryService,
            asset_service_1.AssetService,
            maintenance_schedule_service_1.MaintenanceScheduleService,
            maintenance_record_service_1.MaintenanceRecordService,
            asset_transfer_service_1.AssetTransferService,
            asset_disposal_workflow_completion_listener_1.AssetDisposalWorkflowCompletionListener,
            maintenance_due_scan_queue_service_1.MaintenanceDueScanQueueService,
            maintenance_due_scan_service_1.MaintenanceDueScanService,
        ],
        exports: [asset_category_service_1.AssetCategoryService, asset_service_1.AssetService, maintenance_schedule_service_1.MaintenanceScheduleService, maintenance_record_service_1.MaintenanceRecordService, asset_transfer_service_1.AssetTransferService],
    })
], AssetEquipmentModule);
