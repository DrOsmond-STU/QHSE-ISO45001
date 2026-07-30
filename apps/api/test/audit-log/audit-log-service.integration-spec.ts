import { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuditLogService } from "../../src/platform/audit-log/audit-log.service";
import { PrismaService } from "../../src/platform/tenancy/prisma.service";
import { adminPrisma, buildRequestSimFixture, createTestApp, runAsRequest } from "./test-helpers";

// Task 0.13 — jalur MANUAL AuditLogService.record()/recordStandalone(),
// untuk aksi semantik yang bukan mutasi baris sederhana (Master PRD §11.6
// poin 6 — login/export/approve) — pelengkap trigger otomatis
// (audit-trigger.integration-spec.ts).
describe("AuditLogService — jalur manual", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let auditLogService: AuditLogService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    auditLogService = app.get(AuditLogService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  it("record(tx, entry) menulis entri dgn context (tenant/actor/correlation) yang SAMA dgn tx yang sedang berjalan", async () => {
    const fixture = buildRequestSimFixture();
    const entityId = randomUUID();

    await runAsRequest(fixture, () =>
      prisma.withRls((tx) =>
        auditLogService.record(tx, {
          action: "LOGIN",
          entityType: "user_sessions",
          entityId,
          afterValue: { note: "login sukses" },
        }),
      ),
    );

    const row = await adminPrisma.systemAuditLog.findFirstOrThrow({
      where: { action: "LOGIN", entityType: "user_sessions", entityId },
    });
    expect(row.tenantId).toBe(fixture.tenantId);
    expect(row.actorUserId).toBe(fixture.userId);
    expect(row.correlationId).toBe(fixture.correlationId);
    expect(row.afterValue).toMatchObject({ note: "login sukses" });
  });

  it("record(tx, entry) ikut rollback bareng transaksi pemicunya (atomic, sama dgn trigger otomatis)", async () => {
    const fixture = buildRequestSimFixture();
    const entityId = randomUUID();

    await expect(
      runAsRequest(fixture, () =>
        prisma.withRls(async (tx) => {
          await auditLogService.record(tx, { action: "EXPORT", entityType: "report", entityId });
          throw new Error("force-rollback-manual-path");
        }),
      ),
    ).rejects.toThrow("force-rollback-manual-path");

    const rows = await adminPrisma.systemAuditLog.findMany({ where: { action: "EXPORT", entityType: "report", entityId } });
    expect(rows).toHaveLength(0);
  });

  it("recordStandalone(entry) membuka transaksi withRls() sendiri", async () => {
    const fixture = buildRequestSimFixture();
    const entityId = randomUUID();

    await runAsRequest(fixture, () => auditLogService.recordStandalone({ action: "APPROVE", entityType: "work_permit", entityId }));

    const row = await adminPrisma.systemAuditLog.findFirstOrThrow({
      where: { action: "APPROVE", entityType: "work_permit", entityId },
    });
    expect(row.tenantId).toBe(fixture.tenantId);
  });
});
