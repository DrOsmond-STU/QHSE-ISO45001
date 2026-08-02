import { ContractorAssignmentStatus, ContractorProjectAssignment, ContractorRiskRating } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { ContractorWorkflowBootstrapService } from "./contractor-workflow-bootstrap.service";
export interface CreateAssignmentInput {
    contractorId: string;
    siteId: string;
    branchId?: string;
    contractTitle?: string;
    scopeOfWork?: string;
    contractStartDate: Date;
    contractEndDate?: Date;
    contractValue?: number;
    hsePlanDocumentId?: string;
    picInternalUserId: string;
    riskClassification: ContractorRiskRating;
    autoGenerateContractNo?: boolean;
    contractNo?: string;
}
export declare class ContractorProjectAssignmentService {
    private readonly prisma;
    private readonly numbering;
    private readonly workflowBootstrap;
    constructor(prisma: PrismaService, numbering: NumberingService, workflowBootstrap: ContractorWorkflowBootstrapService);
    create(input: CreateAssignmentInput): Promise<ContractorProjectAssignment>;
    activate(id: string): Promise<ContractorProjectAssignment>;
    updateStatus(id: string, status: ContractorAssignmentStatus): Promise<ContractorProjectAssignment>;
    setContractorPic(id: string, contractorPicWorkerId: string): Promise<ContractorProjectAssignment>;
    getById(id: string): Promise<ContractorProjectAssignment>;
}
