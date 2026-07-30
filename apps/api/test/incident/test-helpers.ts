import { randomUUID } from "node:crypto";
import { seedRbacBaseline } from "../../prisma/seed-rbac-baseline";
import { adminPrisma } from "../auth/test-helpers";

export { adminPrisma, createTestApp, flushTestRedis, seedTenantFixture } from "../auth/test-helpers";
export type { TenantFixture } from "../auth/test-helpers";

export interface SeededUser {
  id: string;
  email: string;
}

export async function seedUserInTenant(tenantId: string, label = "Test User"): Promise<SeededUser> {
  const email = `${label.toLowerCase().replace(/\s+/g, "-")}-${randomUUID()}@qhse.local`;
  const user = await adminPrisma.user.create({ data: { tenantId, email, fullName: label, status: "ACTIVE" } });
  return { id: user.id, email: user.email };
}

export async function assignRole(tenantId: string, userId: string, roleCode: string): Promise<void> {
  await seedRbacBaseline(adminPrisma);
  const role = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode } });
  await adminPrisma.userRole.create({ data: { tenantId, userId, roleId: role.id, scopeType: "TENANT", scopeId: null } });
}

/** site_id pada incident_reports PUNYA FK sungguhan — test yang perlu
 * mengisi siteId wajib pakai baris nyata, bukan randomUUID(). */
export async function seedSite(tenantId: string, actorUserId: string): Promise<{ companyId: string; siteId: string }> {
  const company = await adminPrisma.company.create({
    data: { tenantId, companyCode: `CO-${randomUUID().slice(0, 8)}`, legalName: "PT Fixture", displayName: "Fixture Co", createdBy: actorUserId, updatedBy: actorUserId },
  });
  const branch = await adminPrisma.branch.create({
    data: { tenantId, companyId: company.id, branchCode: `BR-${randomUUID().slice(0, 8)}`, name: "Fixture Branch", createdBy: actorUserId, updatedBy: actorUserId },
  });
  const site = await adminPrisma.site.create({
    data: { tenantId, companyId: company.id, branchId: branch.id, siteCode: `ST-${randomUUID().slice(0, 8)}`, name: "Fixture Site", siteType: "PERMANENT", createdBy: actorUserId, updatedBy: actorUserId },
  });
  return { companyId: company.id, siteId: site.id };
}
