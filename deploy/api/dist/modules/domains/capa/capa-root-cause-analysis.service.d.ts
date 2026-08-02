import { CapaRootCauseAnalysis, CapaRootCauseMethod, Prisma } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { CapaRegisterService } from "./capa-register.service";
export interface RecordCapaRootCauseAnalysisInput {
    capaRegisterId: string;
    method: CapaRootCauseMethod;
    methodDetail: Prisma.InputJsonValue;
    rootCauseSummary: string;
    contributingFactors?: string;
}
export declare class CapaRootCauseAnalysisService {
    private readonly prisma;
    private readonly registerService;
    constructor(prisma: PrismaService, registerService: CapaRegisterService);
    record(input: RecordCapaRootCauseAnalysisInput): Promise<CapaRootCauseAnalysis>;
    getById(rootCauseAnalysisId: string): Promise<CapaRootCauseAnalysis>;
    listByCapa(capaRegisterId: string): Promise<CapaRootCauseAnalysis[]>;
}
