import { AuditType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateAuditTypeInput {
    code: string;
    name: string;
    description?: string;
    requiresExternalBody?: boolean;
}
export declare class AuditTypeService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateAuditTypeInput): Promise<AuditType>;
    getById(auditTypeId: string): Promise<AuditType>;
    listActive(): Promise<AuditType[]>;
    retire(auditTypeId: string): Promise<AuditType>;
}
