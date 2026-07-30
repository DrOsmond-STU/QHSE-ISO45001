import { ConflictException, INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { RoleService, SystemRoleImmutableError } from "../../src/modules/domains/user-role/role.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedTenantFixture } from "./test-helpers";

describe("RoleService (Modul 02 §6 BR-05)", () => {
  let app: INestApplication;
  let service: RoleService;

  beforeAll(async () => {
    app = await createTestApp();
    service = app.get(RoleService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  function asUser<T>(tenantId: string, userId: string, fn: () => Promise<T>): Promise<T> {
    return tenantContextStorage.run({ tenantId, userId }, fn);
  }

  it("createRole() membuat role kustom tenant (isSystemRole=false)", async () => {
    const fixture = await seedTenantFixture();
    const role = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createRole({ roleCode: `CUSTOM-${randomUUID().slice(0, 8)}`, name: "Role Kustom" }),
    );
    expect(role.isSystemRole).toBe(false);
    expect(role.tenantId).toBe(fixture.tenantId);
  });

  it("createRole() menolak role_code duplikat dalam tenant yang sama", async () => {
    const fixture = await seedTenantFixture();
    const roleCode = `DUP-${randomUUID().slice(0, 8)}`;
    await asUser(fixture.tenantId, fixture.userId, () => service.createRole({ roleCode, name: "Pertama" }));

    await expect(
      asUser(fixture.tenantId, fixture.userId, () => service.createRole({ roleCode, name: "Kedua" })),
    ).rejects.toThrow();
  });

  it("BR-05: cloneSystemRole() menyalin role_permissions role sistem sebagai starting point", async () => {
    const fixture = await seedTenantFixture();
    const source = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode: "HSE_MANAGER" } });
    const sourcePermCount = await adminPrisma.rolePermission.count({ where: { roleId: source.id } });
    expect(sourcePermCount).toBeGreaterThan(0);

    const cloned = await asUser(fixture.tenantId, fixture.userId, () =>
      service.cloneSystemRole(source.id, `HSE_MANAGER_CLONE_${randomUUID().slice(0, 8)}`, "HSE Manager (Kustom Tenant Ini)"),
    );

    expect(cloned.basedOnRoleId).toBe(source.id);
    expect(cloned.isSystemRole).toBe(false);
    expect(cloned.tenantId).toBe(fixture.tenantId);

    const clonedPermCount = await adminPrisma.rolePermission.count({ where: { roleId: cloned.id } });
    expect(clonedPermCount).toBe(sourcePermCount);
  });

  it("BR-05: updateRolePermissions() menolak fail-closed untuk role sistem", async () => {
    const systemRole = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode: "WORKER_EMPLOYEE" } });
    const somePermission = await adminPrisma.permission.findFirstOrThrow({ where: { permissionCode: "user_mgmt.user.read_self" } });

    const fixture = await seedTenantFixture();
    await expect(
      asUser(fixture.tenantId, fixture.userId, () => service.updateRolePermissions(systemRole.id, [somePermission.id])),
    ).rejects.toThrow(SystemRoleImmutableError);
  });

  it("BR-05: updateRolePermissions() lolos untuk role kustom, rekonsiliasi additive+subtractive", async () => {
    const fixture = await seedTenantFixture();
    const custom = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createRole({ roleCode: `RECONCILE-${randomUUID().slice(0, 8)}`, name: "Reconcile Test" }),
    );

    const [permA, permB, permC] = await Promise.all([
      adminPrisma.permission.findFirstOrThrow({ where: { permissionCode: "org.site.read" } }),
      adminPrisma.permission.findFirstOrThrow({ where: { permissionCode: "org.department.read" } }),
      adminPrisma.permission.findFirstOrThrow({ where: { permissionCode: "org.branch.read" } }),
    ]);

    await asUser(fixture.tenantId, fixture.userId, () => service.updateRolePermissions(custom.id, [permA.id, permB.id]));
    let links = await adminPrisma.rolePermission.findMany({ where: { roleId: custom.id } });
    expect(links.map((l) => l.permissionId).sort()).toEqual([permA.id, permB.id].sort());

    // Ganti ke [permB, permC] — permA harus hilang, permC harus muncul, permB tetap.
    await asUser(fixture.tenantId, fixture.userId, () => service.updateRolePermissions(custom.id, [permB.id, permC.id]));
    links = await adminPrisma.rolePermission.findMany({ where: { roleId: custom.id } });
    expect(links.map((l) => l.permissionId).sort()).toEqual([permB.id, permC.id].sort());
  });

  it("BR-05: deactivateRole() menolak role sistem, lolos untuk role kustom", async () => {
    const systemRole = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode: "SUPERVISOR" } });
    const fixture = await seedTenantFixture();

    await expect(
      asUser(fixture.tenantId, fixture.userId, () => service.deactivateRole(systemRole.id)),
    ).rejects.toThrow(ConflictException);

    const custom = await asUser(fixture.tenantId, fixture.userId, () =>
      service.createRole({ roleCode: `DEACT-${randomUUID().slice(0, 8)}`, name: "Deactivate Test" }),
    );
    const deactivated = await asUser(fixture.tenantId, fixture.userId, () => service.deactivateRole(custom.id));
    expect(deactivated.status).toBe("INACTIVE");
  });
});

describe("RBAC baseline roster (Master PRD §8.2 + Modul 01/02 §3)", () => {
  it("13 role sistem baseline ada, tenant_id NULL", async () => {
    const expectedCodes = [
      "SUPER_ADMIN_PLATFORM",
      "TENANT_ADMIN",
      "COMPANY_ADMIN",
      "HSE_MANAGER",
      "HSE_OFFICER",
      "DEPARTMENT_HEAD",
      "SUPERVISOR",
      "AUDITOR_INTERNAL",
      "AUDITOR_EXTERNAL",
      "WORKER_EMPLOYEE",
      "CONTRACTOR_USER",
      "VISITOR_SELF_SERVICE",
      "OCCUPATIONAL_HEALTH_STAFF",
    ];
    const roles = await adminPrisma.role.findMany({ where: { tenantId: null, roleCode: { in: expectedCodes } } });
    expect(roles).toHaveLength(expectedCodes.length);
    expect(roles.every((r) => r.isSystemRole)).toBe(true);
  });

  it("SUPER_ADMIN_PLATFORM punya org.tenant.create dan user_mgmt.permission.manage", async () => {
    const role = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode: "SUPER_ADMIN_PLATFORM" } });
    const codes = await adminPrisma.rolePermission
      .findMany({ where: { roleId: role.id }, include: { permission: true } })
      .then((rows) => rows.map((r) => r.permission.permissionCode));

    expect(codes).toContain("org.tenant.create");
    expect(codes).toContain("user_mgmt.permission.manage");
    expect(codes).not.toContain("org.tenant.delete"); // action ini tidak ada di katalog literal PRD
  });

  it("TENANT_ADMIN TIDAK punya user_mgmt.user.impersonate (Super Admin Platform saja)", async () => {
    const role = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode: "TENANT_ADMIN" } });
    const codes = await adminPrisma.rolePermission
      .findMany({ where: { roleId: role.id }, include: { permission: true } })
      .then((rows) => rows.map((r) => r.permission.permissionCode));

    expect(codes).not.toContain("user_mgmt.user.impersonate");
    expect(codes).toContain("user_mgmt.user_role.assign");
  });

  it("seluruh 13 role punya permission 'seluruh user terautentikasi' (mis. user_mgmt.user.read_self)", async () => {
    const roles = await adminPrisma.role.findMany({ where: { tenantId: null, isSystemRole: true } });
    for (const role of roles) {
      const hasReadSelf = await adminPrisma.rolePermission.findFirst({
        where: { roleId: role.id, permission: { permissionCode: "user_mgmt.user.read_self" } },
      });
      expect(hasReadSelf).not.toBeNull();
    }
  });
});
