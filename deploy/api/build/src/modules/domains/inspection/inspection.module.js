"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InspectionModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../platform/notification/notification.module");
const numbering_module_1 = require("../../../platform/numbering/numbering.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const inspection_checklist_template_service_1 = require("./inspection-checklist-template.service");
const inspection_finding_sla_scan_queue_service_1 = require("./inspection-finding-sla-scan-queue.service");
const inspection_finding_sla_scan_service_1 = require("./inspection-finding-sla-scan.service");
const inspection_finding_service_1 = require("./inspection-finding.service");
const inspection_numbering_bootstrap_service_1 = require("./inspection-numbering-bootstrap.service");
const inspection_record_generation_scan_queue_service_1 = require("./inspection-record-generation-scan-queue.service");
const inspection_record_generation_scan_service_1 = require("./inspection-record-generation-scan.service");
const inspection_record_overdue_scan_queue_service_1 = require("./inspection-record-overdue-scan-queue.service");
const inspection_record_overdue_scan_service_1 = require("./inspection-record-overdue-scan.service");
const inspection_record_controller_1 = require("./inspection-record.controller");
const inspection_record_service_1 = require("./inspection-record.service");
const inspection_schedule_service_1 = require("./inspection-schedule.service");
const inspection_score_service_1 = require("./inspection-score.service");
const inspection_type_service_1 = require("./inspection-type.service");
// Task 3.6 (Modul 08 Inspection Management) — modul DOMAIN KESEPULUH, TIDAK
// mengimpor domain module manapun. TIDAK ADA WorkflowEngineModule di imports
// — PRD §4 poin 9 "TIDAK WAJIB memakai Workflow Engine multi-stage",
// opsional/tenant-configurable sepenuhnya TIDAK diimplementasikan (gap
// TDD §26) — SATU-SATUNYA domain module Phase 2+ yang genuinely tanpa
// ketergantungan Workflow Engine sama sekali. 3 job cron baru
// (inspection-record-generation-scan 04:15, inspection-record-overdue-scan
// 04:30 BR-06, inspection-finding-sla-scan 04:45 BR-04) — konsumennya
// jalan di proses worker terpisah (lihat apps/worker/src/*.worker.ts +
// InspectionWorkerModule) — TIDAK didaftarkan DI SINI.
let InspectionModule = class InspectionModule {
};
exports.InspectionModule = InspectionModule;
exports.InspectionModule = InspectionModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, numbering_module_1.NumberingModule, notification_module_1.NotificationModule],
        controllers: [inspection_record_controller_1.InspectionRecordController],
        providers: [
            inspection_type_service_1.InspectionTypeService,
            inspection_checklist_template_service_1.InspectionChecklistTemplateService,
            inspection_numbering_bootstrap_service_1.InspectionNumberingBootstrapService,
            inspection_schedule_service_1.InspectionScheduleService,
            inspection_record_service_1.InspectionRecordService,
            inspection_finding_service_1.InspectionFindingService,
            inspection_score_service_1.InspectionScoreService,
            inspection_record_generation_scan_queue_service_1.InspectionRecordGenerationScanQueueService,
            inspection_record_generation_scan_service_1.InspectionRecordGenerationScanService,
            inspection_record_overdue_scan_queue_service_1.InspectionRecordOverdueScanQueueService,
            inspection_record_overdue_scan_service_1.InspectionRecordOverdueScanService,
            inspection_finding_sla_scan_queue_service_1.InspectionFindingSlaScanQueueService,
            inspection_finding_sla_scan_service_1.InspectionFindingSlaScanService,
        ],
        exports: [
            inspection_type_service_1.InspectionTypeService,
            inspection_checklist_template_service_1.InspectionChecklistTemplateService,
            inspection_schedule_service_1.InspectionScheduleService,
            inspection_record_service_1.InspectionRecordService,
            inspection_finding_service_1.InspectionFindingService,
            inspection_score_service_1.InspectionScoreService,
        ],
    })
], InspectionModule);
