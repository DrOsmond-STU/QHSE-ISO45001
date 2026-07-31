import { Controller, Get, Param, Query } from "@nestjs/common";
import { RequirePermission } from "../../../platform/rbac/require-permission.decorator";
import { ListQueryDto } from "../../../platform/common/list-query.dto";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { getCurrentTenantId } from "../../../platform/tenancy/tenant-context";

function requireTenantId(): string {
  const tenantId = getCurrentTenantId();
  if (!tenantId) throw new Error("Tenant context tidak ditemukan — request ditolak (fail closed).");
  return tenantId;
}

// Endpoint HTTP READ-ONLY demo utk domain Audit Management (Modul 09) —
// GET list+detail audits + sub-route findings, pola sama
// document.controller.ts (DMS) — scope MINIMAL sekadar demo Postman.
@Controller("audits")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermission("audit.audit.read")
  @Get()
  async list(@Query() query: ListQueryDto) {
    const tenantId = requireTenantId();
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    return this.prisma.withRls(async (tx) => {
      const [data, total] = await Promise.all([
        tx.audit.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
        tx.audit.count({ where: { tenantId } }),
      ]);
      return { data, meta: { page, limit, total } };
    });
  }

  @RequirePermission("audit.audit.read")
  @Get(":id")
  async getById(@Param("id") id: string) {
    const record = await this.prisma.withRls((tx) => tx.audit.findUniqueOrThrow({ where: { id } }));
    return { data: record };
  }

  @RequirePermission("audit.finding.read")
  @Get(":id/findings")
  async findings(@Param("id") id: string) {
    const data = await this.prisma.withRls((tx) => tx.auditFinding.findMany({ where: { auditId: id }, orderBy: { createdAt: "desc" } }));
    return { data };
  }
}
