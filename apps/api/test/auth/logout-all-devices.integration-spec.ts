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

// Acceptance criterion task 0.6: "logout-all-device berfungsi" — revocation
// LANGSUNG berlaku (bukan menunggu access token expired 15 menit), inilah
// alasan sesi disimpan di Redis (TDD §8.1), bukan pure stateless JWT.
describe("Auth — logout-all-device", () => {
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

  it("logout-all sesi A merevoke sesi B: access token B (belum expired) DAN refresh token B ditolak", async () => {
    const sessionA = await loginAndExchange();
    const sessionB = await loginAndExchange();

    // Sesi B masih hidup sebelum logout-all.
    await request(app.getHttpServer())
      .post("/auth/logout")
      .set("Authorization", `Bearer ${sessionB.accessToken}`)
      .expect(204);
    // (logout sesi B sendiri di atas sekaligus menghabiskan sesi B — jadi
    // untuk uji cascade logout-all yang independen, buat sesi C & D baru.)

    const sessionC = await loginAndExchange();
    const sessionD = await loginAndExchange();

    await request(app.getHttpServer())
      .post("/auth/logout-all")
      .set("Authorization", `Bearer ${sessionA.accessToken}`)
      .expect(204);

    // Access token D (masih valid secara JWT, belum expired) harus SUDAH
    // ditolak — buktinya revocation langsung, bukan menunggu exp.
    await request(app.getHttpServer())
      .post("/auth/logout")
      .set("Authorization", `Bearer ${sessionD.accessToken}`)
      .expect(401);

    // Refresh token C juga ikut mati.
    await request(app.getHttpServer())
      .post("/auth/token")
      .set("Cookie", `refresh_token=${sessionC.refreshCookie}`)
      .send({ grantType: "refresh_token" })
      .expect(401);

    // Refresh token A sendiri (pemanggil logout-all) juga ikut mati.
    await request(app.getHttpServer())
      .post("/auth/token")
      .set("Cookie", `refresh_token=${sessionA.refreshCookie}`)
      .send({ grantType: "refresh_token" })
      .expect(401);
  });

  it("logout (bukan logout-all) hanya merevoke sesi caller sendiri", async () => {
    const sessionX = await loginAndExchange();
    const sessionY = await loginAndExchange();

    await request(app.getHttpServer())
      .post("/auth/logout")
      .set("Authorization", `Bearer ${sessionX.accessToken}`)
      .expect(204);

    // Sesi Y tidak ikut terpengaruh oleh logout sesi X.
    await request(app.getHttpServer())
      .post("/auth/token")
      .set("Cookie", `refresh_token=${sessionY.refreshCookie}`)
      .send({ grantType: "refresh_token" })
      .expect(201);
  });
});
