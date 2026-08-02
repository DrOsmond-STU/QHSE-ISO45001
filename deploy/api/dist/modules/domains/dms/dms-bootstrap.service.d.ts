import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class DmsBootstrapService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ensureNumberingConfig(): Promise<NumberingConfig>;
    ensureWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
}
