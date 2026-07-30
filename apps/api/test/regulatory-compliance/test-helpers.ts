import { randomUUID } from "node:crypto";
import { ROLE_CODES, seedRbacBaseline } from "../../prisma/seed-rbac-baseline";
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

/** roleCode ROLE_CODES key (mis. "HSE_MANAGER"/"COMPLIANCE_OFFICER") —
 * permission compliance.* tidak divalidasi lewat controller HTTP (belum
 * ada, lihat banner comment regulatory-compliance.module.ts), role
 * assignment di sini murni utk konsistensi fixture, BUKAN prasyarat
 * fungsional test service-level manapun di folder ini KECUALI resolusi
 * approver ROLE_IN_SCOPE (WorkflowEngineService, 0.9) yang genuinely query
 * user_roles. */
export async function assignRole(tenantId: string, userId: string, roleCode: string): Promise<void> {
  await seedRbacBaseline(adminPrisma);
  const role = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode } });
  await adminPrisma.userRole.create({ data: { tenantId, userId, roleId: role.id, scopeType: "TENANT", scopeId: null } });
}

export const ROLE_CODES_COMPLIANCE = ROLE_CODES;

/** company_id/site_id pada regulatory_register/licenses_permits/dst
 * PUNYA FK sungguhan (beda dari holder_reference_id yang bare UUID) — test
 * yang perlu mengisi field itu wajib pakai baris nyata, bukan randomUUID(). */
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

export interface SeededRegister {
  id: string;
}

/** Fixture regulatory_register minimal langsung via Prisma (BUKAN lewat
 * RegulatoryRegisterService.create() — sebagian besar test folder ini
 * fokus ke obligation/evaluation/license, register-nya sendiri cukup
 * baris ACTIVE polos, pola sama seedDocumentCategory 2.1). */
export async function seedRegulatoryRegister(tenantId: string, actorUserId: string, overrides: { status?: "ACTIVE" | "SUPERSEDED" | "REVOKED" } = {}): Promise<SeededRegister> {
  const register = await adminPrisma.regulatoryRegister.create({
    data: {
      tenantId,
      regulationType: "GOVERNMENT_REGULATION_PP",
      regulationNumber: `PP-${randomUUID().slice(0, 8)}`,
      title: "Fixture Regulation",
      applicableScope: "ALL_TENANT",
      status: overrides.status ?? "ACTIVE",
      createdBy: actorUserId,
      updatedBy: actorUserId,
    },
  });
  return { id: register.id };
}
