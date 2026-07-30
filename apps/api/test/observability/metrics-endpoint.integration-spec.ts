import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { adminPrisma, createTestApp } from "../audit-log/test-helpers";

// TDD §15 — "Metrics: Prometheus — metrik standar...+ metrik bisnis kunci".
// GET /metrics @Public() (pola sama /health) — scraper Prometheus tidak
// pernah punya Bearer token.
describe("GET /metrics", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  it("200 tanpa Authorization header, Content-Type Prometheus text format", async () => {
    const res = await request(app.getHttpServer()).get("/metrics").expect(200);
    expect(res.header["content-type"]).toMatch(/^text\/plain/);
  });

  it("memuat metrik HTTP standar + queue depth + metrik bisnis (TDD §15)", async () => {
    // Picu minimal satu request HTTP lain dulu supaya http_requests_total
    // punya sample nyata, bukan cuma metric terdaftar tanpa data point.
    await request(app.getHttpServer()).get("/health").expect(200);

    const res = await request(app.getHttpServer()).get("/metrics").expect(200);
    const body = res.text;

    expect(body).toContain("# HELP http_requests_total");
    expect(body).toContain("# HELP http_request_duration_seconds");
    expect(body).toContain("# HELP bullmq_queue_depth");
    expect(body).toContain("# HELP qhse_workflow_instances_active");
    expect(body).toContain("# HELP qhse_notifications_failed");
    expect(body).toMatch(/http_requests_total\{[^}]*method="GET"[^}]*route="\/health"[^}]*\}\s+\d+/);
  });
});
