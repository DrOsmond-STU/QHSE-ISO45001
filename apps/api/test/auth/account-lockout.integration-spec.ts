import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { adminPrisma, createTestApp, flushTestRedis, generatePkcePair, seedTenantFixture, TenantFixture } from "./test-helpers";

describe("Auth — account lockout (PasswordPolicy.maxFailedAttempts/lockoutDurationMinutes)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  function attemptLogin(fixture: TenantFixture, password: string) {
    const { challenge } = generatePkcePair();
    return request(app.getHttpServer())
      .post("/auth/login")
      .set("x-tenant-id", fixture.tenantId)
      .send({ email: fixture.email, password, codeChallenge: challenge, codeChallengeMethod: "S256" });
  }

  it("N percobaan salah mengunci akun; password yang BENAR pun ditolak selagi locked", async () => {
    const fixture = await seedTenantFixture({ maxFailedAttempts: 3, lockoutDurationMinutes: 30 });

    for (let i = 0; i < 3; i++) {
      await attemptLogin(fixture, "password-salah").expect(401);
    }

    const user = await adminPrisma.user.findUnique({ where: { id: fixture.userId } });
    expect(user?.failedLoginAttempts).toBe(3);
    expect(user?.lockedUntil).not.toBeNull();
    expect(user!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    // Password BENAR tetap ditolak selagi locked.
    await attemptLogin(fixture, fixture.password).expect(401);
  });

  it("login sukses mereset failedLoginAttempts & lockedUntil ke nol/null", async () => {
    const fixture = await seedTenantFixture({ maxFailedAttempts: 3, lockoutDurationMinutes: 30 });

    await attemptLogin(fixture, "password-salah").expect(401);
    const afterFailure = await adminPrisma.user.findUnique({ where: { id: fixture.userId } });
    expect(afterFailure?.failedLoginAttempts).toBe(1);

    await attemptLogin(fixture, fixture.password).expect(201);
    const afterSuccess = await adminPrisma.user.findUnique({ where: { id: fixture.userId } });
    expect(afterSuccess?.failedLoginAttempts).toBe(0);
    expect(afterSuccess?.lockedUntil).toBeNull();
  });
});
