import { ContractorPqDocumentStatus, ContractorPrequalification, ContractorPrequalificationDocument, ContractorPrequalificationResult, ContractorPrequalificationType, ContractorDocumentType } from "@prisma/client";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { ContractorWorkflowBootstrapService } from "./contractor-workflow-bootstrap.service";
export declare const PREQUALIFICATION_WORKFLOW_ENTITY_TYPE = "contractor_prequalification";
export interface CreatePrequalificationInput {
    contractorId: string;
    prequalificationType: ContractorPrequalificationType;
    scopeOfWork?: string;
}
export interface AddDocumentInput {
    documentType: ContractorDocumentType;
    isMandatory?: boolean;
    documentId?: string;
}
export interface SubmitForReviewInput {
    technicalCapabilityScore?: number;
    hseCapabilityScore?: number;
    financialCapabilityScore?: number;
    overallScore?: number;
    minPassingScore?: number;
    result: ContractorPrequalificationResult;
}
export declare class ContractorPrequalificationService {
    private readonly prisma;
    private readonly numbering;
    private readonly workflowEngine;
    private readonly workflowBootstrap;
    constructor(prisma: PrismaService, numbering: NumberingService, workflowEngine: WorkflowEngineService, workflowBootstrap: ContractorWorkflowBootstrapService);
    create(input: CreatePrequalificationInput): Promise<ContractorPrequalification>;
    addDocument(prequalificationId: string, input: AddDocumentInput): Promise<ContractorPrequalificationDocument>;
    verifyDocument(pqDocumentId: string, status: ContractorPqDocumentStatus, notes?: string): Promise<ContractorPrequalificationDocument>;
    submitForReview(id: string, input: SubmitForReviewInput): Promise<ContractorPrequalification>;
    onReviewCompleted(id: string, approved: boolean): Promise<ContractorPrequalification>;
    getById(id: string): Promise<ContractorPrequalification>;
    listDocuments(prequalificationId: string): Promise<ContractorPrequalificationDocument[]>;
}
