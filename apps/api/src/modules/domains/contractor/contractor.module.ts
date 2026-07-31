import { Module } from "@nestjs/common";
import { AuditLogModule } from "../../../platform/audit-log/audit-log.module";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { NumberingModule } from "../../../platform/numbering/numbering.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { WorkflowEngineModule } from "../../../platform/workflow-engine/workflow-engine.module";
import { ContractorDocumentComplianceService } from "./contractor-document-compliance.service";
import { ContractorDueScanQueueService } from "./contractor-due-scan-queue.service";
import { ContractorDueScanService } from "./contractor-due-scan.service";
import { ContractorEvaluationCompletionListener } from "./contractor-evaluation-completion.listener";
import { ContractorPerformanceEvaluationService } from "./contractor-performance-evaluation.service";
import { ContractorPrequalificationCompletionListener } from "./contractor-prequalification-completion.listener";
import { ContractorPrequalificationService } from "./contractor-prequalification.service";
import { ContractorProjectAssignmentService } from "./contractor-project-assignment.service";
import { ContractorWorkerService } from "./contractor-worker.service";
import { ContractorWorkflowBootstrapService } from "./contractor-workflow-bootstrap.service";
import { ContractorController } from "./contractor.controller";
import { ContractorService } from "./contractor.service";

// Task 6.3 (Modul 17 Contractor Management), modul DOMAIN KEDUA PULUH SATU.
// TIDAK mengimpor modul domain lain (arah dependency SEARAH — Work Permit
// 3.3/3.4 & Incident 3.5 merujuk BALIK ke modul ini via FK retroaktif
// contractorCompanyId, lihat banner comment schema.prisma blok Modul 17;
// KEBALIKANNYA, modul ini query LANGSUNG incident_reports via Prisma shared
// schema utk BR agregat evaluasi §4.4 poin 1, pola sama CapaRegisterService
// assertSourceValidIfKnownContract — bukan impor IncidentModule).
@Module({
  imports: [TenancyModule, ObservabilityModule, WorkflowEngineModule, NumberingModule, NotificationModule, AuditLogModule],
  controllers: [ContractorController],
  providers: [
    ContractorWorkflowBootstrapService,
    ContractorService,
    ContractorPrequalificationService,
    ContractorPrequalificationCompletionListener,
    ContractorDocumentComplianceService,
    ContractorWorkerService,
    ContractorProjectAssignmentService,
    ContractorPerformanceEvaluationService,
    ContractorEvaluationCompletionListener,
    // Job cron contractor-due-scan (07:15, PRD §8 baris 1/2/3) — KEDUA
    // *QueueService (producer) DAN *ScanService (consumer) didaftarkan DI
    // SINI SEKALIGUS di ContractorWorkerModule (apps/worker), pola PERSIS
    // Calibration 6.2 (createTestApp() tidak pernah boot modul worker
    // terpisah, test app.get(ScanService) butuh provider itu ada di modul
    // API juga).
    ContractorDueScanQueueService,
    ContractorDueScanService,
  ],
  exports: [
    ContractorService,
    ContractorPrequalificationService,
    ContractorDocumentComplianceService,
    ContractorWorkerService,
    ContractorProjectAssignmentService,
    ContractorPerformanceEvaluationService,
  ],
})
export class ContractorModule {}
