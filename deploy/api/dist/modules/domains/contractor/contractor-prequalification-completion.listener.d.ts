import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { ContractorPrequalificationService } from "./contractor-prequalification.service";
import { ContractorService } from "./contractor.service";
export declare class ContractorPrequalificationCompletionListener {
    private readonly prequalificationService;
    private readonly contractorService;
    private readonly logger;
    constructor(prequalificationService: ContractorPrequalificationService, contractorService: ContractorService);
    onWorkflowInstanceCompleted(event: WorkflowInstanceCompletedEvent): Promise<void>;
}
