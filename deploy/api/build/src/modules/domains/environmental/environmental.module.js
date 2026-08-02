"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentalModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../platform/notification/notification.module");
const numbering_module_1 = require("../../../platform/numbering/numbering.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const workflow_engine_module_1 = require("../../../platform/workflow-engine/workflow-engine.module");
const environmental_aspect_impact_controller_1 = require("./environmental-aspect-impact.controller");
const environmental_aspect_impact_service_1 = require("./environmental-aspect-impact.service");
const environmental_aspect_review_workflow_completion_listener_1 = require("./environmental-aspect-review-workflow-completion.listener");
const environmental_monitoring_record_service_1 = require("./environmental-monitoring-record.service");
const environmental_permit_service_1 = require("./environmental-permit.service");
const environmental_workflow_bootstrap_service_1 = require("./environmental-workflow-bootstrap.service");
const proper_assessment_workflow_completion_listener_1 = require("./proper-assessment-workflow-completion.listener");
const proper_self_assessment_service_1 = require("./proper-self-assessment.service");
const waste_generation_log_service_1 = require("./waste-generation-log.service");
const waste_manifest_service_1 = require("./waste-manifest.service");
const waste_storage_duration_scan_queue_service_1 = require("./waste-storage-duration-scan-queue.service");
const waste_storage_duration_scan_service_1 = require("./waste-storage-duration-scan.service");
// Task 5.2 (Modul 12 Environmental Management), modul DOMAIN KETUJUH
// BELAS, Phase 5 lanjut. DUA workflow_definitions process TERPISAH
// (ENV_ASPECT_REVIEW 2-stage, ENV_PROPER_ASSESSMENT 2-stage — lihat
// banner comment EnvironmentalWorkflowBootstrapService). TIDAK mengimpor
// CapaModule maupun RegulatoryComplianceModule — CAPA-linkage
// (aspects_impacts/monitoring.capa_id) MANUAL via linkCapaRegister()
// KECUALI monitoring EXCEED (BR-02, PRD literal "otomatis") yang
// diwujudkan EVENT STUB (ENV_MONITORING_CAPA_REQUIRED_EVENT) dikonsumsi
// EnvironmentalMonitoringCapaTriggerListener yg hidup DI capa/ (arah
// dependency SEARAH: CapaModule mengimpor modul ini, bukan sebaliknya,
// pola sama Audit->CAPA 4.1/4.2). environmental_permits.license_permit_id
// (BR-05) divalidasi via query Prisma langsung ke licenses_permits, TIDAK
// butuh impor RegulatoryComplianceModule (Prisma schema shared resource).
// SATU job cron baru (waste-storage-duration-scan 06:30 BR-03) — KEDUA
// *QueueService (producer) DAN *ScanService (consumer) didaftarkan di sini
// SEKALIGUS di EnvironmentalWorkerModule (apps/worker) — pola PERSIS
// CapaModule 4.2 (`CapaRootCauseSlaScanService` juga dobel-didaftarkan):
// scan SERVICE-nya SENGAJA dobel bukan keliru — proses worker sungguhan
// butuh instance sendiri via NestFactory.createApplicationContext()
// (EnvironmentalWorkerModule), TAPI test/*.integration-spec.ts juga butuh
// meng-inject scanService.scan() LANGSUNG dari createTestApp() (modul
// AppModule penuh, TIDAK PERNAH boot EnvironmentalWorkerModule terpisah)
// utk menguji job tanpa menunggu cron sungguhan — TIDAK ada cara lain
// meng-inject provider dari modul yang tidak pernah di-boot test harness.
let EnvironmentalModule = class EnvironmentalModule {
};
exports.EnvironmentalModule = EnvironmentalModule;
exports.EnvironmentalModule = EnvironmentalModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, workflow_engine_module_1.WorkflowEngineModule, numbering_module_1.NumberingModule, notification_module_1.NotificationModule],
        controllers: [environmental_aspect_impact_controller_1.EnvironmentalAspectImpactController],
        providers: [
            environmental_workflow_bootstrap_service_1.EnvironmentalWorkflowBootstrapService,
            environmental_aspect_impact_service_1.EnvironmentalAspectImpactService,
            environmental_aspect_review_workflow_completion_listener_1.EnvironmentalAspectReviewWorkflowCompletionListener,
            environmental_monitoring_record_service_1.EnvironmentalMonitoringRecordService,
            waste_generation_log_service_1.WasteGenerationLogService,
            waste_manifest_service_1.WasteManifestService,
            waste_storage_duration_scan_queue_service_1.WasteStorageDurationScanQueueService,
            waste_storage_duration_scan_service_1.WasteStorageDurationScanService,
            proper_self_assessment_service_1.ProperSelfAssessmentService,
            proper_assessment_workflow_completion_listener_1.ProperAssessmentWorkflowCompletionListener,
            environmental_permit_service_1.EnvironmentalPermitService,
        ],
        exports: [
            environmental_aspect_impact_service_1.EnvironmentalAspectImpactService,
            environmental_monitoring_record_service_1.EnvironmentalMonitoringRecordService,
            waste_generation_log_service_1.WasteGenerationLogService,
            waste_manifest_service_1.WasteManifestService,
            proper_self_assessment_service_1.ProperSelfAssessmentService,
            environmental_permit_service_1.EnvironmentalPermitService,
        ],
    })
], EnvironmentalModule);
