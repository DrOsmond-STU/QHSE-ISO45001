import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class QualityWorkflowBootstrapService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private ensureNumberingConfig;
    ensureNcrNumberingConfig(siteId: string): Promise<NumberingConfig>;
    ensureComplaintNumberingConfig(): Promise<NumberingConfig>;
    ensureInspectionNumberingConfig(siteId: string): Promise<NumberingConfig>;
    private findRoleOrThrow;
    ensureNcrWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
    ensureComplaintWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
    ensureInspectionDeviationWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
    ensureSupplierEvalWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
    private ensureSingleStageDefinition;
    private ensureThreeStageDefinition;
}
