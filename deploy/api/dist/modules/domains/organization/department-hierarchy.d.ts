export declare class DepartmentCycleError extends Error {
}
/**
 * PRD Modul 01 §6 BR-07 — "departments.parent_department_id tidak boleh
 * membentuk siklus (self-reference loop) — divalidasi saat create/update."
 * Inti algoritma (jalan ke atas dari proposedParentId, cek apakah pernah
 * balik ke departmentId sendiri) dibuat PURE/testable — `getParentId`
 * disuplai caller (service layer, query DB sungguhan lewat tx) supaya
 * logic traversal-nya sendiri bisa diuji tanpa Postgres (mock map sederhana).
 * departmentId null (baris BARU, belum py ID) berarti TIDAK PERNAH bisa
 * jadi bagian siklur dirinya sendiri — selalu lolos.
 */
export declare function assertNoParentCycle(departmentId: string | null, proposedParentId: string, getParentId: (id: string) => Promise<string | null>): Promise<void>;
