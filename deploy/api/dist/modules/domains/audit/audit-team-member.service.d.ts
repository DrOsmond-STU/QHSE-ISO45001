import { AuditTeamMember, AuditTeamRole } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface AddAuditTeamMemberInput {
    userId: string;
    roleInTeam: AuditTeamRole;
}
export declare class AuditTeamMemberService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    addMember(auditId: string, input: AddAuditTeamMemberInput): Promise<AuditTeamMember>;
    removeMember(auditTeamMemberId: string): Promise<void>;
    listByAudit(auditId: string): Promise<AuditTeamMember[]>;
}
