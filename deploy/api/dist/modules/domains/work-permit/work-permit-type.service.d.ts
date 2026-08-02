import { WorkPermitRiskLevel, WorkPermitType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateWorkPermitTypeInput {
    code: string;
    name: string;
    description?: string;
    requiresGasTest?: boolean;
    requiresLoto?: boolean;
    requiresHseApproval?: boolean;
    defaultRiskLevel?: WorkPermitRiskLevel;
    defaultValidityHours?: number;
    maxExtensionCount?: number;
    gasRetestIntervalHours?: number;
}
export interface UpdateWorkPermitTypeInput {
    name?: string;
    description?: string;
    requiresGasTest?: boolean;
    requiresLoto?: boolean;
    requiresHseApproval?: boolean;
    defaultRiskLevel?: WorkPermitRiskLevel;
    defaultValidityHours?: number;
    maxExtensionCount?: number;
    gasRetestIntervalHours?: number;
}
export declare class WorkPermitTypeService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateWorkPermitTypeInput): Promise<WorkPermitType>;
    update(workPermitTypeId: string, input: UpdateWorkPermitTypeInput): Promise<WorkPermitType>;
    getById(workPermitTypeId: string): Promise<WorkPermitType>;
    listActive(): Promise<WorkPermitType[]>;
    /** Soft delete (deletedAt + isActive false) — pola sama seluruh service
     * "type"/"category" config lain di codebase ini. TIDAK ADA BR referensial
     * literal PRD utk tipe yang masih dipakai work_permits AKTIF (beda dari
     * hazard_register BR-07, Modul 05) — retire() TIDAK memvalidasi referensi,
     * gap TDD §26. */
    retire(workPermitTypeId: string): Promise<WorkPermitType>;
}
