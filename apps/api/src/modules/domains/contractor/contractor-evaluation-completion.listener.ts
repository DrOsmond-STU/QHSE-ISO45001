import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { ContractorPerformanceEvaluationService, EVALUATION_WORKFLOW_ENTITY_TYPE } from "./contractor-performance-evaluation.service";

@Injectable()
export class ContractorEvaluationCompletionListener {
  private readonly logger = new Logger(ContractorEvaluationCompletionListener.name);

  constructor(private readonly evaluationService: ContractorPerformanceEvaluationService) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(event: WorkflowInstanceCompletedEvent): Promise<void> {
    if (event.entityType !== EVALUATION_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: event.tenantId }, async () => {
      try {
        await this.evaluationService.onReviewCompleted(event.entityId, event.status === "APPROVED");
      } catch (err) {
        this.logger.error(`Gagal memproses penyelesaian workflow evaluation=${event.entityId}: ${err instanceof Error ? err.message : err}`);
      }
    });
  }
}
