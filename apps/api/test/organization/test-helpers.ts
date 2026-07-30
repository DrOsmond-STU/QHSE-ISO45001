import { Branch, Company, Department, Site } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { adminPrisma } from "../auth/test-helpers";

export { adminPrisma, createTestApp, finishTestApp, seedTenantFixture, testingModuleBuilder } from "../auth/test-helpers";
export { seedUserInTenant } from "../attachment/test-helpers";
export type { TenantFixture } from "../auth/test-helpers";

/** Seed langsung lewat adminPrisma (BYPASS OrganizationService/BR validation)
 * — dipakai test yang cuma butuh SATU pohon organisasi valid utk RLS/
 * hierarchy resolution, bukan menguji BR itu sendiri (pola sama
 * seedNumberingConfig 0.10: "authoring BUKAN cakupan task ini, seed
 * langsung lewat Prisma di test"). Test business-rules pakai
 * OrganizationService sungguhan langsung, bukan helper ini. */
export async function seedOrganizationTree(
  tenantId: string,
  userId: string,
): Promise<{ company: Company; branch: Branch; site: Site; department: Department }> {
  const company = await adminPrisma.company.create({
    data: {
      tenantId,
      companyCode: `CO-${randomUUID().slice(0, 8)}`,
      legalName: "PT Fixture Company",
      displayName: "Fixture Company",
      createdBy: userId,
      updatedBy: userId,
    },
  });

  const branch = await adminPrisma.branch.create({
    data: {
      tenantId,
      companyId: company.id,
      branchCode: `BR-${randomUUID().slice(0, 8)}`,
      name: "Fixture Branch",
      createdBy: userId,
      updatedBy: userId,
    },
  });

  const site = await adminPrisma.site.create({
    data: {
      tenantId,
      companyId: company.id,
      branchId: branch.id,
      siteCode: `SITE-${randomUUID().slice(0, 8)}`,
      name: "Fixture Site",
      siteType: "PERMANENT",
      createdBy: userId,
      updatedBy: userId,
    },
  });

  const department = await adminPrisma.department.create({
    data: {
      tenantId,
      companyId: company.id,
      branchId: branch.id,
      siteId: site.id,
      departmentCode: `DEPT-${randomUUID().slice(0, 8)}`,
      name: "Fixture Department",
      createdBy: userId,
      updatedBy: userId,
    },
  });

  return { company, branch, site, department };
}
