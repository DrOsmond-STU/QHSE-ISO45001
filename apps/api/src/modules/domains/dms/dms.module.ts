import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { NumberingModule } from "../../../platform/numbering/numbering.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { WorkflowEngineModule } from "../../../platform/workflow-engine/workflow-engine.module";
import { DmsBootstrapService } from "./dms-bootstrap.service";
import { DocumentController } from "./document.controller";
import { DocumentCategoryService } from "./document-category.service";
import { DocumentDistributionService } from "./document-distribution.service";
import { DocumentReviewScanQueueService } from "./document-review-scan-queue.service";
import { DocumentReviewScanService } from "./document-review-scan.service";
import { DocumentReviewScheduleService } from "./document-review-schedule.service";
import { DocumentService } from "./document.service";
import { DocumentVersionService } from "./document-version.service";
import { DocumentWorkflowCompletionListener } from "./document-workflow-completion.listener";
import { ReadAcknowledgementScanQueueService } from "./read-acknowledgement-scan-queue.service";
import { ReadAcknowledgementScanService } from "./read-acknowledgement-scan.service";
import { ReadAcknowledgementService } from "./read-acknowledgement.service";

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
@Module({
  imports: [TenancyModule, ObservabilityModule, WorkflowEngineModule, NumberingModule, NotificationModule],
  controllers: [DocumentController],
  providers: [
    DmsBootstrapService,
    DocumentCategoryService,
    DocumentService,
    DocumentVersionService,
    DocumentWorkflowCompletionListener,
    DocumentDistributionService,
    ReadAcknowledgementService,
    DocumentReviewScheduleService,
    DocumentReviewScanQueueService,
    DocumentReviewScanService,
    ReadAcknowledgementScanQueueService,
    ReadAcknowledgementScanService,
  ],
  exports: [
    DocumentCategoryService,
    DocumentService,
    DocumentVersionService,
    DocumentDistributionService,
    ReadAcknowledgementService,
    DocumentReviewScheduleService,
  ],
})
export class DmsModule {}
