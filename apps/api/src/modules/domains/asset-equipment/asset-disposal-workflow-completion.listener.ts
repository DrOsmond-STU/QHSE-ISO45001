import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { AssetTransferService, DISPOSAL_WORKFLOW_ENTITY_TYPE } from "./asset-transfer.service";

/**
 * Task 6.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * asset (workflow ASSET_DISPOSAL 1-stage, BR-03). Payload-only, pola PERSIS
 * listener modul lain sesi ini.
 */
@Injectable()
export class AssetDisposalWorkflowCompletionListener {
  private readonly logger = new Logger(AssetDisposalWorkflowCompletionListener.name);

  constructor(private readonly assetTransferService: AssetTransferService) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== DISPOSAL_WORKFLOW_ENTITY_TYPE) return;

    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      try {
        await this.assetTransferService.onDisposalWorkflowCompleted(payload.entityId, payload.status === "APPROVED");
      } catch (err) {
        this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk asset=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
      }
    });
  }
}
