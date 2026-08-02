"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronRunnerModule = void 0;
const common_1 = require("@nestjs/common");
const workflow_engine_worker_module_1 = require("../workflow-engine/workflow-engine-worker.module");
const audit_log_worker_module_1 = require("../audit-log/audit-log-worker.module");
const notification_module_1 = require("../notification/notification.module");
const attachment_module_1 = require("../attachment/attachment.module");
const organization_worker_module_1 = require("../../modules/domains/organization/organization-worker.module");
const user_role_worker_module_1 = require("../../modules/domains/user-role/user-role-worker.module");
const system_administration_worker_module_1 = require("../../modules/domains/system-administration/system-administration-worker.module");
const dms_worker_module_1 = require("../../modules/domains/dms/dms-worker.module");
const regulatory_compliance_worker_module_1 = require("../../modules/domains/regulatory-compliance/regulatory-compliance-worker.module");
const hira_jsa_hiradc_worker_module_1 = require("../../modules/domains/risk-management/hira-jsa-hiradc/hira-jsa-hiradc-worker.module");
const work_permit_worker_module_1 = require("../../modules/domains/work-permit/work-permit-worker.module");
const incident_worker_module_1 = require("../../modules/domains/incident/incident-worker.module");
const inspection_worker_module_1 = require("../../modules/domains/inspection/inspection-worker.module");
const emergency_response_worker_module_1 = require("../../modules/domains/emergency-response/emergency-response-worker.module");
const audit_worker_module_1 = require("../../modules/domains/audit/audit-worker.module");
const capa_worker_module_1 = require("../../modules/domains/capa/capa-worker.module");
const quality_worker_module_1 = require("../../modules/domains/quality/quality-worker.module");
const environmental_worker_module_1 = require("../../modules/domains/environmental/environmental-worker.module");
const occupational_health_worker_module_1 = require("../../modules/domains/occupational-health/occupational-health-worker.module");
const asset_equipment_worker_module_1 = require("../../modules/domains/asset-equipment/asset-equipment-worker.module");
const calibration_worker_module_1 = require("../../modules/domains/calibration/calibration-worker.module");
const contractor_worker_module_1 = require("../../modules/domains/contractor/contractor-worker.module");
const cron_runner_controller_1 = require("./cron-runner.controller");
// Shared-hosting adaptation (cPanel, REDIS_ENABLED=false) — pengganti 31
// BullMQ repeatable job (apps/worker) dgn SATU endpoint HTTP dipicu cPanel
// Cron Job (lihat cron-runner.controller.ts). Reuse langsung ke-20
// *WorkerModule yang SUDAH ada (masing-masing sudah export scan service-nya
// sendiri + dependency transitifnya, dipakai apps/worker/src/*.worker.ts) —
// TIDAK menduplikasi wiring DI, cuma mengimpor ulang modul yang sama ke
// proses apps/api yang sedang jalan (Nest men-dedupe provider yang sama
// otomatis, pola sama app.module.ts yang sudah mengimpor puluhan domain
// module bersamaan). NotificationWorkerModule/AttachmentWorkerModule
// SENGAJA tidak di sini — payload keduanya reaktif (dipicu event, bukan
// scan periodik), penggantinya endpoint poll terpisah (notification/
// attachment-scan/data-import "tick").
let CronRunnerModule = class CronRunnerModule {
};
exports.CronRunnerModule = CronRunnerModule;
exports.CronRunnerModule = CronRunnerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            workflow_engine_worker_module_1.WorkflowEngineWorkerModule,
            audit_log_worker_module_1.AuditLogWorkerModule,
            notification_module_1.NotificationModule,
            attachment_module_1.AttachmentModule,
            organization_worker_module_1.OrganizationWorkerModule,
            user_role_worker_module_1.UserRoleWorkerModule,
            system_administration_worker_module_1.SystemAdministrationWorkerModule,
            dms_worker_module_1.DmsWorkerModule,
            regulatory_compliance_worker_module_1.RegulatoryComplianceWorkerModule,
            hira_jsa_hiradc_worker_module_1.HiraJsaHiradcWorkerModule,
            work_permit_worker_module_1.WorkPermitWorkerModule,
            incident_worker_module_1.IncidentWorkerModule,
            inspection_worker_module_1.InspectionWorkerModule,
            emergency_response_worker_module_1.EmergencyResponseWorkerModule,
            audit_worker_module_1.AuditWorkerModule,
            capa_worker_module_1.CapaWorkerModule,
            quality_worker_module_1.QualityWorkerModule,
            environmental_worker_module_1.EnvironmentalWorkerModule,
            occupational_health_worker_module_1.OccupationalHealthWorkerModule,
            asset_equipment_worker_module_1.AssetEquipmentWorkerModule,
            calibration_worker_module_1.CalibrationWorkerModule,
            contractor_worker_module_1.ContractorWorkerModule,
        ],
        controllers: [cron_runner_controller_1.CronRunnerController],
    })
], CronRunnerModule);
//# sourceMappingURL=cron-runner.module.js.map