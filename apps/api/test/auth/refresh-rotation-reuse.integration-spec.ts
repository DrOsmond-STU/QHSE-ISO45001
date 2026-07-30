import { INestApplication } from "@nestjs/common";
import request from "supertest";
import {
  adminPrisma,
  createTestApp,
  extractCookie,
  flushTestRedis,
  generatePkcePair,
  seedTenantFixture,
  TenantFixture,
} from "./test-helpers";

// Acceptance criterion task 0.6: "Refresh token reuse memicu revoke total."
describe("Auth — refresh token rotation & reuse detection", () => {
  let app: INestApplication;
  let fixture: TenantFixture;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    fixture = await seedTenantFixture();
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function loginAndExchange(): Promise<{ accessToken: string; refreshCookie: string }> {
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

    return {
      accessToken: tokenRes.body.data.accessToken,
      refreshCookie: extractCookie(tokenRes.headers["set-cookie"], "refresh_token")!,
    };
  }

  it("rotasi normal berhasil dan mengembalikan access+refresh token baru", async () => {
    const { refreshCookie } = await loginAndExchange();

    const rotated = await request(app.getHttpServer())
      .post("/auth/token")
      .set("Cookie", `refresh_token=${refreshCookie}`)
      .send({ grantType: "refresh_token" })
      .expect(201);

    expect(rotated.body.data.accessToken).toBeDefined();
    const newCookie = extractCookie(rotated.headers["set-cookie"], "refresh_token");
    expect(newCookie).toBeDefined();
    expect(newCookie).not.toBe(refreshCookie);
  });

  it("replay refresh token lama memicu 401 DAN revoke total — sesi lain milik user yang sama ikut mati", async () => {
    // Sesi A: login, exchange, rotate sekali (cookie awal jadi "lama").
    const sessionA = await loginAndExchange();
    const oldCookieA = sessionA.refreshCookie;
    const rotatedA = await request(app.getHttpServer())
      .post("/auth/token")
      .set("Cookie", `refresh_token=${oldCookieA}`)
      .send({ grantType: "refresh_token" })
      .expect(201);
    const newCookieA = extractCookie(rotatedA.headers["set-cookie"], "refresh_token")!;

    // Sesi B: login independen, user yang sama (device lain).
    const sessionB = await loginAndExchange();

    // Replay cookie LAMA sesi A (sudah di-rotate) — harus gagal.
    await request(app.getHttpServer())
      .post("/auth/token")
      .set("Cookie", `refresh_token=${oldCookieA}`)
      .send({ grantType: "refresh_token" })
      .expect(401);

    // Cascade: refresh token HASIL ROTASI TERAKHIR sesi A pun ikut mati.
    await request(app.getHttpServer())
      .post("/auth/token")
      .set("Cookie", `refresh_token=${newCookieA}`)
      .send({ grantType: "refresh_token" })
      .expect(401);

    // Cascade: sesi B yang sepenuhnya independen (device lain) juga ikut mati.
    await request(app.getHttpServer())
      .post("/auth/token")
      .set("Cookie", `refresh_token=${sessionB.refreshCookie}`)
      .send({ grantType: "refresh_token" })
      .expect(401);
  });

  it("refresh token untuk sesi yang tidak ada gagal tertutup (fail closed)", async () => {
    await request(app.getHttpServer())
      .post("/auth/token")
      .set("Cookie", "refresh_token=00000000-0000-0000-0000-000000000000.00000000-0000-0000-0000-000000000000.bogus")
      .send({ grantType: "refresh_token" })
      .expect(401);
  });

  it("refresh_token grant tanpa cookie sama sekali ditolak", async () => {
    await request(app.getHttpServer()).post("/auth/token").send({ grantType: "refresh_token" }).expect(401);
  });
});
