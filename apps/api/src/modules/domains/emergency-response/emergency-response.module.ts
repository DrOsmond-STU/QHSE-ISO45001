import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { NumberingModule } from "../../../platform/numbering/numbering.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { WorkflowEngineModule } from "../../../platform/workflow-engine/workflow-engine.module";
import { EmergencyActivationService } from "./emergency-activation.service";
import { EmergencyContactService } from "./emergency-contact.service";
import { EmergencyDrillService } from "./emergency-drill.service";
import { EmergencyEquipmentReadinessChecklistService } from "./emergency-equipment-readiness-checklist.service";
import { EmergencyMusterPointService } from "./emergency-muster-point.service";
import { EmergencyPlanReviewOverdueScanQueueService } from "./emergency-plan-review-overdue-scan-queue.service";
import { EmergencyPlanReviewOverdueScanService } from "./emergency-plan-review-overdue-scan.service";
import { EmergencyResponsePlanController } from "./emergency-response-plan.controller";
import { EmergencyResponsePlanService } from "./emergency-response-plan.service";
import { EmergencyResponseTeamService } from "./emergency-response-team.service";
import { EmergencyResponseWorkflowBootstrapService } from "./emergency-response-workflow-bootstrap.service";
import { EmergencyResponseWorkflowCompletionListener } from "./emergency-response-workflow-completion.listener";
import { MusterPointCheckinService } from "./muster-point-checkin.service";

// Task 3.7 (Modul 14 Emergency Response) — modul DOMAIN KESEBELAS.
// Mereferensikan documents (Modul 03)/incident_reports (Modul 07) via FK
// Prisma LANGSUNG (TIDAK mengimpor DmsModule/IncidentModule). SATU-SATUNYA
// modul Phase 2+ SELAIN Inspection (3.6) yang punya `assetId` bare UUID
// TANPA FK meski NOT NULL (Modul 15 belum ada, lihat banner comment
// emergency-equipment-readiness-checklist.service.ts). 1 job cron baru
// (emergency-plan-review-overdue-scan BR-01, 05:00) — konsumennya jalan
// di proses worker terpisah (lihat apps/worker/src/*.worker.ts +
// EmergencyResponseWorkerModule) — TIDAK didaftarkan DI SINI.
@Module({
  imports: [TenancyModule, ObservabilityModule, WorkflowEngineModule, NumberingModule, NotificationModule],
  controllers: [EmergencyResponsePlanController],
  providers: [
    EmergencyResponseWorkflowBootstrapService,
    EmergencyResponsePlanService,
    EmergencyMusterPointService,
    EmergencyContactService,
    EmergencyResponseWorkflowCompletionListener,
    EmergencyResponseTeamService,
    EmergencyDrillService,
    EmergencyActivationService,
    MusterPointCheckinService,
    EmergencyEquipmentReadinessChecklistService,
    EmergencyPlanReviewOverdueScanQueueService,
    EmergencyPlanReviewOverdueScanService,
  ],
  exports: [
    EmergencyResponsePlanService,
    EmergencyMusterPointService,
    EmergencyContactService,
    EmergencyResponseTeamService,
    EmergencyDrillService,
    EmergencyActivationService,
    MusterPointCheckinService,
    EmergencyEquipmentReadinessChecklistService,
  ],
})
export class EmergencyResponseModule {}
