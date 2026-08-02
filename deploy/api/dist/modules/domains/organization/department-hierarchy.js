"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentCycleError = void 0;
exports.assertNoParentCycle = assertNoParentCycle;
class DepartmentCycleError extends Error {
}
exports.DepartmentCycleError = DepartmentCycleError;
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
async function assertNoParentCycle(departmentId, proposedParentId, getParentId) {
    if (departmentId === null) {
        return;
    }
    let currentId = proposedParentId;
    const visited = new Set();
    while (currentId !== null) {
        if (currentId === departmentId) {
            throw new DepartmentCycleError("BR-07: parent_department_id membentuk siklus (department tidak boleh jadi leluhur dirinya sendiri).");
        }
        if (visited.has(currentId)) {
            // Siklus SUDAH ADA di data sebelum perubahan ini (seharusnya mustahil
            // kalau BR-07 selalu ditegakkan dari awal) -- berhenti, bukan infinite
            // loop, dan jangan diam-diam anggap valid.
            throw new DepartmentCycleError("BR-07: siklus terdeteksi pada rantai parent_department_id yang sudah ada.");
        }
        visited.add(currentId);
        currentId = await getParentId(currentId);
    }
}
//# sourceMappingURL=department-hierarchy.js.map