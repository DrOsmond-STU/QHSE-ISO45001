import { getCurrentTenantId, getCurrentUserId } from "../../../platform/tenancy/tenant-context";

// Duplikat kecil (BUKAN impor lintas domain) — pola sama seluruh modul
// domain lain di codebase ini (gap TDD §26 poin 29, task 1.2).

export function requireActorUserId(): string {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("Actor user_id tidak ditemukan di context — operasi capa ditolak (fail closed).");
  }
  return userId;
}

export function requireTenantId(): string {
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    throw new Error("Tenant context tidak ditemukan — operasi capa ditolak (fail closed).");
  }
  return tenantId;
}
