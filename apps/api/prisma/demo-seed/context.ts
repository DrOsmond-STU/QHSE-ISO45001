// Tipe bersama seluruh script demo-seed/*.ts — SATU tenant demo dgn banyak
// user lintas 18 role tenant-assignable (SUPER_ADMIN_PLATFORM dikecualikan,
// cross-tenant), dipakai tiap modul seeder utk actor context yang realistis
// (bukan satu user generik utk semua panggilan).

export interface DemoUser {
  id: string;
  email: string;
  fullName: string;
  roleCode: string;
}

export interface DemoContext {
  tenantId: string;
  companyId: string;
  branchIdHq: string;
  branchIdCepu: string;
  branchIdBalikpapan: string;
  siteIdHq: string;
  siteIdCepu: string;
  siteIdBalikpapan: string;
  departmentIdHse: string;
  departmentIdOps: string;
  users: DemoUser[];
}

/** Ambil SATU user pertama dgn role tsb — throw kalau tidak ada (fail-fast,
 * bukan diam-diam pakai undefined) supaya salah ketik roleCode ketahuan
 * langsung, bukan nanti pas Prisma FK error yang jauh lebih membingungkan. */
export function actor(ctx: DemoContext, roleCode: string): DemoUser {
  const found = ctx.users.find((u) => u.roleCode === roleCode);
  if (!found) throw new Error(`demo-seed: tidak ada user dgn roleCode=${roleCode}`);
  return found;
}

/** Ambil SEMUA user dgn role tsb (mis. WORKER_EMPLOYEE ada beberapa). */
export function actors(ctx: DemoContext, roleCode: string): DemoUser[] {
  return ctx.users.filter((u) => u.roleCode === roleCode);
}

export const DAY_MS = 1000 * 60 * 60 * 24;

export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * DAY_MS);
}

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}
