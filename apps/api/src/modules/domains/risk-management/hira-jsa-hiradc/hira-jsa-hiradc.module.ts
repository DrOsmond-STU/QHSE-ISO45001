import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../../platform/notification/notification.module";
import { NumberingModule } from "../../../../platform/numbering/numbering.module";
import { ObservabilityModule } from "../../../../platform/observability/observability.module";
import { TenancyModule } from "../../../../platform/tenancy/tenancy.module";
import { WorkflowEngineModule } from "../../../../platform/workflow-engine/workflow-engine.module";
import { HiraAssessmentService } from "./hira-assessment.service";
import { HiraReviewDueScanQueueService } from "./hira-review-due-scan-queue.service";
import { HiraReviewDueScanService } from "./hira-review-due-scan.service";
import { HiraWorkflowCompletionListener } from "./hira-workflow-completion.listener";
import { HiradcExpiryScanQueueService } from "./hiradc-expiry-scan-queue.service";
import { HiradcExpiryScanService } from "./hiradc-expiry-scan.service";
import { HiradcRecordService } from "./hiradc-record.service";
import { HiradcWorkflowCompletionListener } from "./hiradc-workflow-completion.listener";
import { JsaRecordService } from "./jsa-record.service";
import { JsaWorkflowCompletionListener } from "./jsa-workflow-completion.listener";
import { RiskRegisterReviewScanQueueService } from "./risk-register-review-scan-queue.service";
import { RiskRegisterReviewScanService } from "./risk-register-review-scan.service";
import { RiskRegisterService } from "./risk-register.service";
import { RiskTreatmentPlanService } from "./risk-treatment-plan.service";
import { RiskWorkflowBootstrapService } from "./risk-workflow-bootstrap.service";

// Task 3.2 (Modul 05 sisa) — submodul SAUDARA RiskMatrixModule (task 3.1)
// di bawah domain risk-management/ yang SAMA (BUKAN modul domain baru
// terpisah — Modul 05 PRD yang sama, sengaja dipecah 2 task/2 file modul
// krn cakupannya besar). TIDAK impor RiskMatrixModule — akses lintas
// submodul (HazardRegisterService.retire() baca hira_hazard_lines/dst,
// service di sini baca risk_matrix_cells) SELALU lewat query Prisma
// LANGSUNG (pola sama lintas-modul-domain lain codebase ini, mis.
// EntitlementCheckService), BUKAN inject service submodul lain — nol
// coupling NestJS DI antara risk-management/matrix dan
// risk-management/hira-jsa-hiradc.
//
// NumberingModule DIINGAT eksplisit (gap 2.1 task 86 TIDAK diulang lagi —
// task 2.2 juga sudah menghindarinya, sekarang task ketiga berturut-turut
// yang eksplisit mengecek ini SEBELUM test pertama jalan).
@Module({
  imports: [TenancyModule, ObservabilityModule, WorkflowEngineModule, NumberingModule, NotificationModule],
  providers: [
    RiskWorkflowBootstrapService,
    HiraAssessmentService,
    HiraWorkflowCompletionListener,
    JsaRecordService,
    JsaWorkflowCompletionListener,
    HiradcRecordService,
    HiradcWorkflowCompletionListener,
    RiskRegisterService,
    RiskTreatmentPlanService,
    HiradcExpiryScanQueueService,
    HiradcExpiryScanService,
    RiskRegisterReviewScanQueueService,
    RiskRegisterReviewScanService,
    HiraReviewDueScanQueueService,
    HiraReviewDueScanService,
  ],
  exports: [HiraAssessmentService, JsaRecordService, HiradcRecordService, RiskRegisterService, RiskTreatmentPlanService],
})
export class HiraJsaHiradcModule {}
