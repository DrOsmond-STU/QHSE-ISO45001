"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireActorUserId = requireActorUserId;
exports.requireTenantId = requireTenantId;
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
// Duplikat kecil (BUKAN impor lintas domain) — pola sama seluruh modul
// domain lain di codebase ini (gap TDD §26 poin 29, task 1.2).
function requireActorUserId() {
    const userId = (0, tenant_context_1.getCurrentUserId)();
    if (!userId) {
        throw new Error("Actor user_id tidak ditemukan di context — operasi audit ditolak (fail closed).");
    }
    return userId;
}
function requireTenantId() {
    const tenantId = (0, tenant_context_1.getCurrentTenantId)();
    if (!tenantId) {
        throw new Error("Tenant context tidak ditemukan — operasi audit ditolak (fail closed).");
    }
    return tenantId;
}
//# sourceMappingURL=audit-context.js.map