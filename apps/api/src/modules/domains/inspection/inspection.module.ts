import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { NumberingModule } from "../../../platform/numbering/numbering.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { InspectionChecklistTemplateService } from "./inspection-checklist-template.service";
import { InspectionFindingSlaScanQueueService } from "./inspection-finding-sla-scan-queue.service";
import { InspectionFindingSlaScanService } from "./inspection-finding-sla-scan.service";
import { InspectionFindingService } from "./inspection-finding.service";
import { InspectionNumberingBootstrapService } from "./inspection-numbering-bootstrap.service";
import { InspectionRecordGenerationScanQueueService } from "./inspection-record-generation-scan-queue.service";
import { InspectionRecordGenerationScanService } from "./inspection-record-generation-scan.service";
import { InspectionRecordOverdueScanQueueService } from "./inspection-record-overdue-scan-queue.service";
import { InspectionRecordOverdueScanService } from "./inspection-record-overdue-scan.service";
import { InspectionRecordService } from "./inspection-record.service";
import { InspectionScheduleService } from "./inspection-schedule.service";
import { InspectionScoreService } from "./inspection-score.service";
import { InspectionTypeService } from "./inspection-type.service";

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
@Module({
  imports: [TenancyModule, ObservabilityModule, NumberingModule, NotificationModule],
  providers: [
    InspectionTypeService,
    InspectionChecklistTemplateService,
    InspectionNumberingBootstrapService,
    InspectionScheduleService,
    InspectionRecordService,
    InspectionFindingService,
    InspectionScoreService,
    InspectionRecordGenerationScanQueueService,
    InspectionRecordGenerationScanService,
    InspectionRecordOverdueScanQueueService,
    InspectionRecordOverdueScanService,
    InspectionFindingSlaScanQueueService,
    InspectionFindingSlaScanService,
  ],
  exports: [
    InspectionTypeService,
    InspectionChecklistTemplateService,
    InspectionScheduleService,
    InspectionRecordService,
    InspectionFindingService,
    InspectionScoreService,
  ],
})
export class InspectionModule {}
