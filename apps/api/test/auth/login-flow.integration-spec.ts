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

describe("Auth — alur login lengkap (login -> token -> protected route)", () => {
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

  it("login tanpa header x-tenant-id ditolak", async () => {
    const { challenge } = generatePkcePair();
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: fixture.email, password: fixture.password, codeChallenge: challenge, codeChallengeMethod: "S256" })
      .expect(400);
  });

  it("login dengan tenant yang salah gagal (email unik per tenant, BR-01)", async () => {
    const { challenge } = generatePkcePair();
    await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-tenant-id", "00000000-0000-0000-0000-000000000000")
      .send({ email: fixture.email, password: fixture.password, codeChallenge: challenge, codeChallengeMethod: "S256" })
      .expect(401);
  });

  it("login dengan password salah gagal (401 generik)", async () => {
    const { challenge } = generatePkcePair();
    await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-tenant-id", fixture.tenantId)
      .send({ email: fixture.email, password: "password-salah", codeChallenge: challenge, codeChallengeMethod: "S256" })
      .expect(401);
  });

  it("alur lengkap: login -> exchange code -> akses route protected -> ditolak tanpa token", async () => {
    const { verifier, challenge } = generatePkcePair();

    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-tenant-id", fixture.tenantId)
      .send({ email: fixture.email, password: fixture.password, codeChallenge: challenge, codeChallengeMethod: "S256" })
      .expect(201);

    const { code } = loginRes.body.data;
    expect(typeof code).toBe("string");

    const tokenRes = await request(app.getHttpServer())
      .post("/auth/token")
      .send({ grantType: "authorization_code", code, codeVerifier: verifier })
      .expect(201);

    const { accessToken, tokenType, expiresIn } = tokenRes.body.data;
    expect(tokenType).toBe("Bearer");
    expect(expiresIn).toBe(900);
    expect(typeof accessToken).toBe("string");
    expect(extractCookie(tokenRes.headers["set-cookie"], "refresh_token")).toBeDefined();

    // Route protected sungguhan (bukan @Public()) — tanpa token ditolak.
    await request(app.getHttpServer()).post("/auth/logout").expect(401);

    // Dengan token valid, guard lolos (logout sukses -> 204).
    await request(app.getHttpServer())
      .post("/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);
  });

  it("auth code sekali pakai — tidak bisa ditukar dua kali", async () => {
    const { verifier, challenge } = generatePkcePair();
    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-tenant-id", fixture.tenantId)
      .send({ email: fixture.email, password: fixture.password, codeChallenge: challenge, codeChallengeMethod: "S256" })
      .expect(201);
    const { code } = loginRes.body.data;

    await request(app.getHttpServer())
      .post("/auth/token")
      .send({ grantType: "authorization_code", code, codeVerifier: verifier })
      .expect(201);

    await request(app.getHttpServer())
      .post("/auth/token")
      .send({ grantType: "authorization_code", code, codeVerifier: verifier })
      .expect(401);
  });

  it("PKCE code_verifier yang salah ditolak", async () => {
    const { challenge } = generatePkcePair();
    const wrongVerifier = generatePkcePair().verifier;

    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-tenant-id", fixture.tenantId)
      .send({ email: fixture.email, password: fixture.password, codeChallenge: challenge, codeChallengeMethod: "S256" })
      .expect(201);
    const { code } = loginRes.body.data;

    await request(app.getHttpServer())
      .post("/auth/token")
      .send({ grantType: "authorization_code", code, codeVerifier: wrongVerifier })
      .expect(401);
  });
});
