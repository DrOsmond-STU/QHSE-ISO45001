import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { AuditProgramService } from "./audit-program.service";

// Lihat banner comment AuditWorkflowBootstrapService.ensureAuditProgramWorkflowDefinition.
const AUDIT_PROGRAM_WORKFLOW_ENTITY_TYPE = "audit_program";

/**
 * Task 4.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * audit_program (pola PERSIS listener modul lain — payload-only, TIDAK
 * PERNAH re-query workflow_instances/workflow_tasks, lihat banner comment
 * WorkflowInstanceCompletedEvent). APPROVED -> AuditProgramService.
 * markApprovedActive() (status->APPROVED). REJECTED -> returnToDraft()
 * (status TETAP DRAFT, workflow_instance_id di-null-kan utk resubmission).
 *
 * TIDAK enqueue notifikasi di sini — PRD §8 baris "Program audit menunggu
 * approval" hanya utk SAAT SUBMIT (AuditProgramService.submitForApproval()
 * TIDAK mengirim notifikasi krn Workflow Engine 0.9 sendiri SUDAH membuat
 * workflow_tasks utk approver, yang jadi sumber "menunggu approval Anda"
 * via mekanisme task generik, bukan notification_templates modul ini) —
 * TIDAK ADA baris §8 "program disetujui/ditolak" sama sekali, gap TDD §26
 * konsisten Emergency Response 3.7.
 */
@Injectable()
export class AuditProgramWorkflowCompletionListener {
  private readonly logger = new Logger(AuditProgramWorkflowCompletionListener.name);

  constructor(private readonly programService: AuditProgramService) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== AUDIT_PROGRAM_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          await this.programService.markApprovedActive(payload.entityId);
        } else if (payload.status === "REJECTED") {
          await this.programService.returnToDraft(payload.entityId);
        }
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk audit_program=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }
}
