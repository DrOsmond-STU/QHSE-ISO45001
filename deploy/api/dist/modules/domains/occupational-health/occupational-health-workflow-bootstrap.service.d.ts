import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class OccupationalHealthWorkflowBootstrapService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private ensureNumberingConfig;
    ensurePakNumberingConfig(siteId: string): Promise<NumberingConfig>;
    ensureClinicVisitNumberingConfig(siteId: string): Promise<NumberingConfig>;
    private findRoleOrThrow;
    ensurePakCaseWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
    private ensureTwoStageDefinition;
}
