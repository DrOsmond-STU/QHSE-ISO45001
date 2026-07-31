import { Module } from "@nestjs/common";
import { WorkflowEngineWorkerModule } from "../workflow-engine/workflow-engine-worker.module";
import { AuditLogWorkerModule } from "../audit-log/audit-log-worker.module";
import { NotificationModule } from "../notification/notification.module";
import { AttachmentModule } from "../attachment/attachment.module";
import { OrganizationWorkerModule } from "../../modules/domains/organization/organization-worker.module";
import { UserRoleWorkerModule } from "../../modules/domains/user-role/user-role-worker.module";
import { SystemAdministrationWorkerModule } from "../../modules/domains/system-administration/system-administration-worker.module";
import { DmsWorkerModule } from "../../modules/domains/dms/dms-worker.module";
import { RegulatoryComplianceWorkerModule } from "../../modules/domains/regulatory-compliance/regulatory-compliance-worker.module";
import { HiraJsaHiradcWorkerModule } from "../../modules/domains/risk-management/hira-jsa-hiradc/hira-jsa-hiradc-worker.module";
import { WorkPermitWorkerModule } from "../../modules/domains/work-permit/work-permit-worker.module";
import { IncidentWorkerModule } from "../../modules/domains/incident/incident-worker.module";
import { InspectionWorkerModule } from "../../modules/domains/inspection/inspection-worker.module";
import { EmergencyResponseWorkerModule } from "../../modules/domains/emergency-response/emergency-response-worker.module";
import { AuditWorkerModule } from "../../modules/domains/audit/audit-worker.module";
import { CapaWorkerModule } from "../../modules/domains/capa/capa-worker.module";
import { QualityWorkerModule } from "../../modules/domains/quality/quality-worker.module";
import { EnvironmentalWorkerModule } from "../../modules/domains/environmental/environmental-worker.module";
import { OccupationalHealthWorkerModule } from "../../modules/domains/occupational-health/occupational-health-worker.module";
import { AssetEquipmentWorkerModule } from "../../modules/domains/asset-equipment/asset-equipment-worker.module";
import { CalibrationWorkerModule } from "../../modules/domains/calibration/calibration-worker.module";
import { ContractorWorkerModule } from "../../modules/domains/contractor/contractor-worker.module";
import { CronRunnerController } from "./cron-runner.controller";

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
@Module({
  imports: [
    WorkflowEngineWorkerModule,
    AuditLogWorkerModule,
    NotificationModule,
    AttachmentModule,
    OrganizationWorkerModule,
    UserRoleWorkerModule,
    SystemAdministrationWorkerModule,
    DmsWorkerModule,
    RegulatoryComplianceWorkerModule,
    HiraJsaHiradcWorkerModule,
    WorkPermitWorkerModule,
    IncidentWorkerModule,
    InspectionWorkerModule,
    EmergencyResponseWorkerModule,
    AuditWorkerModule,
    CapaWorkerModule,
    QualityWorkerModule,
    EnvironmentalWorkerModule,
    OccupationalHealthWorkerModule,
    AssetEquipmentWorkerModule,
    CalibrationWorkerModule,
    ContractorWorkerModule,
  ],
  controllers: [CronRunnerController],
})
export class CronRunnerModule {}
