import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { EmergencyResponsePlanService } from "./emergency-response-plan.service";

const EMERGENCY_RESPONSE_PLAN_WORKFLOW_ENTITY_TYPE = "emergency_response_plan";

/**
 * Task 3.7 — KESEMBILAN KONSUMEN WORKFLOW_INSTANCE_COMPLETED_EVENT (pola
 * PERSIS listener modul lain — payload-only, TIDAK PERNAH re-query
 * workflow_instances/workflow_tasks, lihat banner comment
 * WorkflowInstanceCompletedEvent). APPROVED -> EmergencyResponsePlanService.markApprovedActive()
 * (status->APPROVED_ACTIVE + next_review_due_date dihitung BR-01). REJECTED
 * -> returnToDraft() (status->DRAFT, workflow_instance_id di-null-kan utk
 * resubmission, pola sama JSA 3.2).
 *
 * BEDA dari precedent: modul ini TIDAK enqueue notifikasi apa pun di sini —
 * PRD §8 tabel notifikasi Modul 14 TIDAK menyebutkan event "plan
 * disetujui/ditolak" sama sekali (5 baris §8 semuanya soal aktivasi/review-
 * overdue/drill/equipment, TIDAK ada baris "plan approved/rejected"), gap
 * TDD §26 — beda dari Incident/Work Permit yang PRD-nya eksplisit minta
 * notifikasi approval.
 */
@Injectable()
export class EmergencyResponseWorkflowCompletionListener {
  private readonly logger = new Logger(EmergencyResponseWorkflowCompletionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: EmergencyResponsePlanService,
  ) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== EMERGENCY_RESPONSE_PLAN_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        if (payload.status === "APPROVED") {
          await this.planService.markApprovedActive(payload.entityId);
        } else if (payload.status === "REJECTED") {
          await this.planService.returnToDraft(payload.entityId);
        }
      } catch (err) {
        this.logger.error(
          `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk emergency_response_plan=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }
}
