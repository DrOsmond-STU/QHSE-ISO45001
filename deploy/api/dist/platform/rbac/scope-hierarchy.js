"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCOPE_LEVEL_ORDER = void 0;
exports.scopeCovers = scopeCovers;
// Task 1.1 — titik ekstensi yang didokumentasikan di permission-resolution.ts
// sejak 0.8: "TIDAK ADA containment hierarki naik... itu titik ekstensi task
// 1.1 begitu resolusi hierarki tersedia." Master PRD §8.3: "HSE Officer
// dengan scope Site X hanya melihat data Site X DAN TURUNANNYA/Department
// di bawahnya" — containment turun (assignment di level lebih TINGGI
// mencakup level lebih RENDAH), bukan naik.
exports.SCOPE_LEVEL_ORDER = {
    TENANT: 0,
    COMPANY: 1,
    BRANCH: 2,
    SITE: 3,
    DEPARTMENT: 4,
};
function ancestorIdAtLevel(ancestors, level) {
    switch (level) {
        case "TENANT":
            return ancestors.tenantId;
        case "COMPANY":
            return ancestors.companyId;
        case "BRANCH":
            return ancestors.branchId;
        case "SITE":
            return ancestors.siteId;
        case "DEPARTMENT":
            return ancestors.departmentId;
    }
}
/**
 * Pure/sync — dipanggil setelah ancestor chain target (kalau ada) DIRESOLUSI
 * TERLEBIH DAHULU oleh caller (DB access ada di
 * PrismaScopeHierarchyResolver, bukan di sini). Kalau targetAncestors tidak
 * disuplai (mis. entity target tidak ditemukan — fail closed, BUKAN
 * throw — lihat prisma-scope-hierarchy.resolver.ts), fallback ke baseline
 * 0.8 (exact-match-or-TENANT) — TIDAK PERNAH lebih longgar dari sebelumnya,
 * hanya lebih sempit-atau-sama.
 */
function scopeCovers(assignment, target, targetAncestors) {
    if (assignment.scopeType === "TENANT") {
        return true;
    }
    if (assignment.scopeId === null) {
        return false;
    }
    if (assignment.scopeType === target.scopeType) {
        return assignment.scopeId === target.scopeId;
    }
    if (!targetAncestors) {
        return false;
    }
    if (exports.SCOPE_LEVEL_ORDER[assignment.scopeType] >= exports.SCOPE_LEVEL_ORDER[target.scopeType]) {
        // assignment ada di level SAMA (sudah ditangani exact-match di atas)
        // atau LEBIH DALAM dari target -- tidak pernah mencakup "ke atas".
        return false;
    }
    return ancestorIdAtLevel(targetAncestors, assignment.scopeType) === assignment.scopeId;
}
//# sourceMappingURL=scope-hierarchy.js.map