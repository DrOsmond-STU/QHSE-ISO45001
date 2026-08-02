"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluatePermission = evaluatePermission;
exports.evaluateUserHasRole = evaluateUserHasRole;
exports.evaluateScopedIds = evaluateScopedIds;
const scope_hierarchy_1 = require("./scope-hierarchy");
/**
 * Master PRD §8.3: TENANT scope selalu memenuhi scope apa pun yang diminta
 * (akses lintas hierarki); exact-match scopeType+scopeId juga selalu
 * memenuhi. Sejak task 1.1: assignment di level LEBIH TINGGI dari
 * scopeContext yang diminta JUGA memenuhi kalau scopeContext adalah
 * turunannya ("HSE Officer scope Site X melihat Site X dan
 * turunannya/Department di bawahnya") — dibuktikan lewat `targetAncestors`
 * (ancestor chain scopeContext, diresolusi PermissionService via
 * ScopeHierarchyResolver SEBELUM memanggil fungsi pure ini). Kalau
 * targetAncestors tidak disuplai (mis. dipanggil tanpa hierarki tersedia,
 * atau entity scopeContext tidak ditemukan — fail closed, lihat
 * scopeCovers()), fallback ke baseline 0.8 (exact-match-or-TENANT) —
 * PERILAKU TIDAK PERNAH lebih longgar dari sebelumnya, hanya lebih sempit
 * atau sama.
 */
function evaluatePermission(assignments, permissionCode, scopeContext, targetAncestors) {
    const matching = assignments.filter((a) => a.permissionCodes.includes(permissionCode));
    if (matching.length === 0) {
        return false;
    }
    if (!scopeContext) {
        return true;
    }
    return matching.some((a) => (0, scope_hierarchy_1.scopeCovers)(a, scopeContext, targetAncestors));
}
function evaluateUserHasRole(assignments, roleCode) {
    return assignments.some((a) => a.roleCode === roleCode);
}
/**
 * Data-scoping primitive (Master PRD §8.3 / TDD §8.2 "query filter otomatis
 * di repository layer"). Caller (future domain repository) menyusun
 * `WHERE site_id IN (:ids)` dari hasil ini — WAJIB perlakukan
 * `{unrestricted:false, ids:[]}` sebagai DENY-ALL (kembalikan 0 baris),
 * BUKAN mengeksekusi `WHERE x IN ()` (SQL valid tapi gampang salah kaprah
 * dikira "tidak ada filter").
 *
 * `descendantIdsByAssignment` (task 1.1) — map opsional `"{scopeType}:
 * {scopeId}" -> id[]` HASIL RESOLUSI SEBELUMNYA (PermissionService, via
 * ScopeHierarchyResolver.resolveDescendantIds) untuk tiap assignment yang
 * levelnya LEBIH TINGGI dari `scopeType` diminta — fungsi ini TETAP pure/
 * sync, tidak pernah panggil DB sendiri. Tanpa map ini (backward compat),
 * assignment di level lebih tinggi TIDAK berkontribusi (baseline 0.8).
 */
function evaluateScopedIds(assignments, scopeType, descendantIdsByAssignment) {
    if (assignments.some((a) => a.scopeType === "TENANT")) {
        return { unrestricted: true };
    }
    const ids = new Set();
    for (const a of assignments) {
        if (a.scopeId === null) {
            continue;
        }
        if (a.scopeType === scopeType) {
            ids.add(a.scopeId);
        }
        else if (descendantIdsByAssignment && scope_hierarchy_1.SCOPE_LEVEL_ORDER[a.scopeType] < scope_hierarchy_1.SCOPE_LEVEL_ORDER[scopeType]) {
            for (const id of descendantIdsByAssignment.get(`${a.scopeType}:${a.scopeId}`) ?? []) {
                ids.add(id);
            }
        }
    }
    return { unrestricted: false, ids: [...ids] };
}
