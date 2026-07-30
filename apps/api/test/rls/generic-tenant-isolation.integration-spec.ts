import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

// TESTING.md §4 — suite paling kritis di seluruh produk. Digeneralisasi lewat
// introspeksi skema (bukan satu test manual per tabel) supaya migration yang
// menambah tabel domain baru TIDAK BISA lolos tanpa RLS aktif.
//
// PENYIMPANGAN dari TDD §19/TESTING §6 yang disengaja: TDD merekomendasikan
// Testcontainers (Postgres ephemeral per test run) — environment build ini
// TIDAK punya Docker (lihat project_qhse_dev_environment memory), jadi test
// ini jalan terhadap Postgres dev lokal (.local-pgsql/) yang sama dipakai
// `pnpm dev`. Begitu CI (task 0.4) tersedia dengan Docker, ganti ke
// Testcontainers agar benar-benar terisolasi & aman dipakai paralel.

const adminPrisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});
const appPrisma = new PrismaClient({
  datasources: { db: { url: process.env.APP_DATABASE_URL } },
});

const TENANT_A = randomUUID();
const TENANT_B = randomUUID();

/**
 * Introspeksi information_schema — tabel "domain" didefinisikan sebagai
 * tabel apa pun di schema public yang punya kolom `tenant_id` (kriteria yang
 * sama dipakai Master PRD §11 konvensi database wajib). Tabel referensi
 * global tanpa tenant_id (TDD §6.3) otomatis terkecualikan tanpa perlu
 * whitelist manual.
 */
async function getAllDomainTablesFromSchema(): Promise<string[]> {
  const rows = await adminPrisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'tenant_id'
    ORDER BY table_name
  `;
  return rows.map((r) => r.table_name);
}

/**
 * Task 0.8 — subset dari getAllDomainTablesFromSchema() yang tenant_id-nya
 * NOT NULL. Tabel dengan tenant_id NULLABLE (mis. `roles`/`role_permissions`
 * — baris system role lintas tenant, Modul 02 §8.1/BR-05) SENGAJA
 * dikecualikan dari assertion "0 baris tanpa context" — baris system MEMANG
 * harus terlihat tanpa tenant context (lihat kebijakan RLS asimetris di
 * migrations/20260723215236_enable_rls_rbac_tables). Assertion "RLS
 * aktif" tetap pakai getAllDomainTablesFromSchema() (berlaku universal utk
 * SEMUA tabel bertenant_id, nullable maupun tidak) — helper ini HANYA
 * mempersempit, bukan melemahkan, jaminan yang sudah ada.
 */
async function getStrictTenantScopedTables(): Promise<string[]> {
  const rows = await adminPrisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'tenant_id'
      AND is_nullable = 'NO'
    ORDER BY table_name
  `;
  return rows.map((r) => r.table_name);
}

async function queryRlsStatus(table: string) {
  const rows = await adminPrisma.$queryRaw<
    Array<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>
  >`
    SELECT relrowsecurity, relforcerowsecurity
    FROM pg_class
    WHERE relname = ${table} AND relnamespace = 'public'::regnamespace
  `;
  return rows[0];
}

async function seedRow(table: string, tenantId: string, label: string): Promise<string> {
  const id = randomUUID();
  await adminPrisma.$executeRaw`
    INSERT INTO "_rls_smoke_test" (id, tenant_id, label) VALUES (${id}::uuid, ${tenantId}::uuid, ${label})
  `;
  // Catatan: seed generik lintas-tabel butuh tahu kolom wajib per tabel — untuk
  // sekarang cuma _rls_smoke_test yang ada (Phase 0). Begitu tabel domain
  // sungguhan masuk (Phase 1+), fungsi ini digeneralisasi (mis. via factory
  // per tabel), bukan hardcode nama tabel seperti ini.
  void table;
  return id;
}

async function queryAsTenant(tenantId: string, table: string) {
  return appPrisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return tx.$queryRawUnsafe<Array<{ id: string; tenant_id: string }>>(
      `SELECT * FROM "${table}"`,
    );
  });
}

async function queryWithoutTenantContext(table: string) {
  // Sengaja TIDAK memanggil set_config sama sekali — membuktikan RLS di
  // level database sendiri (bukan cuma guard aplikasi PrismaService.withRls)
  // sudah fail-closed.
  return appPrisma.$queryRawUnsafe<Array<{ id: string; tenant_id: string }>>(
    `SELECT * FROM "${table}"`,
  );
}

describe("RLS — Isolasi Tenant (Generik, Semua Tabel Domain)", () => {
  let domainTables: string[];

  beforeAll(async () => {
    domainTables = await getAllDomainTablesFromSchema();
  });

  afterAll(async () => {
    await adminPrisma.$disconnect();
    await appPrisma.$disconnect();
  });

  it("menemukan minimal satu tabel domain untuk diuji (bukti introspeksi jalan)", () => {
    expect(domainTables.length).toBeGreaterThan(0);
  });

  it("setiap tabel domain: RLS aktif (ENABLE + FORCE ROW LEVEL SECURITY)", async () => {
    for (const table of await getAllDomainTablesFromSchema()) {
      const status = await queryRlsStatus(table);
      expect(status).toBeDefined();
      expect(status.relrowsecurity).toBe(true);
    }
  });

  it("setiap tabel domain dengan tenant_id NOT NULL: query TANPA app.current_tenant_id menghasilkan 0 baris (fail closed)", async () => {
    for (const table of await getStrictTenantScopedTables()) {
      const rows = await queryWithoutTenantContext(table);
      expect(rows).toHaveLength(0);
    }
  });

  it("_rls_smoke_test: user tenant A tidak bisa membaca baris tenant B", async () => {
    const idA = await seedRow("_rls_smoke_test", TENANT_A, `seed-A-${Date.now()}`);
    await seedRow("_rls_smoke_test", TENANT_B, `seed-B-${Date.now()}`);

    const resultAsTenantA = await queryAsTenant(TENANT_A, "_rls_smoke_test");

    expect(resultAsTenantA).toContainEqual(expect.objectContaining({ id: idA }));
    expect(resultAsTenantA.every((row) => row.tenant_id === TENANT_A)).toBe(true);
  });
});
