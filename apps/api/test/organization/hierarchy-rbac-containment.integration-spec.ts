import { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PermissionService } from "../../src/platform/rbac/permission.service";
import { assignSuperAdminPlatformRole, seedCustomScopedRole } from "../rbac/test-helpers";
import { adminPrisma, createTestApp, seedOrganizationTree, seedTenantFixture } from "./test-helpers";

// Task 1.1 acceptance criterion literal: "hierarki dipakai benar oleh scope
// filter RBAC" — menguji containment turun (Master PRD §8.3: "HSE Officer
// scope Site X melihat Site X dan turunannya/Department di bawahnya")
// SUNGGUHAN lewat PermissionService (0.8) + PrismaScopeHierarchyResolver
// (1.1), bukan cuma pure function permission-resolution.spec.ts.
describe("RBAC — containment hierarki organisasi (task 1.1)", () => {
  let app: INestApplication;
  let permissionService: PermissionService;

  beforeAll(async () => {
    app = await createTestApp();
    permissionService = app.get(PermissionService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  it("getScopedIds: user scope BRANCH melihat SITE turunannya (bukan cuma exact match)", async () => {
    const fixture = await seedTenantFixture();
    const { branch, site } = await seedOrganizationTree(fixture.tenantId, fixture.userId);
    // Site KEDUA di branch yang SAMA -- keduanya harus masuk hasil.
    const site2 = await adminPrisma.site.create({
      data: {
        tenantId: fixture.tenantId,
        companyId: branch.companyId,
        branchId: branch.id,
        siteCode: `SITE-${randomUUID().slice(0, 8)}`,
        name: "Fixture Site 2",
        siteType: "PERMANENT",
        createdBy: fixture.userId,
        updatedBy: fixture.userId,
      },
    });

    await seedCustomScopedRole({
      tenantId: fixture.tenantId,
      userId: fixture.userId,
      permissionCode: "work_permit.permit.read",
      scopeType: "BRANCH",
      scopeId: branch.id,
    });

    const result = await permissionService.getScopedIds(fixture.userId, fixture.tenantId, "SITE");
    expect(result.unrestricted).toBe(false);
    if (!result.unrestricted) {
      expect(result.ids.sort()).toEqual([site.id, site2.id].sort());
    }
  });

  it("getScopedIds: user scope BRANCH TIDAK melihat site di branch LAIN (isolasi horizontal tetap berlaku)", async () => {
    const fixture = await seedTenantFixture();
    const tree1 = await seedOrganizationTree(fixture.tenantId, fixture.userId);
    // Branch KEDUA (company sama), dengan site sendiri -- TIDAK boleh
    // terlihat dari scope branch pertama.
    const otherBranch = await adminPrisma.branch.create({
      data: {
        tenantId: fixture.tenantId,
        companyId: tree1.company.id,
        branchCode: `BR-${randomUUID().slice(0, 8)}`,
        name: "Other Branch",
        createdBy: fixture.userId,
        updatedBy: fixture.userId,
      },
    });
    await adminPrisma.site.create({
      data: {
        tenantId: fixture.tenantId,
        companyId: tree1.company.id,
        branchId: otherBranch.id,
        siteCode: `SITE-${randomUUID().slice(0, 8)}`,
        name: "Other Branch Site",
        siteType: "PERMANENT",
        createdBy: fixture.userId,
        updatedBy: fixture.userId,
      },
    });

    await seedCustomScopedRole({
      tenantId: fixture.tenantId,
      userId: fixture.userId,
      permissionCode: "work_permit.permit.read",
      scopeType: "BRANCH",
      scopeId: tree1.branch.id,
    });

    const result = await permissionService.getScopedIds(fixture.userId, fixture.tenantId, "SITE");
    expect(result.unrestricted).toBe(false);
    if (!result.unrestricted) {
      expect(result.ids).toEqual([tree1.site.id]);
    }
  });

  it("hasPermission: scope COMPANY mencakup DEPARTMENT 2 level di bawahnya", async () => {
    const fixture = await seedTenantFixture();
    const { company, department } = await seedOrganizationTree(fixture.tenantId, fixture.userId);

    await seedCustomScopedRole({
      tenantId: fixture.tenantId,
      userId: fixture.userId,
      permissionCode: "inspection.finding.read",
      scopeType: "COMPANY",
      scopeId: company.id,
    });

    const allowed = await permissionService.hasPermission(fixture.userId, fixture.tenantId, "inspection.finding.read", {
      scopeType: "DEPARTMENT",
      scopeId: department.id,
    });
    expect(allowed).toBe(true);
  });

  it("hasPermission: scope DEPARTMENT TIDAK mencakup ke ATAS (site induknya)", async () => {
    const fixture = await seedTenantFixture();
    const { site, department } = await seedOrganizationTree(fixture.tenantId, fixture.userId);

    await seedCustomScopedRole({
      tenantId: fixture.tenantId,
      userId: fixture.userId,
      permissionCode: "inspection.finding.read",
      scopeType: "DEPARTMENT",
      scopeId: department.id,
    });

    const allowed = await permissionService.hasPermission(fixture.userId, fixture.tenantId, "inspection.finding.read", {
      scopeType: "SITE",
      scopeId: site.id,
    });
    expect(allowed).toBe(false);
  });

  it("hasPermission: scopeContext menunjuk entity yang TIDAK ADA -> fail closed (false, bukan crash/500)", async () => {
    const fixture = await seedTenantFixture();
    const { branch } = await seedOrganizationTree(fixture.tenantId, fixture.userId);

    await seedCustomScopedRole({
      tenantId: fixture.tenantId,
      userId: fixture.userId,
      permissionCode: "inspection.finding.read",
      scopeType: "BRANCH",
      scopeId: branch.id,
    });

    await expect(
      permissionService.hasPermission(fixture.userId, fixture.tenantId, "inspection.finding.read", {
        scopeType: "SITE",
        scopeId: randomUUID(), // site yang tidak pernah dibuat
      }),
    ).resolves.toBe(false);
  });

  it("hasPermission: TENANT scope (SUPER_ADMIN_PLATFORM) tetap tembus containment apapun", async () => {
    const fixture = await seedTenantFixture();
    const { department } = await seedOrganizationTree(fixture.tenantId, fixture.userId);
    await assignSuperAdminPlatformRole(fixture.userId, fixture.tenantId);

    const allowed = await permissionService.hasPermission(fixture.userId, fixture.tenantId, "user_mgmt.permission.manage", {
      scopeType: "DEPARTMENT",
      scopeId: department.id,
    });
    expect(allowed).toBe(true);
  });

  it("getScopedIds: dua tenant berbeda dgn hierarki mirip tidak saling bocor (RLS tetap berlaku di atas containment)", async () => {
    const fixtureA = await seedTenantFixture();
    const fixtureB = await seedTenantFixture();
    const treeA = await seedOrganizationTree(fixtureA.tenantId, fixtureA.userId);
    await seedOrganizationTree(fixtureB.tenantId, fixtureB.userId);

    await seedCustomScopedRole({
      tenantId: fixtureA.tenantId,
      userId: fixtureA.userId,
      permissionCode: "work_permit.permit.read",
      scopeType: "COMPANY",
      scopeId: treeA.company.id,
    });

    const result = await permissionService.getScopedIds(fixtureA.userId, fixtureA.tenantId, "SITE");
    expect(result.unrestricted).toBe(false);
    if (!result.unrestricted) {
      expect(result.ids).toEqual([treeA.site.id]);
    }
  });
});
