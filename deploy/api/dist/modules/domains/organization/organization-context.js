"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireActorUserId = requireActorUserId;
exports.requireTenantId = requireTenantId;
exports.withCleanUniqueViolation = withCleanUniqueViolation;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
// Diekstrak dari organization.service.ts (task 1.2) supaya
// industry-template/*.service.ts bisa memakainya TANPA circular import
// (organization.service.ts sendiri sekarang impor IndustryTemplateService
// utk validasi createCompany() — kalau helper ini masih di
// organization.service.ts, industry-template/*.service.ts yang balik impor
// dari sana bikin siklus modul, gejalanya NestJS gagal resolusi DI dengan
// pesan "argument dependency at index [N]" jadi "?" karena decorator
// metadata reflect-metadata melihat class yang masih undefined saat siklus
// import terjadi — dibuktikan empiris, bukan dugaan). File ini SENGAJA
// tidak impor apa pun dari organization.service.ts maupun
// industry-template/* supaya tetap jadi leaf node di graph import.
// tenantId/actor user_id SELALU ambient lewat tenantContextStorage (tidak
// ada parameter tenantId/userId eksplisit di method publik) — pola sama
// NumberingService (0.10)/WorkflowEngineService (0.9). withRls() SENDIRI
// sudah fail closed kalau tenant context kosong; requireActorUserId() di
// sini menegakkan hal yang sama utk userId (dibutuhkan created_by/
// updated_by NOT NULL, Master PRD §11 poin 3).
function requireActorUserId() {
    const userId = (0, tenant_context_1.getCurrentUserId)();
    if (!userId) {
        throw new Error("Actor user_id tidak ditemukan di context — operasi tulis organisasi ditolak (fail closed, sama pola dgn withRls()).");
    }
    return userId;
}
/** withRls() SENDIRI sudah fail-closed kalau tenant context kosong (dicek
 * SEBELUM callback ini bahkan jalan) — helper ini cuma mengambil NILAI-nya
 * utk disertakan eksplisit di data create() (RLS bukan pengganti kolom
 * tenant_id di INSERT, keduanya wajib, pola sama modul lain). */
function requireTenantId() {
    const tenantId = (0, tenant_context_1.getCurrentTenantId)();
    if (!tenantId) {
        throw new Error("Tenant context tidak ditemukan — operasi tulis organisasi ditolak (fail closed).");
    }
    return tenantId;
}
/** BR-02 (PRD Modul 01 §6) diegakkan lewat unique index DB (schema.prisma) —
 * helper ini cuma menerjemahkan P2002 jadi error yang jelas maksudnya,
 * bukan constraint tambahan di sini. */
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
//# sourceMappingURL=organization-context.js.map