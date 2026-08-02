"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withCleanUniqueViolation = withCleanUniqueViolation;
exports.requireActorUserId = requireActorUserId;
exports.requireTenantId = requireTenantId;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
// Duplikat kecil (BUKAN impor lintas domain) — pola sama seluruh modul
// domain lain di codebase ini (gap TDD §26 poin 29, task 1.2).
async function withCleanUniqueViolation(fn, message) {
    try {
        return await fn();
    }
    catch (err) {
        if (err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            throw new common_1.ConflictException(message);
        }
        throw err;
    }
}
function requireActorUserId() {
    const userId = (0, tenant_context_1.getCurrentUserId)();
    if (!userId) {
        throw new Error("Actor user_id tidak ditemukan di context — operasi work-permit ditolak (fail closed).");
    }
    return userId;
}
function requireTenantId() {
    const tenantId = (0, tenant_context_1.getCurrentTenantId)();
    if (!tenantId) {
        throw new Error("Tenant context tidak ditemukan — operasi work-permit ditolak (fail closed).");
    }
    return tenantId;
}
//# sourceMappingURL=work-permit-context.js.map