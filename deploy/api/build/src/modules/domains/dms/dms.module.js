"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DmsModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../platform/notification/notification.module");
const numbering_module_1 = require("../../../platform/numbering/numbering.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const workflow_engine_module_1 = require("../../../platform/workflow-engine/workflow-engine.module");
const dms_bootstrap_service_1 = require("./dms-bootstrap.service");
const document_controller_1 = require("./document.controller");
const document_category_service_1 = require("./document-category.service");
const document_distribution_service_1 = require("./document-distribution.service");
const document_review_scan_queue_service_1 = require("./document-review-scan-queue.service");
const document_review_scan_service_1 = require("./document-review-scan.service");
const document_review_schedule_service_1 = require("./document-review-schedule.service");
const document_service_1 = require("./document.service");
const document_version_service_1 = require("./document-version.service");
const document_workflow_completion_listener_1 = require("./document-workflow-completion.listener");
const read_acknowledgement_scan_queue_service_1 = require("./read-acknowledgement-scan-queue.service");
const read_acknowledgement_scan_service_1 = require("./read-acknowledgement-scan.service");
const read_acknowledgement_service_1 = require("./read-acknowledgement.service");
// Task 2.1 (Modul 03) — modul DOMAIN KELIMA. BELUM ada controller HTTP
// (pola sama 1.1-1.6 modul tanpa deliverable apps/web — task ini TIDAK
// disebut apps/web di Files-nya, beda dari 1.7) — seluruh service dites
// LANGSUNG (integration test), dms.* permission sudah di-seed RBAC
// baseline siap digerbangi @RequirePermission begitu ada endpoint.
// WorkflowEngineModule diimpor utk WorkflowEngineService (submit approval)
// — DocumentWorkflowCompletionListener mendengar WORKFLOW_INSTANCE_COMPLETED_EVENT
// (EventEmitter2 GLOBAL singleton, 0.8) yang di-emit WorkflowEngineService
// itu SENDIRI, bekerja terlepas dari modul mana yang "memiliki" listener
// vs emitter selama keduanya ada di application context yang sama.
// NumberingModule diimpor utk NumberingService (DocumentService.createDocument,
// BR-01 document_number) — task 2.1 KONSUMEN PRODUKSI PERTAMA generateNext().
let DmsModule = class DmsModule {
};
exports.DmsModule = DmsModule;
exports.DmsModule = DmsModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, workflow_engine_module_1.WorkflowEngineModule, numbering_module_1.NumberingModule, notification_module_1.NotificationModule],
        controllers: [document_controller_1.DocumentController],
        providers: [
            dms_bootstrap_service_1.DmsBootstrapService,
            document_category_service_1.DocumentCategoryService,
            document_service_1.DocumentService,
            document_version_service_1.DocumentVersionService,
            document_workflow_completion_listener_1.DocumentWorkflowCompletionListener,
            document_distribution_service_1.DocumentDistributionService,
            read_acknowledgement_service_1.ReadAcknowledgementService,
            document_review_schedule_service_1.DocumentReviewScheduleService,
            document_review_scan_queue_service_1.DocumentReviewScanQueueService,
            document_review_scan_service_1.DocumentReviewScanService,
            read_acknowledgement_scan_queue_service_1.ReadAcknowledgementScanQueueService,
            read_acknowledgement_scan_service_1.ReadAcknowledgementScanService,
        ],
        exports: [
            document_category_service_1.DocumentCategoryService,
            document_service_1.DocumentService,
            document_version_service_1.DocumentVersionService,
            document_distribution_service_1.DocumentDistributionService,
            read_acknowledgement_service_1.ReadAcknowledgementService,
            document_review_schedule_service_1.DocumentReviewScheduleService,
        ],
    })
], DmsModule);
