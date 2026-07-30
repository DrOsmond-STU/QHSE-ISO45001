import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { AuditReportService } from "./audit-report.service";

// Lihat banner comment AuditWorkflowBootstrapService.ensureAuditReportWorkflowDefinition.
const AUDIT_REPORT_WORKFLOW_ENTITY_TYPE = "audit_report";

/**
 * Task 4.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * audit_report (pola PERSIS AuditProgramWorkflowCompletionListener/listener
 * modul lain — payload-only, TIDAK PERNAH re-query workflow_instances/
 * workflow_tasks). APPROVED -> AuditReportService.markApproved(). REJECTED
 * -> returnToDraft().
 *
 * TIDAK enqueue notifikasi di sini — PRD §8 baris "Laporan audit menunggu
 * approval" hanya utk SAAT SUBMIT (sama alasan AuditProgramWorkflowCompletionListener),
 * TIDAK ADA baris §8 "laporan disetujui/ditolak", gap TDD §26.
 */
@Injectable()
export class AuditReportWorkflowCompletionListener {
  private readonly logger = new Logger(AuditReportWorkflowCompletionListener.name);

  constructor(private readonly reportService: AuditReportService) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== AUDIT_REPORT_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          await this.reportService.markApproved(payload.entityId);
        } else if (payload.status === "REJECTED") {
          await this.reportService.returnToDraft(payload.entityId);
        }
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk audit_report=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }
}
