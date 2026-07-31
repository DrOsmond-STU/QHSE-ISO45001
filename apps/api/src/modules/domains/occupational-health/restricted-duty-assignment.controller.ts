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

// Endpoint HTTP READ-ONLY demo utk domain Occupational Health (Modul 13)
// — GET list+detail restricted_duty_assignments SAJA (BUKAN medical_records/
// mcu_results/pak_case — seluruh entitas PHI dual-gate BR-01/BR-02 SENGAJA
// TIDAK diekspos endpoint generik ini, gap scope resiko terlalu tinggi utk
// controller "minimal read-only demo"). RestrictedDutyAssignment dipilih
// krn field alternativeTaskDescription eksplisit didesain "boundary
// field... SENGAJA TIDAK dienkripsi" (lihat banner comment schema.prisma)
// — non-klinis by design, cocok dgn permission occupational_health.restricted_duty.view.
@Controller("restricted-duty-assignments")
export class RestrictedDutyAssignmentController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermission("occupational_health.restricted_duty.view")
  @Get()
  async list(@Query() query: ListQueryDto) {
    const tenantId = requireTenantId();
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    return this.prisma.withRls(async (tx) => {
      const [data, total] = await Promise.all([
        tx.restrictedDutyAssignment.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
        tx.restrictedDutyAssignment.count({ where: { tenantId } }),
      ]);
      return { data, meta: { page, limit, total } };
    });
  }

  @RequirePermission("occupational_health.restricted_duty.view")
  @Get(":id")
  async getById(@Param("id") id: string) {
    const record = await this.prisma.withRls((tx) => tx.restrictedDutyAssignment.findUniqueOrThrow({ where: { id } }));
    return { data: record };
  }
}
