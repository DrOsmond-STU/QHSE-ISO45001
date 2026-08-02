import { AuditAuditeeScope } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface AddAuditAuditeeScopeInput {
    departmentId?: string;
    processArea?: string;
}
export declare class AuditAuditeeScopeService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    addScope(auditId: string, input: AddAuditAuditeeScopeInput): Promise<AuditAuditeeScope>;
    listByAudit(auditId: string): Promise<AuditAuditeeScope[]>;
}
