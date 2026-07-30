import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { CapaRegisterService } from "./capa-register.service";

// Lihat banner comment CapaActionPlanService soal entityId=capa_register.id.
const CAPA_ACTION_PLAN_WORKFLOW_ENTITY_TYPE = "capa_action_plan";

/**
 * Task 4.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * capa_action_plan (pola PERSIS listener modul lain — payload-only, TIDAK
 * PERNAH re-query workflow_instances/workflow_tasks). APPROVED ->
 * CapaRegisterService.markActionPlanApproved() (status->IN_PROGRESS).
 * REJECTED -> returnToActionPlanDefined() (PIC redefine, workflow_
 * instance_id di-null-kan).
 *
 * TIDAK enqueue notifikasi di sini — PRD §8 baris "Action plan menunggu
 * approval" hanya utk SAAT SUBMIT (Workflow Engine 0.9 sendiri sudah
 * membuat workflow_tasks utk approver, pola sama Audit 4.1), TIDAK ADA
 * baris §8 "action plan disetujui/ditolak", gap TDD §26.
 */
@Injectable()
export class CapaActionPlanWorkflowCompletionListener {
  private readonly logger = new Logger(CapaActionPlanWorkflowCompletionListener.name);

  constructor(private readonly registerService: CapaRegisterService) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== CAPA_ACTION_PLAN_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          await this.registerService.markActionPlanApproved(payload.entityId);
        } else if (payload.status === "REJECTED") {
          await this.registerService.returnToActionPlanDefined(payload.entityId);
        }
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk capa_action_plan (capa_register=${payload.entityId}): ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }
}
