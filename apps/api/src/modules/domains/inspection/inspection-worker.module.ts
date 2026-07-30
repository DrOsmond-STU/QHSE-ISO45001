import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { NumberingModule } from "../../../platform/numbering/numbering.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { InspectionFindingSlaScanService } from "./inspection-finding-sla-scan.service";
import { InspectionNumberingBootstrapService } from "./inspection-numbering-bootstrap.service";
import { InspectionRecordGenerationScanService } from "./inspection-record-generation-scan.service";
import { InspectionRecordOverdueScanService } from "./inspection-record-overdue-scan.service";
import { InspectionRecordService } from "./inspection-record.service";

// Modul SLIM khusus proses worker (apps/worker) — pola sama
// IncidentWorkerModule (3.5): TIDAK ada HTTP/guard/JWT, TIDAK ada
// *QueueService (producer). InspectionRecordGenerationScanService BUTUH
// InspectionRecordService (genuinely membuat baris inspection_records
// baru, bukan cuma update status spt 2 scan lain) — providers menyertakan
// dependensi transitifnya (InspectionNumberingBootstrapService).
@Module({
  imports: [TenancyModule, ObservabilityModule, NumberingModule, NotificationModule],
  providers: [
    InspectionNumberingBootstrapService,
    InspectionRecordService,
    InspectionRecordGenerationScanService,
    InspectionRecordOverdueScanService,
    InspectionFindingSlaScanService,
  ],
  exports: [InspectionRecordGenerationScanService, InspectionRecordOverdueScanService, InspectionFindingSlaScanService],
})
export class InspectionWorkerModule {}
