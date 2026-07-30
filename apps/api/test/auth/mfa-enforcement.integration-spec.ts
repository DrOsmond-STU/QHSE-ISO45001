import { INestApplication } from "@nestjs/common";
import request from "supertest";
import {
  adminPrisma,
  createTestApp,
  flushTestRedis,
  generatePkcePair,
  generateTotpCode,
  seedSysadminFixture,
  seedSysadminWithoutMfaFixture,
  seedTenantFixture,
  TenantFixture,
} from "./test-helpers";

// Acceptance criterion task 0.7: "Login sysadmin.* tanpa MFA ditolak."
describe("Auth — MFA (TOTP) enforcement", () => {
  let app: INestApplication;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  function attemptLogin(fixture: TenantFixture, password: string, totpCode?: string) {
    const { challenge } = generatePkcePair();
    return request(app.getHttpServer())
      .post("/auth/login")
      .set("x-tenant-id", fixture.tenantId)
      .send({ email: fixture.email, password, codeChallenge: challenge, codeChallengeMethod: "S256", totpCode });
  }

  it("sysadmin.* TANPA MFA di-enroll ditolak login sama sekali (acceptance criterion)", async () => {
    const fixture = await seedSysadminWithoutMfaFixture();
    const res = await attemptLogin(fixture, fixture.password);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe("MFA_SETUP_REQUIRED");
  });

  it("sysadmin dengan MFA enrolled TANPA kode TOTP ditolak (bukan langsung dapat auth code)", async () => {
    const fixture = await seedSysadminFixture();
    const res = await attemptLogin(fixture, fixture.password);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("MFA_REQUIRED");
  });

  it("sysadmin dengan MFA enrolled + kode TOTP SALAH ditolak", async () => {
    const fixture = await seedSysadminFixture();
    const res = await attemptLogin(fixture, fixture.password, "000000");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("MFA_REQUIRED");
  });

  it("sysadmin dengan MFA enrolled + kode TOTP BENAR berhasil login", async () => {
    const fixture = await seedSysadminFixture();
    const code = generateTotpCode(fixture.totpSecret);
    const res = await attemptLogin(fixture, fixture.password, code);
    expect(res.status).toBe(201);
    expect(typeof res.body.data.code).toBe("string");
  });

  it("password salah TETAP 401 generik meski sysadmin (tidak bocorkan status MFA sebelum password benar)", async () => {
    const fixture = await seedSysadminFixture();
    const res = await attemptLogin(fixture, "password-salah-total");
    expect(res.status).toBe(401);
    expect(res.body.message).not.toBe("MFA_REQUIRED");
    expect(res.body.message).not.toBe("MFA_SETUP_REQUIRED");
  });

  describe("Alur enrollment MFA mandiri (non-sysadmin, opsional per tenant)", () => {
    async function loginNoMfaYet(fixture: TenantFixture): Promise<string> {
      const { verifier, challenge } = generatePkcePair();
      const loginRes = await request(app.getHttpServer())
        .post("/auth/login")
        .set("x-tenant-id", fixture.tenantId)
        .send({ email: fixture.email, password: fixture.password, codeChallenge: challenge, codeChallengeMethod: "S256" })
        .expect(201);

      const tokenRes = await request(app.getHttpServer())
        .post("/auth/token")
        .send({ grantType: "authorization_code", code: loginRes.body.data.code, codeVerifier: verifier })
        .expect(201);

      return tokenRes.body.data.accessToken;
    }

    it("setup -> confirm mengaktifkan MFA; login berikutnya butuh totpCode", async () => {
      const fixture = await seedTenantFixture();
      const accessToken = await loginNoMfaYet(fixture);

      const setupRes = await request(app.getHttpServer())
        .post("/auth/mfa/setup")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(201);
      const { secret, provisioningUri } = setupRes.body.data;
      expect(typeof secret).toBe("string");
      expect(provisioningUri).toContain("otpauth://totp/");

      // Sebelum confirm, mfaEnabled masih false — login normal masih bisa
      // tanpa kode.
      await attemptLogin(fixture, fixture.password).expect(201);

      const validCode = generateTotpCode(secret);
      await request(app.getHttpServer())
        .post("/auth/mfa/confirm")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ totpCode: validCode })
        .expect(204);

      // Setelah confirm, login TANPA kode ditolak.
      const withoutCode = await attemptLogin(fixture, fixture.password);
      expect(withoutCode.status).toBe(401);
      expect(withoutCode.body.message).toBe("MFA_REQUIRED");

      // Login DENGAN kode berikutnya berhasil.
      const nextCode = generateTotpCode(secret);
      await attemptLogin(fixture, fixture.password, nextCode).expect(201);
    });

    it("confirm dengan kode salah ditolak dan TIDAK mengaktifkan MFA", async () => {
      const fixture = await seedTenantFixture();
      const accessToken = await loginNoMfaYet(fixture);

      await request(app.getHttpServer())
        .post("/auth/mfa/setup")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post("/auth/mfa/confirm")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ totpCode: "000000" })
        .expect(401);

      const user = await adminPrisma.user.findUnique({ where: { id: fixture.userId } });
      expect(user?.mfaEnabled).toBe(false);
    });
  });
});
