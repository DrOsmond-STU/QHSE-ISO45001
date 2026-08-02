import { RiskMatrixConfig, RiskMatrixModuleScope } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
export declare class RiskMatrixBootstrapService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ensureDefaultMatrix(scope?: RiskMatrixModuleScope): Promise<RiskMatrixConfig>;
}
