import { AsyncLocalStorage } from "node:async_hooks";

// TDD §5.1 — tenant_id disimpan di AsyncLocalStorage per-request, dibaca
// service/repository layer dari sini, TIDAK dari parameter yang diteruskan
// manual (mengurangi risiko lupa filter tenant).
export interface TenantContextStore {
  tenantId: string;
}

export const tenantContextStorage = new AsyncLocalStorage<TenantContextStore>();

export function getCurrentTenantId(): string | undefined {
  return tenantContextStorage.getStore()?.tenantId;
}
