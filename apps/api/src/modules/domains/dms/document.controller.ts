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

// Endpoint HTTP READ-ONLY pertama utk domain DMS (Modul 03) — GET
// list+detail sekadar utk demo Postman browse data yang sudah diseed
// (prisma/demo-seed/01-dms.ts), BUKAN REST API penuh (create/update/dll
// TETAP hanya via service layer, pola sama seluruh integration test
// repo ini). dms.document.read sudah ada di AUTHENTICATED_USER_PERMISSIONS
// (seed-rbac-baseline.ts) — SEMUA role login bisa akses endpoint ini.
@Controller("documents")
export class DocumentController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermission("dms.document.read")
  @Get()
  async list(@Query() query: ListQueryDto) {
    const tenantId = requireTenantId();
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    return this.prisma.withRls(async (tx) => {
      const [data, total] = await Promise.all([
        tx.document.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
        tx.document.count({ where: { tenantId } }),
      ]);
      return { data, meta: { page, limit, total } };
    });
  }

  @RequirePermission("dms.document.read")
  @Get(":id")
  async getById(@Param("id") id: string) {
    const record = await this.prisma.withRls((tx) => tx.document.findUniqueOrThrow({ where: { id } }));
    return { data: record };
  }
}
