import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { seedRbacBaseline, SUPER_ADMIN_PLATFORM_ROLE_CODE } from "../../prisma/seed-rbac-baseline";

// Gap #6 (plan task 0.8) — kebijakan RLS asimetris pada `roles`/
// `role_permissions` (tenant_id NULLABLE, baris system role harus terlihat
// LINTAS tenant & TANPA context sama sekali), berbeda dari pola RLS standar
// tenant_id NOT NULL yang sudah dicek generic-tenant-isolation.integration-spec.ts.
const adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const appPrisma = new PrismaClient({ datasources: { db: { url: process.env.APP_DATABASE_URL } } });

async function queryRolesAsTenant(tenantId: string) {
  return appPrisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return tx.$queryRawUnsafe<Array<{ role_code: string; tenant_id: string | null }>>(
      `SELECT role_code, tenant_id FROM "roles"`,
    );
  });
}

/**
 * Query TANPA context sama sekali via koneksi Postgres yang BENAR-BENAR
 * baru (PrismaClient terpisah, bukan reuse pool appPrisma di atas) — custom
 * GUC `app.current_tenant_id` yang PERNAH di-set_config (walau
 * transaction-local) di suatu koneksi kadang balik jadi string kosong
 * (bukan NULL) begitu transaksi itu commit, tergantung koneksi yang dipakai
 * ulang dari pool; `''::uuid` lalu melempar error cast, bukan fail-closed
 * yang bersih. Ini murni artefak pool koneksi test — production TIDAK
 * terdampak karena semua query domain wajib lewat PrismaService.withRls(),
 * yang SELALU men-set context sebelum query apa pun (tidak pernah ada jalur
 * "transaksi tanpa context" di kode aplikasi sungguhan).
 */
async function queryRolesWithoutContext() {
  const freshClient = new PrismaClient({ datasources: { db: { url: process.env.APP_DATABASE_URL } } });
  try {
    return await freshClient.$queryRawUnsafe<Array<{ role_code: string; tenant_id: string | null }>>(
      `SELECT role_code, tenant_id FROM "roles"`,
    );
  } finally {
    await freshClient.$disconnect();
  }
}

describe("RBAC — RLS kebijakan nullable tenant_id (system role lintas tenant)", () => {
  afterAll(async () => {
    await adminPrisma.$disconnect();
    await appPrisma.$disconnect();
  });

  it("role system (tenant_id NULL) terlihat TANPA context sama sekali", async () => {
    await seedRbacBaseline(adminPrisma);
    const rows = await queryRolesWithoutContext();
    expect(rows.some((r) => r.role_code === SUPER_ADMIN_PLATFORM_ROLE_CODE)).toBe(true);
  });

  it("role system terlihat dari tenant A MAUPUN tenant B (bukan cuma satu tenant)", async () => {
    await seedRbacBaseline(adminPrisma);
    const tenantA = randomUUID();
    const tenantB = randomUUID();

    const rowsA = await queryRolesAsTenant(tenantA);
    const rowsB = await queryRolesAsTenant(tenantB);

    expect(rowsA.some((r) => r.role_code === SUPER_ADMIN_PLATFORM_ROLE_CODE)).toBe(true);
    expect(rowsB.some((r) => r.role_code === SUPER_ADMIN_PLATFORM_ROLE_CODE)).toBe(true);
  });

  it("role kustom milik tenant A TIDAK terlihat dari tenant B", async () => {
    const tenantA = randomUUID();
    const tenantB = randomUUID();
    const customRoleCode = `CUSTOM_${randomUUID().slice(0, 8)}`;

    await adminPrisma.role.create({
      data: { tenantId: tenantA, roleCode: customRoleCode, name: "Custom A-only Role" },
    });

    const rowsA = await queryRolesAsTenant(tenantA);
    const rowsB = await queryRolesAsTenant(tenantB);
    const rowsNoContext = await queryRolesWithoutContext();

    expect(rowsA.some((r) => r.role_code === customRoleCode)).toBe(true);
    expect(rowsB.some((r) => r.role_code === customRoleCode)).toBe(false);
    expect(rowsNoContext.some((r) => r.role_code === customRoleCode)).toBe(false);
  });

  it("qhse_app TIDAK BISA insert baris tenant_id NULL (WITH CHECK menolak klaim system role)", async () => {
    const tenantA = randomUUID();
    await expect(
      appPrisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantA}, true)`;
        await tx.$executeRawUnsafe(
          `INSERT INTO "roles" (role_id, tenant_id, role_code, name) VALUES (gen_random_uuid(), NULL, 'ROGUE_SYSTEM_ROLE', 'x')`,
        );
      }),
    ).rejects.toThrow();
  });
});
