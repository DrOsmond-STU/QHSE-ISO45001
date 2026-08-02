import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class ContractorWorkflowBootstrapService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private ensureNumberingConfig;
    ensurePrequalificationNumberingConfig(): Promise<NumberingConfig>;
    ensureAssignmentNumberingConfig(siteId: string): Promise<NumberingConfig>;
    private findRoleOrThrow;
    ensurePrequalificationWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
    ensureEvaluationWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
    private ensureStagedDefinition;
}
