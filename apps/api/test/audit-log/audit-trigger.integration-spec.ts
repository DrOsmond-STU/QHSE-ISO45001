import { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../src/platform/tenancy/prisma.service";
import { adminPrisma, buildRequestSimFixture, createTestApp, runAsRequest } from "./test-helpers";

// Task 0.13 — trigger audit_log_capture() (Master PRD §11.6, TDD §6.1),
// dibuktikan lewat _audit_log_smoke_test (pola sama _rls_smoke_test task
// 0.2/0.3). Menguji lewat PrismaService.withRls() SUNGGUHAN (bukan raw SQL
// manual) supaya turut membuktikan pipa AsyncLocalStorage
// (tenancy+observability) → SET LOCAL → trigger benar-benar tersambung
// end-to-end, bukan cuma mekanisme trigger itu sendiri (yang sudah
// diverifikasi manual via psql selama development, lihat TDD §26).
describe("audit_log_capture() trigger — via PrismaService.withRls()", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  it("INSERT: mencatat after_value akurat + tenant/actor/correlation/ip/user-agent dari context", async () => {
    const fixture = buildRequestSimFixture();
    const rowId = randomUUID();

    await runAsRequest(fixture, () =>
      prisma.withRls((tx) => tx.auditLogSmokeTest.create({ data: { id: rowId, tenantId: fixture.tenantId, label: "hello" } })),
    );

    const auditRow = await adminPrisma.systemAuditLog.findFirstOrThrow({
      where: { entityType: "_audit_log_smoke_test", entityId: rowId, action: "INSERT" },
    });

    expect(auditRow.tenantId).toBe(fixture.tenantId);
    expect(auditRow.actorUserId).toBe(fixture.userId);
    expect(auditRow.correlationId).toBe(fixture.correlationId);
    expect(auditRow.ipAddress).toBe(fixture.ipAddress);
    expect(auditRow.userAgent).toBe(fixture.userAgent);
    expect(auditRow.beforeValue).toBeNull();
    expect(auditRow.afterValue).toMatchObject({ id: rowId, tenant_id: fixture.tenantId, label: "hello" });
  });

  it("UPDATE: mencatat before_value DAN after_value akurat", async () => {
    const fixture = buildRequestSimFixture();
    const rowId = randomUUID();

    await runAsRequest(fixture, async () => {
      await prisma.withRls((tx) => tx.auditLogSmokeTest.create({ data: { id: rowId, tenantId: fixture.tenantId, label: "before" } }));
      await prisma.withRls((tx) => tx.auditLogSmokeTest.update({ where: { id: rowId }, data: { label: "after" } }));
    });

    const auditRow = await adminPrisma.systemAuditLog.findFirstOrThrow({
      where: { entityType: "_audit_log_smoke_test", entityId: rowId, action: "UPDATE" },
    });

    expect(auditRow.beforeValue).toMatchObject({ label: "before" });
    expect(auditRow.afterValue).toMatchObject({ label: "after" });
  });

  it("DELETE: mencatat before_value, after_value NULL", async () => {
    const fixture = buildRequestSimFixture();
    const rowId = randomUUID();

    await runAsRequest(fixture, async () => {
      await prisma.withRls((tx) => tx.auditLogSmokeTest.create({ data: { id: rowId, tenantId: fixture.tenantId, label: "to-delete" } }));
      await prisma.withRls((tx) => tx.auditLogSmokeTest.delete({ where: { id: rowId } }));
    });

    const auditRow = await adminPrisma.systemAuditLog.findFirstOrThrow({
      where: { entityType: "_audit_log_smoke_test", entityId: rowId, action: "DELETE" },
    });

    expect(auditRow.beforeValue).toMatchObject({ label: "to-delete" });
    expect(auditRow.afterValue).toBeNull();
  });

  it("ROLLBACK: transaksi yang gagal TIDAK menyisakan entri audit (atomicity, TDD §26)", async () => {
    const fixture = buildRequestSimFixture();
    const rowId = randomUUID();

    await expect(
      runAsRequest(fixture, () =>
        prisma.withRls(async (tx) => {
          await tx.auditLogSmokeTest.create({ data: { id: rowId, tenantId: fixture.tenantId, label: "rolled-back" } });
          throw new Error("force-rollback-in-test");
        }),
      ),
    ).rejects.toThrow("force-rollback-in-test");

    const auditRows = await adminPrisma.systemAuditLog.findMany({
      where: { entityType: "_audit_log_smoke_test", entityId: rowId },
    });
    expect(auditRows).toHaveLength(0);

    const sourceRow = await adminPrisma.auditLogSmokeTest.findUnique({ where: { id: rowId } });
    expect(sourceRow).toBeNull();
  });

  it("entri audit TIDAK BISA diedit/dihapus lewat jalur aplikasi (acceptance criterion task 0.13)", async () => {
    const fixture = buildRequestSimFixture();
    const rowId = randomUUID();

    await runAsRequest(fixture, () =>
      prisma.withRls((tx) => tx.auditLogSmokeTest.create({ data: { id: rowId, tenantId: fixture.tenantId, label: "immutable-check" } })),
    );

    const auditRow = await adminPrisma.systemAuditLog.findFirstOrThrow({
      where: { entityType: "_audit_log_smoke_test", entityId: rowId, action: "INSERT" },
    });

    // updateMany/deleteMany dgn filter `id` saja (BUKAN unique compound
    // `id_createdAt`) — createdAt TIMESTAMPTZ presisi mikrodetik, JS Date
    // cuma presisi milidetik; roundtrip Date balik ke WHERE composite exact
    // match bisa 0 baris cocok krn microsecond terpotong (ditemukan test
    // ini sendiri, bukan soal privilege). Filter by id saja menghindari
    // jebakan presisi itu SEKALIGUS tetap menguji hal yang sama (Postgres
    // cek privilege UPDATE/DELETE di level tabel, terlepas dari berapa
    // baris yang match filternya).
    await expect(
      runAsRequest(fixture, () =>
        prisma.withRls((tx) => tx.systemAuditLog.updateMany({ where: { id: auditRow.id }, data: { action: "TAMPERED" } })),
      ),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      runAsRequest(fixture, () => prisma.withRls((tx) => tx.systemAuditLog.deleteMany({ where: { id: auditRow.id } }))),
    ).rejects.toThrow(/permission denied/i);

    const stillThere = await adminPrisma.systemAuditLog.findFirst({ where: { id: auditRow.id } });
    expect(stillThere).not.toBeNull();
    expect(stillThere?.action).toBe("INSERT");
  });

  it("tanpa tenant context: query system_audit_logs menghasilkan 0 baris (fail closed, sama pola tabel domain lain)", async () => {
    const fixture = buildRequestSimFixture();
    await runAsRequest(fixture, () =>
      prisma.withRls((tx) => tx.auditLogSmokeTest.create({ data: { id: randomUUID(), tenantId: fixture.tenantId, label: "x" } })),
    );

    // withRls() sendiri sudah fail closed di level aplikasi (baris test lain
    // di seluruh suite membuktikan itu, mis. rbac/rls-nullable-tenant-scope) —
    // di sini eksplisit tegaskan system_audit_logs juga tunduk RLS standar
    // (bukan tabel "terbuka" hanya karena isinya audit trail).
    const otherTenantId = randomUUID();
    const rowsAsOtherTenant = await runAsRequest({ ...fixture, tenantId: otherTenantId }, () =>
      prisma.withRls((tx) => tx.systemAuditLog.findMany({ where: { entityType: "_audit_log_smoke_test" } })),
    );
    expect(rowsAsOtherTenant).toHaveLength(0);
  });
});
