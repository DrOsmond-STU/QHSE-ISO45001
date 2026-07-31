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

// Endpoint HTTP READ-ONLY demo utk domain Calibration Management (Modul
// 16) — GET list+detail calibration_items, pola sama document.controller.ts
// (DMS) — scope MINIMAL sekadar demo Postman.
@Controller("calibration-items")
export class CalibrationItemController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermission("calibration.item.read")
  @Get()
  async list(@Query() query: ListQueryDto) {
    const tenantId = requireTenantId();
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    return this.prisma.withRls(async (tx) => {
      const [data, total] = await Promise.all([
        tx.calibrationItem.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
        tx.calibrationItem.count({ where: { tenantId } }),
      ]);
      return { data, meta: { page, limit, total } };
    });
  }

  @RequirePermission("calibration.item.read")
  @Get(":id")
  async getById(@Param("id") id: string) {
    const record = await this.prisma.withRls((tx) => tx.calibrationItem.findUniqueOrThrow({ where: { id } }));
    return { data: record };
  }
}
