import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { getCurrentTenantId } from "./tenant-context";

// Runtime app WAJIB connect via role tanpa BYPASSRLS (TDD §5.2) — APP_DATABASE_URL
// (role qhse_app), BUKAN DATABASE_URL yang dipakai Prisma CLI untuk migrate
// (role admin/pemilik tabel). Lihat prisma/migrations/*_enable_rls_smoke_test.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: { url: process.env.APP_DATABASE_URL },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Bungkus satu unit kerja dalam transaksi + `SET LOCAL app.current_tenant_id`
   * (TDD §5.2), tenant_id diambil dari AsyncLocalStorage (TDD §5.1) — bukan
   * parameter manual, supaya tidak ada jalur query yang lupa filter tenant.
   * Fail closed (TDD §2 prinsip 6): tanpa tenant context, request ditolak.
   */
  async withRls<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      throw new Error("Tenant context tidak ditemukan — request ditolak (fail closed).");
    }
    return this.$transaction(async (tx) => {
      // set_config dengan parameter binding (bukan interpolasi string ke SET LOCAL)
      // supaya tidak ada celah SQL injection lewat tenantId.
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });
  }
}
