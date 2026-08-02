"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalibrationModule = void 0;
const common_1 = require("@nestjs/common");
const audit_log_module_1 = require("../../../platform/audit-log/audit-log.module");
const notification_module_1 = require("../../../platform/notification/notification.module");
const numbering_module_1 = require("../../../platform/numbering/numbering.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const workflow_engine_module_1 = require("../../../platform/workflow-engine/workflow-engine.module");
const calibration_certificate_review_completion_listener_1 = require("./calibration-certificate-review-completion.listener");
const calibration_certificate_service_1 = require("./calibration-certificate.service");
const calibration_due_scan_queue_service_1 = require("./calibration-due-scan-queue.service");
const calibration_due_scan_service_1 = require("./calibration-due-scan.service");
const calibration_item_asset_site_sync_listener_1 = require("./calibration-item-asset-site-sync.listener");
const calibration_item_controller_1 = require("./calibration-item.controller");
const calibration_item_service_1 = require("./calibration-item.service");
const calibration_provider_service_1 = require("./calibration-provider.service");
const calibration_schedule_service_1 = require("./calibration-schedule.service");
const out_of_tolerance_record_service_1 = require("./out-of-tolerance-record.service");
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
let CalibrationModule = class CalibrationModule {
};
exports.CalibrationModule = CalibrationModule;
exports.CalibrationModule = CalibrationModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, workflow_engine_module_1.WorkflowEngineModule, numbering_module_1.NumberingModule, notification_module_1.NotificationModule, audit_log_module_1.AuditLogModule],
        controllers: [calibration_item_controller_1.CalibrationItemController],
        providers: [
            calibration_item_service_1.CalibrationItemService,
            calibration_provider_service_1.CalibrationProviderService,
            calibration_schedule_service_1.CalibrationScheduleService,
            calibration_certificate_service_1.CalibrationCertificateService,
            out_of_tolerance_record_service_1.OutOfToleranceRecordService,
            calibration_certificate_review_completion_listener_1.CalibrationCertificateReviewCompletionListener,
            calibration_item_asset_site_sync_listener_1.CalibrationItemAssetSiteSyncListener,
            calibration_due_scan_queue_service_1.CalibrationDueScanQueueService,
            calibration_due_scan_service_1.CalibrationDueScanService,
        ],
        exports: [calibration_item_service_1.CalibrationItemService, calibration_provider_service_1.CalibrationProviderService, calibration_schedule_service_1.CalibrationScheduleService, calibration_certificate_service_1.CalibrationCertificateService, out_of_tolerance_record_service_1.OutOfToleranceRecordService],
    })
], CalibrationModule);
