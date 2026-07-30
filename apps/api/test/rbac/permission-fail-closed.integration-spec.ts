import { INestApplication } from "@nestjs/common";
import request from "supertest";
import {
  adminPrisma,
  finishTestApp,
  flushTestRedis,
  generatePkcePair,
  generateTotpCode,
  seedTenantFixture,
  testingModuleBuilder,
  TenantFixture,
} from "../auth/test-helpers";
import { PERMISSION_CACHE } from "../../src/platform/rbac/permission-cache.interface";
import { PERMISSION_REPOSITORY } from "../../src/platform/rbac/permission-repository.interface";
import { assignSuperAdminPlatformRole } from "./test-helpers";

// Acceptance criterion task 0.8: "Test fail-closed lolos (cache down ->
// resolve DB; DB down -> 503 bukan bypass)". Simulasi via DI overrideProvider
// (fault injection) — BUKAN mematikan proses Redis/Postgres sungguhan, karena
// instance itu dipakai bareng file *.integration-spec.ts lain yang jalan
// berdampingan (lihat plan §"Simulating Redis down/DB down").
describe("RBAC — fail-closed (acceptance criterion task 0.8)", () => {
  async function loginAndGetAccessToken(app: INestApplication, fixture: TenantFixture, totpCode?: string): Promise<string> {
    const { verifier, challenge } = generatePkcePair();
    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-tenant-id", fixture.tenantId)
      .send({
        email: fixture.email,
        password: fixture.password,
        codeChallenge: challenge,
        codeChallengeMethod: "S256",
        totpCode,
      })
      .expect(201);

    const tokenRes = await request(app.getHttpServer())
      .post("/auth/token")
      .send({ grantType: "authorization_code", code: loginRes.body.data.code, codeVerifier: verifier })
      .expect(201);

    return tokenRes.body.data.accessToken;
  }

  afterAll(async () => {
    await adminPrisma.$disconnect();
  });

  it("Redis (permission cache) down -> tetap resolve BENAR via DB, bukan default-allow", async () => {
    await flushTestRedis();
    const brokenCache = {
      get: async () => {
        throw new Error("simulated Redis outage");
      },
      set: async () => undefined,
      invalidate: async () => undefined,
    };

    const moduleRef = await testingModuleBuilder().overrideProvider(PERMISSION_CACHE).useValue(brokenCache).compile();
    const app = await finishTestApp(moduleRef);

    try {
      const fixture = await seedTenantFixture();
      const { totpSecret } = await assignSuperAdminPlatformRole(fixture.userId, fixture.tenantId);
      const accessToken = await loginAndGetAccessToken(app, fixture, generateTotpCode(totpSecret));

      // Cache selalu "down" (throw), tapi resolusi tetap benar lewat DB —
      // user yang PUNYA role harus tetap 200.
      await request(app.getHttpServer())
        .get("/rbac/permissions")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const otherFixture = await seedTenantFixture();
      const otherToken = await loginAndGetAccessToken(app, otherFixture);
      // User TANPA role, cache tetap down -> tetap 403 (bukan bug fail-open
      // yang meloloskan siapa saja saat cache bermasalah).
      await request(app.getHttpServer())
        .get("/rbac/permissions")
        .set("Authorization", `Bearer ${otherToken}`)
        .expect(403);
    } finally {
      await app.close();
    }
  });

  it("DB (permission repository) down -> 503, BUKAN bypass 200", async () => {
    await flushTestRedis();
    const brokenRepository = {
      resolveUserRoleAssignments: async () => {
        throw new Error("simulated DB outage");
      },
    };

    const moduleRef = await testingModuleBuilder()
      .overrideProvider(PERMISSION_REPOSITORY)
      .useValue(brokenRepository)
      .compile();
    const app = await finishTestApp(moduleRef);

    try {
      const fixture = await seedTenantFixture();
      const { totpSecret } = await assignSuperAdminPlatformRole(fixture.userId, fixture.tenantId);
      const accessToken = await loginAndGetAccessToken(app, fixture, generateTotpCode(totpSecret));

      // Cache kosong (baru login, belum pernah di-cache) -> resolve() harus
      // jatuh ke repository yang sengaja error -> 503.
      const res = await request(app.getHttpServer())
        .get("/rbac/permissions")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(503);
      expect(res.status).not.toBe(200);
    } finally {
      await app.close();
    }
  });
});
