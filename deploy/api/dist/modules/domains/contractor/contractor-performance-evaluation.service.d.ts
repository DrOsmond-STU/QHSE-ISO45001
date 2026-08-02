import { ContractorEvaluationPeriod, ContractorEvaluationRating, ContractorPerformanceEvaluation } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { ContractorWorkflowBootstrapService } from "./contractor-workflow-bootstrap.service";
export declare const EVALUATION_WORKFLOW_ENTITY_TYPE = "contractor_performance_evaluation";
export interface CreateEvaluationInput {
    contractorId: string;
    projectAssignmentId?: string;
    evaluationPeriod: ContractorEvaluationPeriod;
    periodStartDate: Date;
    periodEndDate: Date;
    hseComplianceScore?: number;
    manHoursWorked?: number;
    documentComplianceScore?: number;
    overallRating: ContractorEvaluationRating;
    recommendation?: string;
}
export declare class ContractorPerformanceEvaluationService {
    private readonly prisma;
    private readonly workflowEngine;
    private readonly workflowBootstrap;
    private readonly notificationService;
    constructor(prisma: PrismaService, workflowEngine: WorkflowEngineService, workflowBootstrap: ContractorWorkflowBootstrapService, notificationService: NotificationService);
    create(input: CreateEvaluationInput): Promise<ContractorPerformanceEvaluation>;
    submitForReview(id: string): Promise<ContractorPerformanceEvaluation>;
    onReviewCompleted(id: string, approved: boolean): Promise<ContractorPerformanceEvaluation>;
    private checkAndNotifyConsecutiveUnacceptable;
    getById(id: string): Promise<ContractorPerformanceEvaluation>;
}
