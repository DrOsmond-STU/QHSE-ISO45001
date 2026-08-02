import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { AssetTransferService } from "./asset-transfer.service";
/**
 * Task 6.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * asset (workflow ASSET_DISPOSAL 1-stage, BR-03). Payload-only, pola PERSIS
 * listener modul lain sesi ini.
 */
export declare class AssetDisposalWorkflowCompletionListener {
    private readonly assetTransferService;
    private readonly logger;
    constructor(assetTransferService: AssetTransferService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
}
