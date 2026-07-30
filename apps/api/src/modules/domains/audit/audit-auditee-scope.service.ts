import { Injectable } from "@nestjs/common";
import { AuditAuditeeScope } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./audit-context";

export interface AddAuditAuditeeScopeInput {
  departmentId?: string;
  processArea?: string;
}

// Task 4.1 (Modul 09 §3 "Audit Program Owner/MR | audit.audit.assign_team").
// BELUM ada controller HTTP. BR-07 divalidasi di AuditTeamMemberService
// SAAT anggota tim ditambahkan (bukan retroaktif saat scope baru
// ditambahkan setelah tim sudah ada) — pola sama seluruh gate "add-time
// only" modul lain.
@Injectable()
export class AuditAuditeeScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async addScope(auditId: string, input: AddAuditAuditeeScopeInput): Promise<AuditAuditeeScope> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.auditAuditeeScope.create({
        data: {
          tenantId,
          auditId,
          departmentId: input.departmentId,
          processArea: input.processArea,
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async listByAudit(auditId: string): Promise<AuditAuditeeScope[]> {
    return this.prisma.withRls((tx) => tx.auditAuditeeScope.findMany({ where: { auditId, deletedAt: null } }));
  }
}
