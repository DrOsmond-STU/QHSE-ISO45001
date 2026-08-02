"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyResponseModule = void 0;
const common_1 = require("@nestjs/common");
const notification_module_1 = require("../../../platform/notification/notification.module");
const numbering_module_1 = require("../../../platform/numbering/numbering.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const workflow_engine_module_1 = require("../../../platform/workflow-engine/workflow-engine.module");
const emergency_activation_service_1 = require("./emergency-activation.service");
const emergency_contact_service_1 = require("./emergency-contact.service");
const emergency_drill_service_1 = require("./emergency-drill.service");
const emergency_equipment_readiness_checklist_service_1 = require("./emergency-equipment-readiness-checklist.service");
const emergency_muster_point_service_1 = require("./emergency-muster-point.service");
const emergency_plan_review_overdue_scan_queue_service_1 = require("./emergency-plan-review-overdue-scan-queue.service");
const emergency_plan_review_overdue_scan_service_1 = require("./emergency-plan-review-overdue-scan.service");
const emergency_response_plan_controller_1 = require("./emergency-response-plan.controller");
const emergency_response_plan_service_1 = require("./emergency-response-plan.service");
const emergency_response_team_service_1 = require("./emergency-response-team.service");
const emergency_response_workflow_bootstrap_service_1 = require("./emergency-response-workflow-bootstrap.service");
const emergency_response_workflow_completion_listener_1 = require("./emergency-response-workflow-completion.listener");
const muster_point_checkin_service_1 = require("./muster-point-checkin.service");
// Task 3.7 (Modul 14 Emergency Response) — modul DOMAIN KESEBELAS.
// Mereferensikan documents (Modul 03)/incident_reports (Modul 07) via FK
// Prisma LANGSUNG (TIDAK mengimpor DmsModule/IncidentModule). SATU-SATUNYA
// modul Phase 2+ SELAIN Inspection (3.6) yang punya `assetId` bare UUID
// TANPA FK meski NOT NULL (Modul 15 belum ada, lihat banner comment
// emergency-equipment-readiness-checklist.service.ts). 1 job cron baru
// (emergency-plan-review-overdue-scan BR-01, 05:00) — konsumennya jalan
// di proses worker terpisah (lihat apps/worker/src/*.worker.ts +
// EmergencyResponseWorkerModule) — TIDAK didaftarkan DI SINI.
let EmergencyResponseModule = class EmergencyResponseModule {
};
exports.EmergencyResponseModule = EmergencyResponseModule;
exports.EmergencyResponseModule = EmergencyResponseModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, workflow_engine_module_1.WorkflowEngineModule, numbering_module_1.NumberingModule, notification_module_1.NotificationModule],
        controllers: [emergency_response_plan_controller_1.EmergencyResponsePlanController],
        providers: [
            emergency_response_workflow_bootstrap_service_1.EmergencyResponseWorkflowBootstrapService,
            emergency_response_plan_service_1.EmergencyResponsePlanService,
            emergency_muster_point_service_1.EmergencyMusterPointService,
            emergency_contact_service_1.EmergencyContactService,
            emergency_response_workflow_completion_listener_1.EmergencyResponseWorkflowCompletionListener,
            emergency_response_team_service_1.EmergencyResponseTeamService,
            emergency_drill_service_1.EmergencyDrillService,
            emergency_activation_service_1.EmergencyActivationService,
            muster_point_checkin_service_1.MusterPointCheckinService,
            emergency_equipment_readiness_checklist_service_1.EmergencyEquipmentReadinessChecklistService,
            emergency_plan_review_overdue_scan_queue_service_1.EmergencyPlanReviewOverdueScanQueueService,
            emergency_plan_review_overdue_scan_service_1.EmergencyPlanReviewOverdueScanService,
        ],
        exports: [
            emergency_response_plan_service_1.EmergencyResponsePlanService,
            emergency_muster_point_service_1.EmergencyMusterPointService,
            emergency_contact_service_1.EmergencyContactService,
            emergency_response_team_service_1.EmergencyResponseTeamService,
            emergency_drill_service_1.EmergencyDrillService,
            emergency_activation_service_1.EmergencyActivationService,
            muster_point_checkin_service_1.MusterPointCheckinService,
            emergency_equipment_readiness_checklist_service_1.EmergencyEquipmentReadinessChecklistService,
        ],
    })
], EmergencyResponseModule);
//# sourceMappingURL=emergency-response.module.js.map