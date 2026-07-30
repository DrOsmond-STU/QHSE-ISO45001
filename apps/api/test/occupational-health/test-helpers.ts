import { randomUUID } from "node:crypto";
import { UserType } from "@prisma/client";
import { seedRbacBaseline } from "../../prisma/seed-rbac-baseline";
import { adminPrisma } from "../auth/test-helpers";

export { adminPrisma, createTestApp, flushTestRedis, seedTenantFixture } from "../auth/test-helpers";
export type { TenantFixture } from "../auth/test-helpers";

export interface SeededUser {
  id: string;
  email: string;
}

export async function seedUserInTenant(
  tenantId: string,
  label = "Test User",
  overrides: { siteId?: string; departmentId?: string; userType?: UserType } = {},
): Promise<SeededUser> {
  const email = `${label.toLowerCase().replace(/\s+/g, "-")}-${randomUUID()}@qhse.local`;
  const user = await adminPrisma.user.create({
    data: {
      tenantId,
      email,
      fullName: label,
      status: "ACTIVE",
      siteId: overrides.siteId,
      departmentId: overrides.departmentId,
      userType: overrides.userType ?? "INTERNAL_EMPLOYEE",
    },
  });
  return { id: user.id, email: user.email };
}

export async function assignRole(tenantId: string, userId: string, roleCode: string): Promise<void> {
  await seedRbacBaseline(adminPrisma);
  const role = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode } });
  await adminPrisma.userRole.create({ data: { tenantId, userId, roleId: role.id, scopeType: "TENANT", scopeId: null } });
}

/** site_id/company_id/branch_id/department_id py FK sungguhan — pola PERSIS test/environmental/test-helpers.ts. */
export async function seedSite(
  tenantId: string,
  actorUserId: string,
): Promise<{ companyId: string; branchId: string; siteId: string; departmentId: string }> {
  const company = await adminPrisma.company.create({
    data: { tenantId, companyCode: `CO-${randomUUID().slice(0, 8)}`, legalName: "PT Fixture", displayName: "Fixture Co", createdBy: actorUserId, updatedBy: actorUserId },
  });
  const branch = await adminPrisma.branch.create({
    data: { tenantId, companyId: company.id, branchCode: `BR-${randomUUID().slice(0, 8)}`, name: "Fixture Branch", createdBy: actorUserId, updatedBy: actorUserId },
  });
  const site = await adminPrisma.site.create({
    data: { tenantId, companyId: company.id, branchId: branch.id, siteCode: `ST-${randomUUID().slice(0, 8)}`, name: "Fixture Site", siteType: "PERMANENT", createdBy: actorUserId, updatedBy: actorUserId },
  });
  const department = await adminPrisma.department.create({
    data: {
      tenantId,
      companyId: company.id,
      branchId: branch.id,
      siteId: site.id,
      departmentCode: `DP-${randomUUID().slice(0, 8)}`,
      name: "Fixture Department",
      createdBy: actorUserId,
      updatedBy: actorUserId,
    },
  });
  return { companyId: company.id, branchId: branch.id, siteId: site.id, departmentId: department.id };
}

/** BR-02 dual-gate bagian (b) — whitelist AKTIF utk scope SITE. */
export async function grantPhiAuthorization(
  tenantId: string,
  userId: string,
  siteId: string,
  authorizedBy: string,
): Promise<string> {
  const row = await adminPrisma.occupationalHealthAuthorizedUser.create({
    data: {
      tenantId,
      userId,
      authorizedScopeType: "SITE",
      authorizedScopeId: siteId,
      authorizationReason: "Fixture — dokter klinik ditugaskan site ini",
      authorizedBy,
      authorizedAt: new Date(),
      status: "ACTIVE",
      createdBy: authorizedBy,
      updatedBy: authorizedBy,
    },
  });
  return row.id;
}
