import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { adminPrisma, createTestApp } from "../audit-log/test-helpers";

// TDD §15 — "Header X-Correlation-Id di-generate di API Gateway jika belum
// ada, diteruskan lintas service call & job queue". Leg HTTP: header
// diteruskan apa adanya kalau klien sudah kirim, di-generate kalau belum —
// keduanya dibuktikan lewat response header (middleware selalu echo balik).
describe("X-Correlation-Id — leg HTTP", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  it("meneruskan X-Correlation-Id yang SUDAH dikirim klien apa adanya", async () => {
    const res = await request(app.getHttpServer()).get("/health").set("X-Correlation-Id", "client-supplied-corr-id").expect(200);
    expect(res.header["x-correlation-id"]).toBe("client-supplied-corr-id");
  });

  it("generate X-Correlation-Id baru (UUID) kalau klien tidak mengirim", async () => {
    const res = await request(app.getHttpServer()).get("/health").expect(200);
    expect(res.header["x-correlation-id"]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("dua request tanpa header menghasilkan correlation id yang BERBEDA (bukan konstan/di-cache)", async () => {
    const resA = await request(app.getHttpServer()).get("/health").expect(200);
    const resB = await request(app.getHttpServer()).get("/health").expect(200);
    expect(resA.header["x-correlation-id"]).not.toBe(resB.header["x-correlation-id"]);
  });
});
