import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class EnvironmentalWorkflowBootstrapService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private ensureNumberingConfig;
    ensureAspectNumberingConfig(siteId: string): Promise<NumberingConfig>;
    ensureMonitoringNumberingConfig(siteId: string): Promise<NumberingConfig>;
    ensureManifestNumberingConfig(siteId: string): Promise<NumberingConfig>;
    private findRoleOrThrow;
    ensureAspectReviewWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
    ensureProperAssessmentWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
    private ensureTwoStageDefinition;
}
