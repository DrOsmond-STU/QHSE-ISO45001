import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { ContractorPerformanceEvaluationService } from "./contractor-performance-evaluation.service";
export declare class ContractorEvaluationCompletionListener {
    private readonly evaluationService;
    private readonly logger;
    constructor(evaluationService: ContractorPerformanceEvaluationService);
    onWorkflowInstanceCompleted(event: WorkflowInstanceCompletedEvent): Promise<void>;
}
