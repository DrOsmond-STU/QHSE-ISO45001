import { INestApplication } from "@nestjs/common";
import request from "supertest";
import {
  adminPrisma,
  createTestApp,
  flushTestRedis,
  generatePkcePair,
  generateTotpCode,
  seedTenantFixture,
  TenantFixture,
} from "../auth/test-helpers";
import { assignSuperAdminPlatformRole, PERMISSION_MANAGE_CODE } from "./test-helpers";

// TDD §8.2 — @RequirePermission di level route via PermissionGuard.
describe("RBAC — PermissionGuard (@RequirePermission)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function loginAndGetAccessToken(fixture: TenantFixture, totpCode?: string): Promise<string> {
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

  it("tanpa Bearer token -> 401 (JwtAuthGuard, dijalankan sebelum PermissionGuard)", async () => {
    await request(app.getHttpServer()).get("/rbac/permissions").expect(401);
  });

  it("Bearer token valid TAPI tidak punya role SUPER_ADMIN_PLATFORM -> 403", async () => {
    const fixture = await seedTenantFixture();
    const accessToken = await loginAndGetAccessToken(fixture);

    await request(app.getHttpServer()).get("/rbac/permissions").set("Authorization", `Bearer ${accessToken}`).expect(403);
  });

  it("Bearer token valid DENGAN role SUPER_ADMIN_PLATFORM -> 200, berisi permission katalog", async () => {
    const fixture = await seedTenantFixture();
    // SUPER_ADMIN_PLATFORM sekarang mewajibkan MFA (task 0.7 + 0.8 role
    // sungguhan) — helper ini otomatis enroll MFA juga.
    const { totpSecret } = await assignSuperAdminPlatformRole(fixture.userId, fixture.tenantId);
    const accessToken = await loginAndGetAccessToken(fixture, generateTotpCode(totpSecret));

    const res = await request(app.getHttpServer())
      .get("/rbac/permissions")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.some((p: { permissionCode: string }) => p.permissionCode === PERMISSION_MANAGE_CODE)).toBe(true);
  });

  it("route tanpa @RequirePermission (mis. /auth/logout-all) TIDAK terdampak PermissionGuard", async () => {
    const fixture = await seedTenantFixture();
    const accessToken = await loginAndGetAccessToken(fixture);

    // User biasa tanpa role apa pun tetap bisa logout-all (self-service,
    // tidak butuh permission apa pun) — membuktikan PermissionGuard no-op.
    await request(app.getHttpServer())
      .post("/auth/logout-all")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);
  });
});
