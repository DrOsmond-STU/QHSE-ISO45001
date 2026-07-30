import { Module } from "@nestjs/common";
import { ContractorModule } from "../contractor/contractor.module";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { NumberingModule } from "../../../platform/numbering/numbering.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { WorkflowEngineModule } from "../../../platform/workflow-engine/workflow-engine.module";
import { GasRetestDueScanQueueService } from "./gas-retest-due-scan-queue.service";
import { GasRetestDueScanService } from "./gas-retest-due-scan.service";
import { GasTestResultService } from "./gas-test-result.service";
import { IsolationLotoRecordService } from "./isolation-loto-record.service";
import { WorkPermitApprovalCacheService } from "./work-permit-approval-cache.service";
import { WorkPermitClosureService } from "./work-permit-closure.service";
import { WorkPermitExpiryScanQueueService } from "./work-permit-expiry-scan-queue.service";
import { WorkPermitExpiryScanService } from "./work-permit-expiry-scan.service";
import { WorkPermitExtensionWorkflowCompletionListener } from "./work-permit-extension-workflow-completion.listener";
import { WorkPermitExtensionService } from "./work-permit-extension.service";
import { WorkPermitTypeService } from "./work-permit-type.service";
import { WorkPermitWorkflowBootstrapService } from "./work-permit-workflow-bootstrap.service";
import { WorkPermitWorkflowCompletionListener } from "./work-permit-workflow-completion.listener";
import { WorkPermitService } from "./work-permit.service";

// Task 3.3 (tipe & alur inti) — modul DOMAIN KEDELAPAN, awal cakupan
// Modul 06 (BEDA dari risk-management/* — modul domain TERPISAH, bukan
// submodul saudara). Task 3.4 (extension, closure & cross-link)
// MELENGKAPI cakupan Modul 06 sisa — work_permit_extensions/
// work_permit_closures + 2 job cron baru (work-permit-expiry-scan
// BR-07/E2E-1, gas-retest-due-scan BR-05) — konsumennya jalan di proses
// worker terpisah (lihat apps/worker/src/*.worker.ts + WorkPermitWorkerModule)
// — TIDAK didaftarkan DI SINI, pola sama seluruh job lain codebase ini.
// Task 6.3 — mengimpor ContractorModule (Modul 17, LEBIH BARU) utk BR-02
// (blokir permit requester contractorCompanyId saat dokumen kepatuhan
// EXPIRED) — arah dependency TERBALIK dari kebiasaan "modul lama tidak
// impor modul baru" (preseden SAMA kelas gap OH BR-07 5.3, TAPI di sini
// WAJIB diselesaikan krn TASK_INSTRUCTION.md 6.3 eksplisit minta
// "hubungkan referensi yang di-stub sebelumnya", bukan didiamkan).
@Module({
  imports: [TenancyModule, ObservabilityModule, WorkflowEngineModule, NumberingModule, NotificationModule, ContractorModule],
  providers: [
    WorkPermitWorkflowBootstrapService,
    WorkPermitApprovalCacheService,
    WorkPermitTypeService,
    WorkPermitService,
    WorkPermitWorkflowCompletionListener,
    GasTestResultService,
    IsolationLotoRecordService,
    WorkPermitExtensionService,
    WorkPermitExtensionWorkflowCompletionListener,
    WorkPermitClosureService,
    WorkPermitExpiryScanQueueService,
    WorkPermitExpiryScanService,
    GasRetestDueScanQueueService,
    GasRetestDueScanService,
  ],
  exports: [
    WorkPermitTypeService,
    WorkPermitService,
    GasTestResultService,
    IsolationLotoRecordService,
    WorkPermitExtensionService,
    WorkPermitClosureService,
  ],
})
export class WorkPermitModule {}
