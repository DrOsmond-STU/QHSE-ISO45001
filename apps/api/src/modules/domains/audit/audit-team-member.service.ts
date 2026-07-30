import { Injectable } from "@nestjs/common";
import { AuditTeamMember, AuditTeamRole } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./audit-context";
import { assertAuditorIndependence } from "./audit-team-rules";

export interface AddAuditTeamMemberInput {
  userId: string;
  roleInTeam: AuditTeamRole;
}

// Task 4.1 (Modul 09 §3 "Audit Program Owner/MR | audit.audit.assign_team",
// BR-07). BELUM ada controller HTTP.
@Injectable()
export class AuditTeamMemberService {
  constructor(private readonly prisma: PrismaService) {}

  async addMember(auditId: string, input: AddAuditTeamMemberInput): Promise<AuditTeamMember> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    const [candidate, auditeeScopes] = await this.prisma.withRls((tx) =>
      Promise.all([
        tx.user.findUniqueOrThrow({ where: { id: input.userId }, select: { departmentId: true } }),
        tx.auditAuditeeScope.findMany({ where: { auditId }, select: { departmentId: true } }),
      ]),
    );
    assertAuditorIndependence(
      candidate.departmentId,
      auditeeScopes.map((s) => s.departmentId),
    );

    return this.prisma.withRls((tx) =>
      tx.auditTeamMember.create({
        data: { tenantId, auditId, userId: input.userId, roleInTeam: input.roleInTeam, createdBy, updatedBy: createdBy },
      }),
    );
  }

  async removeMember(auditTeamMemberId: string): Promise<void> {
    const updatedBy = requireActorUserId();
    await this.prisma.withRls((tx) =>
      tx.auditTeamMember.update({ where: { id: auditTeamMemberId }, data: { deletedAt: new Date(), updatedBy } }),
    );
  }

  async listByAudit(auditId: string): Promise<AuditTeamMember[]> {
    return this.prisma.withRls((tx) => tx.auditTeamMember.findMany({ where: { auditId, deletedAt: null } }));
  }
}
