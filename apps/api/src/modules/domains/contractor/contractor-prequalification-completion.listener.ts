import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { ContractorPrequalificationService, PREQUALIFICATION_WORKFLOW_ENTITY_TYPE } from "./contractor-prequalification.service";
import { ContractorService } from "./contractor.service";

@Injectable()
export class ContractorPrequalificationCompletionListener {
  private readonly logger = new Logger(ContractorPrequalificationCompletionListener.name);

  constructor(
    private readonly prequalificationService: ContractorPrequalificationService,
    private readonly contractorService: ContractorService,
  ) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(event: WorkflowInstanceCompletedEvent): Promise<void> {
    if (event.entityType !== PREQUALIFICATION_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: event.tenantId }, async () => {
      try {
        const approved = event.status === "APPROVED";
        const prequalification = await this.prequalificationService.onReviewCompleted(event.entityId, approved);

        // §4.1 poin 5 — "Hasil PASS/CONDITIONAL_PASS -> contractors.status =
        // PREQUALIFIED". FAIL TIDAK mengubah status kontraktor (BR-01 tetap
        // memblokir assignment lewat status existing kontraktor, TIDAK
        // butuh transisi eksplisit). ContractorService.updateStatus()
        // butuh actor context (requireActorUserId()) — TIDAK ADA actor
        // manusia di titik listener ini, jadi context di-run ULANG dgn
        // userId=evaluatedBy (evaluator asli), pola sama alasan `updatedBy`
        // di ContractorPrequalificationService.onReviewCompleted().
        if (approved && (prequalification.result === "PASS" || prequalification.result === "CONDITIONAL_PASS")) {
          const systemActorUserId = prequalification.evaluatedBy ?? prequalification.createdBy;
          await tenantContextStorage.run({ tenantId: event.tenantId, userId: systemActorUserId }, () =>
            this.contractorService.updateStatus(prequalification.contractorId, "PREQUALIFIED"),
          );
        }
      } catch (err) {
        this.logger.error(`Gagal memproses penyelesaian workflow prequalification=${event.entityId}: ${err instanceof Error ? err.message : err}`);
      }
    });
  }
}
