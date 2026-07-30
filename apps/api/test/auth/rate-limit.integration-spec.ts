import { INestApplication } from "@nestjs/common";
import request from "supertest";
import {
  adminPrisma,
  createTestApp,
  flushTestRedis,
  generatePkcePair,
  seedTenantFixture,
  TenantFixture,
} from "./test-helpers";
import { LOGIN_RATE_LIMIT_PER_MINUTE } from "../../src/platform/auth/auth.constants";

// TDD §12 — ratelimit:{tenant_id}:auth.login:{window}. Butuh Redis nyata
// (bukan mock) — sudah tersedia di environment ini (.local-redis/).
describe("Auth — rate limit /auth/login", () => {
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

  it(`menolak (429) setelah melebihi ${LOGIN_RATE_LIMIT_PER_MINUTE} percobaan/menit untuk tenant yang sama`, async () => {
    const attempt = () => {
      const { challenge } = generatePkcePair();
      return request(app.getHttpServer())
        .post("/auth/login")
        .set("x-tenant-id", fixture.tenantId)
        .send({ email: fixture.email, password: "password-salah", codeChallenge: challenge, codeChallengeMethod: "S256" });
    };

    for (let i = 0; i < LOGIN_RATE_LIMIT_PER_MINUTE; i++) {
      const res = await attempt();
      expect(res.status).toBe(401); // masih di bawah threshold — gagal krn password salah, bukan rate limit
    }

    const overLimit = await attempt();
    expect(overLimit.status).toBe(429);
  });

  it("tenant lain TIDAK ikut terblokir oleh rate limit tenant sebelumnya (key di-scope per tenant)", async () => {
    const otherFixture = await seedTenantFixture();
    const { challenge } = generatePkcePair();
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-tenant-id", otherFixture.tenantId)
      .send({ email: otherFixture.email, password: "password-salah", codeChallenge: challenge, codeChallengeMethod: "S256" });
    expect(res.status).toBe(401);
  });
});
