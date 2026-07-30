import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { NumberingModule } from "../../../platform/numbering/numbering.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { WorkflowEngineModule } from "../../../platform/workflow-engine/workflow-engine.module";
import { CustomerComplaintService } from "./customer-complaint.service";
import { CustomerComplaintWorkflowCompletionListener } from "./customer-complaint-workflow-completion.listener";
import { NcrRecordService } from "./ncr-record.service";
import { NcrWorkflowCompletionListener } from "./ncr-workflow-completion.listener";
import { QualityComplaintResponseSlaScanQueueService } from "./quality-complaint-response-sla-scan-queue.service";
import { QualityComplaintResponseSlaScanService } from "./quality-complaint-response-sla-scan.service";
import { QualityInspectionService } from "./quality-inspection.service";
import { QualityObjectiveService } from "./quality-objective.service";
import { QualityWorkflowBootstrapService } from "./quality-workflow-bootstrap.service";
import { SupplierEvalWorkflowCompletionListener } from "./supplier-eval-workflow-completion.listener";
import { SupplierQualityRecordService } from "./supplier-quality-record.service";

// Task 5.1 (Modul 11 Quality Management), modul DOMAIN KELIMA BELAS, awal
// Phase 5. PERTAMA modul domain dgn EMPAT workflow_definitions process
// sekaligus (QUALITY_NCR 3-stage, QUALITY_COMPLAINT 3-stage,
// QUALITY_INSPECTION_DEVIATION 1-stage, QUALITY_SUPPLIER_EVAL 1-stage —
// lihat banner comment QualityWorkflowBootstrapService). TIDAK mengimpor
// CapaModule — BEDA dari Audit 4.1 (auto-trigger CAPA), CAPA-linkage
// modul ini SELURUHNYA MANUAL (linkCapaRegister() terima capaRegisterId
// caller-supplied, pola sama Incident 3.5), lihat banner comment
// NcrRecordService soal alasan TASK_INSTRUCTION.md acceptance 5.1 "NCR
// DAPAT memicu CAPA" dibaca lebih lunak dari Modul 09's "OTOMATIS".
// CapaRegisterService.assertSourceValidIfKnownContract() (task 4.2)
// diperluas TERPISAH (capa-register.service.ts, BR-05) utk memvalidasi
// source_type=QUALITY_NCR/CUSTOMER_COMPLAINT via FK Prisma LANGSUNG ke
// ncr_records/customer_complaints — TIDAK butuh impor modul ini balik ke
// CapaModule (arah dependency SEARAH: CAPA tahu soal Quality via query
// tabel langsung, Quality tidak perlu tahu soal CAPA sama sekali). SATU
// job cron baru (quality-complaint-response-sla-scan 06:15 BR-02) —
// konsumennya jalan di proses worker terpisah (lihat
// apps/worker/src/*.worker.ts + QualityWorkerModule) — TIDAK didaftarkan
// DI SINI.
@Module({
  imports: [TenancyModule, ObservabilityModule, WorkflowEngineModule, NumberingModule, NotificationModule],
  providers: [
    QualityWorkflowBootstrapService,
    NcrRecordService,
    NcrWorkflowCompletionListener,
    CustomerComplaintService,
    CustomerComplaintWorkflowCompletionListener,
    QualityInspectionService,
    SupplierQualityRecordService,
    SupplierEvalWorkflowCompletionListener,
    QualityObjectiveService,
    QualityComplaintResponseSlaScanQueueService,
    QualityComplaintResponseSlaScanService,
  ],
  exports: [NcrRecordService, CustomerComplaintService, QualityInspectionService, SupplierQualityRecordService, QualityObjectiveService],
})
export class QualityModule {}
