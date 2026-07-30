import { AsyncLocalStorage } from "node:async_hooks";

// TDD §5.1 — tenant_id disimpan di AsyncLocalStorage per-request, dibaca
// service/repository layer dari sini, TIDAK dari parameter yang diteruskan
// manual (mengurangi risiko lupa filter tenant).
//
// userId ditambahkan task 0.13 (audit-log & observability, TDD §15 — log
// terstruktur wajib menyertakan user_id) — diisi dari klaim JWT `sub` yang
// SAMA persis dipakai TenantContextMiddleware mengisi tenantId (satu decode,
// dua field), bukan verifikasi token kedua kalinya.
export interface TenantContextStore {
  tenantId: string;
  userId?: string;
}

export const tenantContextStorage = new AsyncLocalStorage<TenantContextStore>();

export function getCurrentTenantId(): string | undefined {
  return tenantContextStorage.getStore()?.tenantId;
}

export function getCurrentUserId(): string | undefined {
  return tenantContextStorage.getStore()?.userId;
}
