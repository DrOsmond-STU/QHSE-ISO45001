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

/** site_id/company_id/branch_id py FK sungguhan — pola PERSIS test/audit|incident/test-helpers.ts. */
export async function seedSite(tenantId: string, actorUserId: string): Promise<{ companyId: string; branchId: string; siteId: string }> {
  const company = await adminPrisma.company.create({
    data: { tenantId, companyCode: `CO-${randomUUID().slice(0, 8)}`, legalName: "PT Fixture", displayName: "Fixture Co", createdBy: actorUserId, updatedBy: actorUserId },
  });
  const branch = await adminPrisma.branch.create({
    data: { tenantId, companyId: company.id, branchCode: `BR-${randomUUID().slice(0, 8)}`, name: "Fixture Branch", createdBy: actorUserId, updatedBy: actorUserId },
  });
  const site = await adminPrisma.site.create({
    data: { tenantId, companyId: company.id, branchId: branch.id, siteCode: `ST-${randomUUID().slice(0, 8)}`, name: "Fixture Site", siteType: "PERMANENT", createdBy: actorUserId, updatedBy: actorUserId },
  });
  return { companyId: company.id, branchId: branch.id, siteId: site.id };
}

export async function seedAuditTypeAndChecklist(tenantId: string, actorUserId: string, standardCode = "ISO45001") {
  const auditType = await adminPrisma.auditType.create({
    data: { tenantId, code: `TYPE-${randomUUID().slice(0, 6)}`, name: "Internal", createdBy: actorUserId, updatedBy: actorUserId },
  });
  const checklist = await adminPrisma.auditChecklist.create({
    data: { tenantId, name: "Checklist ISO 45001", standardCode, version: 1, createdBy: actorUserId, updatedBy: actorUserId },
  });
  await adminPrisma.auditChecklistItem.create({
    data: {
      tenantId,
      auditChecklistId: checklist.id,
      clauseReference: "6.1.2",
      sequenceNo: 1,
      criteriaText: "Identifikasi bahaya",
      createdBy: actorUserId,
      updatedBy: actorUserId,
    },
  });
  return { auditTypeId: auditType.id, auditChecklistId: checklist.id, standardCode };
}
