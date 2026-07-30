import { ConflictException, INestApplication, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import * as argon2 from "argon2";
import request from "supertest";
import { ProvisioningService } from "../../src/modules/domains/system-administration/provisioning/provisioning.service";
import { EntitlementService } from "../../src/modules/domains/system-administration/provisioning/entitlement.service";
import { SubscriptionPlanService } from "../../src/modules/domains/system-administration/provisioning/subscription-plan.service";
import { UsageCounterScanService } from "../../src/modules/domains/system-administration/provisioning/usage-counter-scan.service";
import { UsageCounterService } from "../../src/modules/domains/system-administration/provisioning/usage-counter.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import {
  adminPrisma,
  createTestApp,
  extractCookie,
  flushTestRedis,
  generatePkcePair,
  generateTotpCode,
  seedSysadminFixture,
  seedTenantFixture,
} from "../auth/test-helpers";
import { seedOrganizationTree } from "../organization/test-helpers";

// E2E-4 (TESTING.md §7): "Provisioning tenant baru -> aktivasi modul via
// plan -> buat Tenant Admin pertama -> login pertama." Dibuktikan di SINI
// pada level API/service (bukan Playwright browser E2E sungguhan — belum
// ada UI apps/web utk provisioning/login sama sekali di codebase ini, gap
// TDD §26) — "login pertama" dibuktikan lewat panggilan NYATA ke
// POST /auth/login (0.6, tidak disentuh task ini) setelah password
// disimulasikan langsung (mensimulasikan user mengklik link undangan &
// set password sendiri — langkah itu SENDIRI di luar cakupan task 1.3/1.5,
// gap TDD §26 poin 31).
describe("ProvisioningService.provisionTenant() — E2E-4 & BR-01/02/04 (Modul 31)", () => {
  let app: INestApplication;
  let provisioningService: ProvisioningService;
  let subscriptionPlanService: SubscriptionPlanService;
  let entitlementService: EntitlementService;
  let usageCounterService: UsageCounterService;
  let usageCounterScanService: UsageCounterScanService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    provisioningService = app.get(ProvisioningService);
    subscriptionPlanService = app.get(SubscriptionPlanService);
    entitlementService = app.get(EntitlementService);
    usageCounterService = app.get(UsageCounterService);
    usageCounterScanService = app.get(UsageCounterScanService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function actAsSomeExistingUser<T>(fn: () => Promise<T>): Promise<T> {
    // provisionTenant() TIDAK butuh tenant context ambient sama sekali
    // (tidak pernah requireTenantId() — cross-tenant by design), cuma
    // actor user_id. Sysadmin fixture dipakai sbg "Super Admin Platform
    // yang provisioning" — pola bootstrap yang SAMA dgn task 1.1-1.4
    // (belum ada user_type=PLATFORM_ADMIN/tenant_id=NULL sungguhan, gap
    // TDD §26 poin 30).
    const admin = await seedSysadminFixture();
    return tenantContextStorage.run({ tenantId: admin.tenantId, userId: admin.userId }, fn);
  }

  it("E2E-4: provisionTenant() end-to-end — tenant ACTIVE, subscription+entitlements benar, Tenant Admin bisa login pertama sungguhan", async () => {
    const plans = await subscriptionPlanService.listActive();
    const standardPlan = plans.find((p) => p.planName === "Standard")!;
    const tenantAdminEmail = `tenant-admin-${randomUUID()}@qhse.local`;
    const tenantAdminPassword = "Str0ng!TenantAdminPassw0rd";

    const result = await actAsSomeExistingUser(() =>
      provisioningService.provisionTenant({
        tenantCode: `E2E4-${randomUUID().slice(0, 8)}`,
        legalName: "PT E2E-4 Test",
        displayName: "E2E-4 Test",
        subscriptionPlanId: standardPlan.id,
        tenantAdminEmail,
        tenantAdminFullName: "Tenant Admin E2E-4",
      }),
    );

    // 1. Tenant ACTIVE.
    expect(result.tenant.status).toBe("ACTIVE");
    expect(result.tenant.activatedAt).not.toBeNull();

    // 2. Subscription + entitlements aktif sesuai plan (BR-01).
    expect(result.tenantSubscription.subscriptionPlanId).toBe(standardPlan.id);
    const entitlements = await adminPrisma.moduleEntitlement.findMany({ where: { tenantId: result.tenant.id } });
    expect(entitlements.map((e) => e.moduleCode).sort()).toEqual([...standardPlan.includedModuleCodes].sort());
    expect(entitlements.every((e) => e.isEnabled)).toBe(true);

    // 3. Tenant Admin pertama dibuat + role TENANT_ADMIN ter-assign.
    expect(result.tenantAdminUser.email).toBe(tenantAdminEmail);
    expect(result.tenantAdminUser.status).toBe("INVITED");
    const tenantAdminRole = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode: "TENANT_ADMIN" } });
    const roleAssignment = await adminPrisma.userRole.findFirstOrThrow({
      where: { userId: result.tenantAdminUser.id, roleId: tenantAdminRole.id },
    });
    expect(roleAssignment.scopeType).toBe("TENANT");
    expect(roleAssignment.status).toBe("ACTIVE");

    // 4. "Login pertama" — simulasikan user menyelesaikan setup password
    // (di luar cakupan provisionTenant(), lihat banner comment atas), lalu
    // panggil /auth/login SUNGGUHAN (PKCE, 0.6, tidak dimodifikasi task ini).
    const passwordHash = await argon2.hash(tenantAdminPassword, { type: argon2.argon2id });
    await adminPrisma.user.update({
      where: { id: result.tenantAdminUser.id },
      data: { passwordHash, status: "ACTIVE", activatedAt: new Date() },
    });

    const { verifier, challenge } = generatePkcePair();
    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-tenant-id", result.tenant.id)
      .send({ email: tenantAdminEmail, password: tenantAdminPassword, codeChallenge: challenge, codeChallengeMethod: "S256" })
      .expect(201);

    const tokenRes = await request(app.getHttpServer())
      .post("/auth/token")
      .send({ grantType: "authorization_code", code: loginRes.body.data.code, codeVerifier: verifier })
      .expect(201);

    expect(tokenRes.body.data.accessToken).toBeDefined();
    expect(extractCookie(tokenRes.headers["set-cookie"], "refresh_token")).toBeDefined();
  });

  it("provisionTenant() menolak subscription_plan_id yang tidak ada/tidak aktif", async () => {
    await expect(
      actAsSomeExistingUser(() =>
        provisioningService.provisionTenant({
          tenantCode: `BAD-${randomUUID().slice(0, 8)}`,
          legalName: "PT Bad Plan",
          displayName: "Bad Plan",
          subscriptionPlanId: randomUUID(),
          tenantAdminEmail: `bad-${randomUUID()}@qhse.local`,
          tenantAdminFullName: "Bad Plan Admin",
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("provisionTenant() menolak tenant_code duplikat", async () => {
    const plans = await subscriptionPlanService.listActive();
    const corePlan = plans.find((p) => p.planName === "Core")!;
    const tenantCode = `DUP-${randomUUID().slice(0, 8)}`;

    await actAsSomeExistingUser(() =>
      provisioningService.provisionTenant({
        tenantCode,
        legalName: "PT Dup Pertama",
        displayName: "Dup Pertama",
        subscriptionPlanId: corePlan.id,
        tenantAdminEmail: `dup1-${randomUUID()}@qhse.local`,
        tenantAdminFullName: "Dup Admin 1",
      }),
    );

    await expect(
      actAsSomeExistingUser(() =>
        provisioningService.provisionTenant({
          tenantCode,
          legalName: "PT Dup Kedua",
          displayName: "Dup Kedua",
          subscriptionPlanId: corePlan.id,
          tenantAdminEmail: `dup2-${randomUUID()}@qhse.local`,
          tenantAdminFullName: "Dup Admin 2",
        }),
      ),
    ).rejects.toThrow(ConflictException);
  });

  describe("BR-01 — EntitlementGuard (module_entitlements.is_enabled=false memblokir akses API secara penuh)", () => {
    it("tenant dengan module_entitlements USER_MGMT is_enabled=false -> GET /rbac/permissions ditolak walau permission-nya sendiri valid", async () => {
      const admin = await seedSysadminFixture();
      // Sysadmin fixture TIDAK py tenant_subscriptions sama sekali secara
      // default (baseline pra-1.5) -- tambahkan SUPAYA tenant ini tunduk
      // fail-closed (bukan fail-open jalur legacy).
      const plans = await subscriptionPlanService.listActive();
      await adminPrisma.tenantSubscription.create({
        data: {
          tenantId: admin.tenantId,
          subscriptionPlanId: plans[0].id,
          billingPeriod: "MONTHLY",
          createdBy: admin.userId,
          updatedBy: admin.userId,
        },
      });
      await tenantContextStorage.run({ tenantId: admin.tenantId, userId: admin.userId }, () =>
        entitlementService.override({ tenantId: admin.tenantId, moduleCode: "USER_MGMT", isEnabled: false, overrideReason: "test BR-01" }),
      );

      const { verifier, challenge } = generatePkcePair();
      const loginRes = await request(app.getHttpServer())
        .post("/auth/login")
        .set("x-tenant-id", admin.tenantId)
        .send({
          email: admin.email,
          password: admin.password,
          totpCode: generateTotpCode(admin.totpSecret),
          codeChallenge: challenge,
          codeChallengeMethod: "S256",
        })
        .expect(201);
      const tokenRes = await request(app.getHttpServer())
        .post("/auth/token")
        .send({ grantType: "authorization_code", code: loginRes.body.data.code, codeVerifier: verifier })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/rbac/permissions")
        .set("Authorization", `Bearer ${tokenRes.body.data.accessToken}`)
        .expect(403);
      expect(res.body.detail ?? JSON.stringify(res.body)).toMatch(/USER_MGMT/);
    });

    it("tenant dengan module_entitlements USER_MGMT is_enabled=true -> GET /rbac/permissions lolos gate entitlement (hasil akhir tetap tunduk PermissionGuard seperti biasa)", async () => {
      const admin = await seedSysadminFixture();
      const plans = await subscriptionPlanService.listActive();
      await adminPrisma.tenantSubscription.create({
        data: {
          tenantId: admin.tenantId,
          subscriptionPlanId: plans[0].id,
          billingPeriod: "MONTHLY",
          createdBy: admin.userId,
          updatedBy: admin.userId,
        },
      });
      await tenantContextStorage.run({ tenantId: admin.tenantId, userId: admin.userId }, () =>
        entitlementService.override({ tenantId: admin.tenantId, moduleCode: "USER_MGMT", isEnabled: true, overrideReason: "test BR-01" }),
      );

      const { verifier, challenge } = generatePkcePair();
      const loginRes = await request(app.getHttpServer())
        .post("/auth/login")
        .set("x-tenant-id", admin.tenantId)
        .send({
          email: admin.email,
          password: admin.password,
          totpCode: generateTotpCode(admin.totpSecret),
          codeChallenge: challenge,
          codeChallengeMethod: "S256",
        })
        .expect(201);
      const tokenRes = await request(app.getHttpServer())
        .post("/auth/token")
        .send({ grantType: "authorization_code", code: loginRes.body.data.code, codeVerifier: verifier })
        .expect(201);

      // Sysadmin fixture PUNYA role SUPER_ADMIN_PLATFORM -> permission
      // user_mgmt.permission.manage -> 200 (bukti guard entitlement LOLOS,
      // beda dari test sebelumnya yang 403 murni krn modul dinonaktifkan).
      await request(app.getHttpServer())
        .get("/rbac/permissions")
        .set("Authorization", `Bearer ${tokenRes.body.data.accessToken}`)
        .expect(200);
    });
  });

  describe("BR-04 — hanya override eksplisit yang bisa mengaktifkan modul di luar plan", () => {
    it("override() mencatat overriddenBy + overrideReason", async () => {
      const fixture = await seedTenantFixture();
      const overridden = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        entitlementService.override({
          tenantId: fixture.tenantId,
          moduleCode: "ORG",
          isEnabled: true,
          overrideReason: "pilot gratis",
        }),
      );
      expect(overridden.overriddenBy).toBe(fixture.userId);
      expect(overridden.overrideReason).toBe("pilot gratis");
      expect(overridden.isEnabled).toBe(true);
    });
  });

  describe("BR-02 — usage-counter-scan (snapshot tidak memblokir operasional)", () => {
    it("snapshot() mencatat ACTIVE_USERS/ACTIVE_SITES yang benar", async () => {
      const fixture = await seedTenantFixture();
      await seedOrganizationTree(fixture.tenantId, fixture.userId);

      const counters = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        usageCounterService.snapshot(fixture.tenantId),
      );

      const activeUsers = counters.find((c) => c.metricType === "ACTIVE_USERS")!;
      const activeSites = counters.find((c) => c.metricType === "ACTIVE_SITES")!;
      expect(activeUsers.currentValue).toBeGreaterThanOrEqual(1); // minimal fixture.userId sendiri
      expect(activeSites.currentValue).toBe(1); // seedOrganizationTree bikin 1 site
    });

    it("scan() cross-tenant tidak error walau tenant melebihi kuota plan (BR-02: TIDAK memblokir, cuma log)", async () => {
      const fixture = await seedTenantFixture();
      const plans = await subscriptionPlanService.listActive();
      const corePlan = plans.find((p) => p.planName === "Core")!; // maxSites: 3
      await adminPrisma.tenantSubscription.create({
        data: {
          tenantId: fixture.tenantId,
          subscriptionPlanId: corePlan.id,
          billingPeriod: "MONTHLY",
          createdBy: fixture.userId,
          updatedBy: fixture.userId,
        },
      });
      // Buat > maxSites (3) site sekaligus utk melampaui kuota Core.
      for (let i = 0; i < 4; i += 1) {
        await seedOrganizationTree(fixture.tenantId, fixture.userId);
      }

      await expect(usageCounterScanService.scan()).resolves.not.toThrow();

      const latestSites = await adminPrisma.usageCounter.findFirst({
        where: { tenantId: fixture.tenantId, metricType: "ACTIVE_SITES" },
        orderBy: { measuredAt: "desc" },
      });
      expect(latestSites?.currentValue).toBeGreaterThan(corePlan.maxSites!);
    });
  });
});
