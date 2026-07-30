// TDD §8.2/§12 — "invalidasi event-driven" permission cache. Belum ada
// producer (butuh role-admin CRUD, task 1.3) — event ini di-emit langsung
// dari test untuk membuktikan listener bekerja (lihat
// rbac-cache-invalidation.listener.ts). EventEmitter2 in-process saja —
// TIDAK cross-replica; TTL 5 menit (rbac.constants.ts) jadi jaring pengaman
// untuk kasus multi-instance (TDD §12: "TTL 5 menit ATAU invalidasi
// eksplisit").
export interface RoleChangedEvent {
  userId: string;
}

export interface PermissionChangedEvent {
  roleId: string;
  tenantId: string;
}
