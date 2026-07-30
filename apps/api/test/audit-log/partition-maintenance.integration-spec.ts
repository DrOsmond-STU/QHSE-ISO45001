import { INestApplication } from "@nestjs/common";
import { AuditLogPartitionMaintenanceService } from "../../src/platform/audit-log/audit-log-partition-maintenance.service";
import { partitionSpecForMonth } from "../../src/platform/audit-log/audit-log-partition";
import { adminPrisma, createTestApp } from "./test-helpers";

// TESTING §6 gaya (integration terhadap Postgres asli) — acceptance
// criterion literal task 0.13: "job audit-log-partition-maintenance (cron
// bulanan) membuat partisi berikutnya." Dipakai tanggal JAUH di masa depan
// (bukan bulan berjalan) supaya tidak bentrok dgn partisi yang sudah
// di-precreate migration (2026-07/08) ataupun tabrakan antar test run.
describe("AuditLogPartitionMaintenanceService — pembuatan partisi", () => {
  let app: INestApplication;
  let service: AuditLogPartitionMaintenanceService;
  const farFuture = new Date(Date.UTC(2031, 2, 15)); // Maret 2031 — jauh dari data nyata manapun

  beforeAll(async () => {
    app = await createTestApp();
    service = app.get(AuditLogPartitionMaintenanceService);
  });

  afterEach(async () => {
    // run() SELALU memastikan bulan target + 1 bulan berikutnya — bersihkan
    // KEDUANYA supaya schema tidak menumpuk partisi sisa antar test run.
    for (const offset of [0, 1]) {
      const spec = partitionSpecForMonth(new Date(Date.UTC(farFuture.getUTCFullYear(), farFuture.getUTCMonth() + offset, 1)));
      await adminPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${spec.tableName}"`);
    }
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  it("membuat partisi bulan target (acceptance criterion) dengan RLS aktif + append-only", async () => {
    await service.run(farFuture);

    const spec = partitionSpecForMonth(farFuture);
    const relInfo = await adminPrisma.$queryRaw<Array<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>>`
      SELECT relrowsecurity, relforcerowsecurity FROM pg_class
      WHERE relname = ${spec.tableName} AND relnamespace = 'public'::regnamespace
    `;
    expect(relInfo).toHaveLength(1);
    expect(relInfo[0].relrowsecurity).toBe(true);
    expect(relInfo[0].relforcerowsecurity).toBe(true);

    const policies = await adminPrisma.$queryRaw<Array<{ polname: string }>>`
      SELECT polname FROM pg_policy WHERE polrelid = ${spec.tableName}::regclass
    `;
    expect(policies.map((p) => p.polname)).toContain("tenant_isolation_policy");

    // qhse_app: SELECT/INSERT tetap ada (default privilege + dipakai
    // AuditLogService), UPDATE/DELETE WAJIB direvoke (dibuktikan empiris
    // partisi baru TIDAK mewarisi privilege restriktif parent, TDD §26).
    const acl = await adminPrisma.$queryRaw<Array<{ has_update: boolean; has_delete: boolean; has_insert: boolean }>>`
      SELECT
        has_table_privilege('qhse_app', ${spec.tableName}, 'UPDATE') AS has_update,
        has_table_privilege('qhse_app', ${spec.tableName}, 'DELETE') AS has_delete,
        has_table_privilege('qhse_app', ${spec.tableName}, 'INSERT') AS has_insert
    `;
    expect(acl[0].has_update).toBe(false);
    expect(acl[0].has_delete).toBe(false);
    expect(acl[0].has_insert).toBe(true);
  });

  it("juga memastikan partisi bulan BERIKUTNYA (buffer 2 bulan)", async () => {
    await service.run(farFuture);

    const nextMonthSpec = partitionSpecForMonth(new Date(Date.UTC(farFuture.getUTCFullYear(), farFuture.getUTCMonth() + 1, 1)));
    const rows = await adminPrisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = ${nextMonthSpec.tableName} AND relnamespace = 'public'::regnamespace) AS exists
    `;
    expect(rows[0].exists).toBe(true);
  });

  it("idempotent — dipanggil dua kali tidak error dan tidak menghasilkan partisi duplikat", async () => {
    await service.run(farFuture);
    await expect(service.run(farFuture)).resolves.not.toThrow();

    const spec = partitionSpecForMonth(farFuture);
    const count = await adminPrisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) AS count FROM pg_class WHERE relname = ${spec.tableName} AND relnamespace = 'public'::regnamespace
    `;
    expect(Number(count[0].count)).toBe(1);
  });

  it("rentang partisi benar — baris dgn created_at di bulan target masuk partisi ini, bukan partisi lain", async () => {
    await service.run(farFuture);
    const spec = partitionSpecForMonth(farFuture);

    const midMonth = new Date(Date.UTC(farFuture.getUTCFullYear(), farFuture.getUTCMonth(), 15, 12));
    await adminPrisma.$executeRawUnsafe(
      `INSERT INTO "${spec.tableName}" (action, entity_type, created_at) VALUES ('INSERT', 'partition-range-check', '${midMonth.toISOString()}')`,
    );

    const rows = await adminPrisma.$queryRawUnsafe<Array<{ entity_type: string }>>(
      `SELECT entity_type FROM "${spec.tableName}" WHERE entity_type = 'partition-range-check'`,
    );
    expect(rows).toHaveLength(1);
  });
});
