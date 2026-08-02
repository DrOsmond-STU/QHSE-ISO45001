"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const permission_resolution_1 = require("./permission-resolution");
function assignment(overrides = {}) {
    return {
        roleId: (0, node_crypto_1.randomUUID)(),
        roleCode: "HSE_OFFICER",
        scopeType: "SITE",
        scopeId: (0, node_crypto_1.randomUUID)(),
        permissionCodes: ["work_permit.permit.approve"],
        ...overrides,
    };
}
describe("evaluatePermission", () => {
    it("false kalau tidak ada assignment yang punya permission code diminta", () => {
        const assignments = [assignment({ permissionCodes: ["incident.report.create"] })];
        expect((0, permission_resolution_1.evaluatePermission)(assignments, "work_permit.permit.approve")).toBe(false);
    });
    it("true kalau ada match permission code TANPA scopeContext diminta", () => {
        const assignments = [assignment()];
        expect((0, permission_resolution_1.evaluatePermission)(assignments, "work_permit.permit.approve")).toBe(true);
    });
    it("scope TENANT selalu memenuhi scopeContext apa pun", () => {
        const assignments = [assignment({ scopeType: "TENANT", scopeId: null })];
        const scopeContext = { scopeType: "SITE", scopeId: (0, node_crypto_1.randomUUID)() };
        expect((0, permission_resolution_1.evaluatePermission)(assignments, "work_permit.permit.approve", scopeContext)).toBe(true);
    });
    it("scope non-TENANT harus exact match scopeType DAN scopeId", () => {
        const siteId = (0, node_crypto_1.randomUUID)();
        const assignments = [assignment({ scopeType: "SITE", scopeId: siteId })];
        expect((0, permission_resolution_1.evaluatePermission)(assignments, "work_permit.permit.approve", { scopeType: "SITE", scopeId: siteId })).toBe(true);
        expect((0, permission_resolution_1.evaluatePermission)(assignments, "work_permit.permit.approve", { scopeType: "SITE", scopeId: (0, node_crypto_1.randomUUID)() })).toBe(false);
        expect((0, permission_resolution_1.evaluatePermission)(assignments, "work_permit.permit.approve", { scopeType: "DEPARTMENT", scopeId: siteId })).toBe(false);
    });
    it("TANPA targetAncestors disuplai: baseline 0.8 (exact-match-or-TENANT), BRANCH tidak otomatis cakup SITE anaknya", () => {
        const assignments = [assignment({ scopeType: "BRANCH", scopeId: "branch-1" })];
        expect((0, permission_resolution_1.evaluatePermission)(assignments, "work_permit.permit.approve", { scopeType: "SITE", scopeId: "site-under-branch-1" })).toBe(false);
    });
    // Task 1.1 — containment hierarki (Master PRD §8.3): assignment di level
    // LEBIH TINGGI mencakup target yang merupakan turunannya, DIBUKTIKAN lewat
    // targetAncestors (ancestor chain target, hasil resolusi
    // ScopeHierarchyResolver di PermissionService — fungsi ini sendiri tetap
    // pure/sync, cuma menerima hasilnya).
    it("DENGAN targetAncestors: assignment BRANCH mencakup SITE turunannya", () => {
        const branchId = "branch-1";
        const siteId = "site-under-branch-1";
        const assignments = [assignment({ scopeType: "BRANCH", scopeId: branchId })];
        const targetAncestors = { tenantId: "t1", companyId: "c1", branchId };
        expect((0, permission_resolution_1.evaluatePermission)(assignments, "work_permit.permit.approve", { scopeType: "SITE", scopeId: siteId }, targetAncestors)).toBe(true);
    });
    it("DENGAN targetAncestors: assignment BRANCH TIDAK mencakup SITE di branch LAIN", () => {
        const assignments = [assignment({ scopeType: "BRANCH", scopeId: "branch-1" })];
        const targetAncestors = { tenantId: "t1", companyId: "c1", branchId: "branch-OTHER" };
        expect((0, permission_resolution_1.evaluatePermission)(assignments, "work_permit.permit.approve", { scopeType: "SITE", scopeId: "site-x" }, targetAncestors)).toBe(false);
    });
    it("DENGAN targetAncestors: assignment SITE (LEBIH DALAM dari target DEPARTMENT tapi levelnya sendiri lebih rendah dari yg diminta) tidak mencakup ke ATAS", () => {
        // Assignment di DEPARTMENT, target di SITE (level lebih tinggi) -- akses
        // ke satu department TIDAK memberi akses ke seluruh site-nya.
        const siteId = "site-1";
        const assignments = [assignment({ scopeType: "DEPARTMENT", scopeId: "dept-1" })];
        const targetAncestors = { tenantId: "t1", companyId: "c1", branchId: "b1", siteId };
        expect((0, permission_resolution_1.evaluatePermission)(assignments, "work_permit.permit.approve", { scopeType: "SITE", scopeId: siteId }, targetAncestors)).toBe(false);
    });
    it("DENGAN targetAncestors: assignment COMPANY mencakup DEPARTMENT 2 level di bawahnya", () => {
        const companyId = "company-1";
        const departmentId = "dept-1";
        const assignments = [assignment({ scopeType: "COMPANY", scopeId: companyId })];
        const targetAncestors = { tenantId: "t1", companyId, branchId: "b1", siteId: "s1", departmentId };
        expect((0, permission_resolution_1.evaluatePermission)(assignments, "work_permit.permit.approve", { scopeType: "DEPARTMENT", scopeId: departmentId }, targetAncestors)).toBe(true);
    });
});
describe("evaluateUserHasRole", () => {
    it("true kalau ada assignment dengan roleCode yang sama", () => {
        const assignments = [assignment({ roleCode: "SUPER_ADMIN_PLATFORM" })];
        expect((0, permission_resolution_1.evaluateUserHasRole)(assignments, "SUPER_ADMIN_PLATFORM")).toBe(true);
    });
    it("false kalau tidak ada", () => {
        const assignments = [assignment({ roleCode: "HSE_OFFICER" })];
        expect((0, permission_resolution_1.evaluateUserHasRole)(assignments, "SUPER_ADMIN_PLATFORM")).toBe(false);
    });
});
describe("evaluateScopedIds", () => {
    it("unrestricted:true kalau ada assignment scope TENANT", () => {
        const assignments = [assignment({ scopeType: "TENANT", scopeId: null })];
        expect((0, permission_resolution_1.evaluateScopedIds)(assignments, "SITE")).toEqual({ unrestricted: true });
    });
    it("mengembalikan ID unik utk scopeType yang diminta", () => {
        const siteA = (0, node_crypto_1.randomUUID)();
        const siteB = (0, node_crypto_1.randomUUID)();
        const assignments = [
            assignment({ scopeType: "SITE", scopeId: siteA }),
            assignment({ scopeType: "SITE", scopeId: siteA }), // duplikat sengaja
            assignment({ scopeType: "SITE", scopeId: siteB }),
            assignment({ scopeType: "DEPARTMENT", scopeId: (0, node_crypto_1.randomUUID)() }), // scope beda, harus diabaikan
        ];
        const result = (0, permission_resolution_1.evaluateScopedIds)(assignments, "SITE");
        expect(result.unrestricted).toBe(false);
        if (!result.unrestricted) {
            expect(result.ids.sort()).toEqual([siteA, siteB].sort());
        }
    });
    it("deny-all eksplisit (ids kosong) kalau tidak ada assignment sama sekali untuk scopeType diminta", () => {
        const assignments = [assignment({ scopeType: "DEPARTMENT", scopeId: (0, node_crypto_1.randomUUID)() })];
        expect((0, permission_resolution_1.evaluateScopedIds)(assignments, "SITE")).toEqual({ unrestricted: false, ids: [] });
    });
    it("deny-all eksplisit kalau assignments kosong sama sekali", () => {
        expect((0, permission_resolution_1.evaluateScopedIds)([], "SITE")).toEqual({ unrestricted: false, ids: [] });
    });
    // Task 1.1 — descendantIdsByAssignment: map hasil resolusi
    // ScopeHierarchyResolver.resolveDescendantIds() SEBELUM dipanggil (fungsi
    // ini sendiri tetap pure/sync).
    it("TANPA descendantIdsByAssignment: assignment level lebih tinggi TIDAK berkontribusi (baseline 0.8)", () => {
        const assignments = [assignment({ scopeType: "BRANCH", scopeId: "branch-1" })];
        expect((0, permission_resolution_1.evaluateScopedIds)(assignments, "SITE")).toEqual({ unrestricted: false, ids: [] });
    });
    it("DENGAN descendantIdsByAssignment: assignment BRANCH ikut menyumbang site turunannya", () => {
        const siteA = (0, node_crypto_1.randomUUID)();
        const siteB = (0, node_crypto_1.randomUUID)();
        const directSite = (0, node_crypto_1.randomUUID)();
        const assignments = [
            assignment({ scopeType: "BRANCH", scopeId: "branch-1" }),
            assignment({ scopeType: "SITE", scopeId: directSite }),
        ];
        const descendantIdsByAssignment = new Map([["BRANCH:branch-1", [siteA, siteB]]]);
        const result = (0, permission_resolution_1.evaluateScopedIds)(assignments, "SITE", descendantIdsByAssignment);
        expect(result.unrestricted).toBe(false);
        if (!result.unrestricted) {
            expect(result.ids.sort()).toEqual([siteA, siteB, directSite].sort());
        }
    });
});
