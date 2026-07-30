import { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { adminPrisma, createTestApp, flushTestRedis, seedTenantFixture } from "../auth/test-helpers";
import { PermissionService } from "../../src/platform/rbac/permission.service";
import { seedCustomScopedRole, assignSuperAdminPlatformRole } from "./test-helpers";

// TDD §8.2 — data-scoping "query filter otomatis di repository layer".
// getScopedIds() adalah primitive yang akan dipakai repository domain
// (belum ada tabel domain sungguhan di 0.8) untuk menyusun WHERE ... IN (...).
describe("RBAC — getScopedIds (data-scoping primitive)", () => {
  let app: INestApplication;
  let permissionService: PermissionService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    permissionService = app.get(PermissionService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  it("user dengan role TENANT-scope -> unrestricted:true", async () => {
    const fixture = await seedTenantFixture();
    await assignSuperAdminPlatformRole(fixture.userId, fixture.tenantId);

    const result = await permissionService.getScopedIds(fixture.userId, fixture.tenantId, "SITE");
    expect(result).toEqual({ unrestricted: true });
  });

  it("user dengan role SITE-scope (2 site berbeda) -> ids berisi persis 2 site itu", async () => {
    const fixture = await seedTenantFixture();
    const siteA = randomUUID();
    const siteB = randomUUID();

    await seedCustomScopedRole({
      tenantId: fixture.tenantId,
      userId: fixture.userId,
      permissionCode: "work_permit.permit.read",
      scopeType: "SITE",
      scopeId: siteA,
    });
    await seedCustomScopedRole({
      tenantId: fixture.tenantId,
      userId: fixture.userId,
      permissionCode: "work_permit.permit.approve",
      scopeType: "SITE",
      scopeId: siteB,
    });

    const result = await permissionService.getScopedIds(fixture.userId, fixture.tenantId, "SITE");
    expect(result.unrestricted).toBe(false);
    if (!result.unrestricted) {
      expect(result.ids.sort()).toEqual([siteA, siteB].sort());
    }
  });

  it("user tanpa assignment sama sekali -> deny-all eksplisit (ids kosong), BUKAN unrestricted", async () => {
    const fixture = await seedTenantFixture();

    const result = await permissionService.getScopedIds(fixture.userId, fixture.tenantId, "SITE");
    expect(result).toEqual({ unrestricted: false, ids: [] });
  });
});
