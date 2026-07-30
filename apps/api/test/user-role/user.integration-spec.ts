import { BadRequestException, INestApplication, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { UserLifecycleError } from "../../src/modules/domains/user-role/user-lifecycle";
import { UserService } from "../../src/modules/domains/user-role/user.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, seedOrganizationTree, seedTenantFixture } from "./test-helpers";

describe("UserService (Modul 02 §4/§6)", () => {
  let app: INestApplication;
  let service: UserService;

  beforeAll(async () => {
    app = await createTestApp();
    service = app.get(UserService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  function asUser<T>(tenantId: string, userId: string, fn: () => Promise<T>): Promise<T> {
    return tenantContextStorage.run({ tenantId, userId }, fn);
  }

  it("inviteUser() membuat user status INVITED dengan invitedAt terisi", async () => {
    const fixture = await seedTenantFixture();
    const email = `invited-${randomUUID()}@qhse.local`;

    const invited = await asUser(fixture.tenantId, fixture.userId, () =>
      service.inviteUser({ email, fullName: "User Diundang" }),
    );

    expect(invited.status).toBe("INVITED");
    expect(invited.invitedAt).not.toBeNull();
    expect(invited.tenantId).toBe(fixture.tenantId);
  });

  it("BR-01: inviteUser() menolak email duplikat dalam tenant yang sama", async () => {
    const fixture = await seedTenantFixture();
    const email = `dup-${randomUUID()}@qhse.local`;
    await asUser(fixture.tenantId, fixture.userId, () => service.inviteUser({ email, fullName: "Pertama" }));

    await expect(
      asUser(fixture.tenantId, fixture.userId, () => service.inviteUser({ email, fullName: "Kedua" })),
    ).rejects.toThrow();
  });

  it("BR-01: email yang SAMA boleh dipakai di tenant BERBEDA (bukan unik global)", async () => {
    const fixtureA = await seedTenantFixture();
    const fixtureB = await seedTenantFixture();
    const email = `cross-tenant-${randomUUID()}@qhse.local`;

    await expect(
      asUser(fixtureA.tenantId, fixtureA.userId, () => service.inviteUser({ email, fullName: "Di Tenant A" })),
    ).resolves.toBeDefined();
    await expect(
      asUser(fixtureB.tenantId, fixtureB.userId, () => service.inviteUser({ email, fullName: "Di Tenant B" })),
    ).resolves.toBeDefined();
  });

  it("BR-09: employee_id duplikat dalam tenant yang sama ditolak, boleh NULL berulang", async () => {
    const fixture = await seedTenantFixture();
    const employeeId = `EMP-${randomUUID().slice(0, 8)}`;
    await asUser(fixture.tenantId, fixture.userId, () =>
      service.inviteUser({ email: `a-${randomUUID()}@qhse.local`, fullName: "A", employeeId }),
    );

    await expect(
      asUser(fixture.tenantId, fixture.userId, () =>
        service.inviteUser({ email: `b-${randomUUID()}@qhse.local`, fullName: "B", employeeId }),
      ),
    ).rejects.toThrow();

    // Dua kontraktor TANPA employee_id (NULL) dalam tenant yang sama harus lolos.
    await expect(
      asUser(fixture.tenantId, fixture.userId, () =>
        service.inviteUser({ email: `c-${randomUUID()}@qhse.local`, fullName: "C", userType: "CONTRACTOR" }),
      ),
    ).resolves.toBeDefined();
    await expect(
      asUser(fixture.tenantId, fixture.userId, () =>
        service.inviteUser({ email: `d-${randomUUID()}@qhse.local`, fullName: "D", userType: "CONTRACTOR" }),
      ),
    ).resolves.toBeDefined();
  });

  it("BR-02: lifecycle penuh INVITED->ACTIVE->SUSPENDED->ACTIVE->DEACTIVATED", async () => {
    const fixture = await seedTenantFixture();
    const invited = await asUser(fixture.tenantId, fixture.userId, () =>
      service.inviteUser({ email: `lifecycle-${randomUUID()}@qhse.local`, fullName: "Lifecycle User" }),
    );

    const active = await asUser(fixture.tenantId, fixture.userId, () => service.activateUser(invited.id));
    expect(active.status).toBe("ACTIVE");
    expect(active.activatedAt).not.toBeNull();

    const suspended = await asUser(fixture.tenantId, fixture.userId, () => service.suspendUser(invited.id, "Cuti panjang"));
    expect(suspended.status).toBe("SUSPENDED");
    expect(suspended.suspendedAt).not.toBeNull();

    const reactivated = await asUser(fixture.tenantId, fixture.userId, () => service.reactivateUser(invited.id));
    expect(reactivated.status).toBe("ACTIVE");

    const deactivated = await asUser(fixture.tenantId, fixture.userId, () => service.deactivateUser(invited.id));
    expect(deactivated.status).toBe("DEACTIVATED");
    expect(deactivated.deactivatedAt).not.toBeNull();
  });

  it("BR-02: transisi tidak valid ditolak (mis. INVITED->SUSPENDED, DEACTIVATED->ACTIVE)", async () => {
    const fixture = await seedTenantFixture();
    const invited = await asUser(fixture.tenantId, fixture.userId, () =>
      service.inviteUser({ email: `invalid-${randomUUID()}@qhse.local`, fullName: "Invalid Transition" }),
    );

    await expect(asUser(fixture.tenantId, fixture.userId, () => service.suspendUser(invited.id, "alasan"))).rejects.toThrow(
      UserLifecycleError,
    );

    await asUser(fixture.tenantId, fixture.userId, () => service.activateUser(invited.id));
    await asUser(fixture.tenantId, fixture.userId, () => service.deactivateUser(invited.id));

    await expect(asUser(fixture.tenantId, fixture.userId, () => service.activateUser(invited.id))).rejects.toThrow(
      UserLifecycleError,
    );
  });

  it("suspendUser() merevoke SELURUH sesi aktif dan mencatat reason ke system_audit_logs", async () => {
    const fixture = await seedTenantFixture();
    const user = await asUser(fixture.tenantId, fixture.userId, () =>
      service.inviteUser({ email: `sess-${randomUUID()}@qhse.local`, fullName: "Punya Sesi" }),
    );
    await asUser(fixture.tenantId, fixture.userId, () => service.activateUser(user.id));

    await adminPrisma.userSession.create({
      data: {
        tenantId: fixture.tenantId,
        userId: user.id,
        sessionTokenHash: "hash-1",
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await asUser(fixture.tenantId, fixture.userId, () => service.suspendUser(user.id, "Pelanggaran kebijakan"));

    const sessions = await adminPrisma.userSession.findMany({ where: { userId: user.id } });
    expect(sessions.every((s) => s.revoked === true && s.revokedReason === "SUSPENDED")).toBe(true);

    const auditRows = await adminPrisma.$queryRaw<Array<{ after_value: unknown }>>`
      SELECT after_value FROM system_audit_logs
      WHERE entity_type = 'users' AND entity_id = ${user.id}::uuid AND action = 'USER_SUSPEND'
    `;
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].after_value).toEqual({ reason: "Pelanggaran kebijakan" });
  });

  it("deactivateUser() men-nonaktifkan SELURUH user_roles (bukan menghapus)", async () => {
    const fixture = await seedTenantFixture();
    const user = await asUser(fixture.tenantId, fixture.userId, () =>
      service.inviteUser({ email: `deact-role-${randomUUID()}@qhse.local`, fullName: "Punya Role" }),
    );
    await asUser(fixture.tenantId, fixture.userId, () => service.activateUser(user.id));

    const role = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode: "WORKER_EMPLOYEE" } });
    const userRole = await asUser(fixture.tenantId, fixture.userId, () =>
      service.assignRole({ userId: user.id, roleId: role.id, scopeType: "TENANT" }),
    );

    await asUser(fixture.tenantId, fixture.userId, () => service.deactivateUser(user.id));

    const refreshed = await adminPrisma.userRole.findUniqueOrThrow({ where: { id: userRole.id } });
    expect(refreshed.status).toBe("INACTIVE");
  });

  it("BR-03: assignRole() menolak scope_id milik tenant lain (RLS memfilternya duluan -> NotFoundException, BUKAN BadRequestException — mencegah kebocoran info keberadaan entitas lintas tenant, lihat banner comment assertScopeBelongsToTenant())", async () => {
    const fixtureA = await seedTenantFixture();
    const fixtureB = await seedTenantFixture();
    const { company: companyB } = await seedOrganizationTree(fixtureB.tenantId, fixtureB.userId);
    const userA = await asUser(fixtureA.tenantId, fixtureA.userId, () =>
      service.inviteUser({ email: `scope-${randomUUID()}@qhse.local`, fullName: "Scope Test" }),
    );
    const role = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode: "COMPANY_ADMIN" } });

    await expect(
      asUser(fixtureA.tenantId, fixtureA.userId, () =>
        service.assignRole({ userId: userA.id, roleId: role.id, scopeType: "COMPANY", scopeId: companyB.id }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("BR-03: assignRole() dengan scope_id valid (company milik tenant sendiri) lolos", async () => {
    const fixture = await seedTenantFixture();
    const { company } = await seedOrganizationTree(fixture.tenantId, fixture.userId);
    const user = await asUser(fixture.tenantId, fixture.userId, () =>
      service.inviteUser({ email: `scope-ok-${randomUUID()}@qhse.local`, fullName: "Scope OK" }),
    );
    const role = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode: "COMPANY_ADMIN" } });

    const assigned = await asUser(fixture.tenantId, fixture.userId, () =>
      service.assignRole({ userId: user.id, roleId: role.id, scopeType: "COMPANY", scopeId: company.id }),
    );
    expect(assigned.scopeId).toBe(company.id);
    expect(assigned.status).toBe("ACTIVE");
  });

  it("BR-03: scope_id tidak ditemukan sama sekali -> NotFoundException", async () => {
    const fixture = await seedTenantFixture();
    const user = await asUser(fixture.tenantId, fixture.userId, () =>
      service.inviteUser({ email: `scope-missing-${randomUUID()}@qhse.local`, fullName: "Scope Missing" }),
    );
    const role = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode: "COMPANY_ADMIN" } });

    await expect(
      asUser(fixture.tenantId, fixture.userId, () =>
        service.assignRole({ userId: user.id, roleId: role.id, scopeType: "COMPANY", scopeId: randomUUID() }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("scope_type=TENANT wajib scope_id NULL", async () => {
    const fixture = await seedTenantFixture();
    const { company } = await seedOrganizationTree(fixture.tenantId, fixture.userId);
    const user = await asUser(fixture.tenantId, fixture.userId, () =>
      service.inviteUser({ email: `tenant-scope-${randomUUID()}@qhse.local`, fullName: "Tenant Scope" }),
    );
    const role = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode: "TENANT_ADMIN" } });

    await expect(
      asUser(fixture.tenantId, fixture.userId, () =>
        service.assignRole({ userId: user.id, roleId: role.id, scopeType: "TENANT", scopeId: company.id }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("revokeRole() men-nonaktifkan user_role (status INACTIVE)", async () => {
    const fixture = await seedTenantFixture();
    const user = await asUser(fixture.tenantId, fixture.userId, () =>
      service.inviteUser({ email: `revoke-${randomUUID()}@qhse.local`, fullName: "Revoke Test" }),
    );
    const role = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode: "WORKER_EMPLOYEE" } });
    const assigned = await asUser(fixture.tenantId, fixture.userId, () =>
      service.assignRole({ userId: user.id, roleId: role.id, scopeType: "TENANT" }),
    );

    const revoked = await asUser(fixture.tenantId, fixture.userId, () => service.revokeRole(assigned.id));
    expect(revoked.status).toBe("INACTIVE");
  });

  it("syncFromHris() memperbarui field HRIS + hrisLastSyncedAt", async () => {
    const fixture = await seedTenantFixture();
    const { department } = await seedOrganizationTree(fixture.tenantId, fixture.userId);
    const user = await asUser(fixture.tenantId, fixture.userId, () =>
      service.inviteUser({ email: `hris-${randomUUID()}@qhse.local`, fullName: "HRIS Sync" }),
    );

    const synced = await asUser(fixture.tenantId, fixture.userId, () =>
      service.syncFromHris(user.id, { departmentId: department.id, jobTitle: "HSE Officer", hrisSyncSource: "SAP-SuccessFactors" }),
    );
    expect(synced.departmentId).toBe(department.id);
    expect(synced.jobTitle).toBe("HSE Officer");
    expect(synced.hrisSyncSource).toBe("SAP-SuccessFactors");
    expect(synced.hrisLastSyncedAt).not.toBeNull();
  });
});
