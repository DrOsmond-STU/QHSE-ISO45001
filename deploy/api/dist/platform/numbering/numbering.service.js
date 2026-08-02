"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../tenancy/prisma.service");
const tenant_context_1 = require("../tenancy/tenant-context");
const numbering_pattern_1 = require("./numbering-pattern");
// TDD §5.1/§9 — tenant SELALU ambient lewat tenantContextStorage, TIDAK ada
// parameter tenantId eksplisit di method publik (persis pola
// WorkflowEngineService task 0.9), walau TESTING §6 menulis contoh kode
// dengan `tenantId` sebagai argumen literal — itu pseudo-code ilustratif
// untuk skenario konkurensi, bukan kontrak signature yang mengikat (sama
// perlakuan yang sudah diberikan ke workflow-engine terhadap TDD §9 prose).
function requireTenantId() {
    const tenantId = (0, tenant_context_1.getCurrentTenantId)();
    if (!tenantId) {
        throw new Error("Tenant context tidak ditemukan — request ditolak (fail closed).");
    }
    return tenantId;
}
let NumberingService = class NumberingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Master PRD §10 — generate nomor dokumen/record legal berikutnya untuk
     * `moduleCode` (mis. WORK_PERMIT/INCIDENT/CAPA). Atomic: row lock
     * (`SELECT ... FOR UPDATE`) di dalam transaksi RLS yang sama supaya
     * submission konkuren TIDAK PERNAH menghasilkan nomor duplikat (TESTING
     * §6) — panggilan kedua yang konkuren blok di lock sampai panggilan
     * pertama commit, baru baca last_sequence yang sudah ter-update.
     *
     * Reset periode (YEARLY/MONTHLY) dievaluasi tiap panggilan (bandingkan
     * computePeriodKey sekarang vs baris tersimpan) — kalau beda, sequence
     * reset ke 1 alih-alih lanjut, dan lastPeriodKey baris di-update.
     *
     * Render pattern (bisa throw kalau ada token tak dikenal/variables
     * kurang) SENGAJA dijalankan SEBELUM tx.numberingConfig.update() —
     * kegagalan render tidak boleh "membakar" nomor urut (row lock + seluruh
     * transaksi otomatis rollback kalau exception dilempar sebelum commit).
     *
     * TIDAK ada dedup/idempotency-key eksplisit di sini per desain: caller
     * (modul domain) yang punya kolom nomor nullable di record-nya sendiri
     * (mis. `work_permits.permit_number`) bertanggung jawab tidak memanggil
     * ulang generateNext() untuk record yang SUDAH punya nomor — sama seperti
     * WorkflowEngineService.startInstance() (task 0.9) tidak dedup sendiri
     * terhadap entityId yang sama. Idempotency HTTP-level (`Idempotency-Key`
     * header, TDD §7.1) juga tanggung jawab endpoint POST modul domain, bukan
     * service platform generik ini.
     */
    async generateNext(moduleCode, options = {}) {
        const tenantId = requireTenantId();
        const scopeId = options.scopeId ?? null;
        return this.prisma.withRls(async (tx) => {
            // Row lock dulu (raw query, FOR UPDATE), baru baca typed — pola sama
            // dengan WorkflowEngineService.actOnTask (task 0.9). "IS NOT DISTINCT
            // FROM" (bukan "=") supaya scope_id NULL (scope TENANT) tetap match —
            // "= NULL" di SQL selalu UNKNOWN, tidak pernah match apa pun.
            const locked = await tx.$queryRaw `
        SELECT numbering_config_id FROM numbering_configs
        WHERE tenant_id = ${tenantId}::uuid
          AND module_code = ${moduleCode}
          AND scope_id IS NOT DISTINCT FROM ${scopeId}::uuid
        FOR UPDATE
      `;
            if (locked.length === 0) {
                throw new common_1.NotFoundException(`numbering_configs belum dikonfigurasi untuk module_code=${moduleCode}` +
                    (scopeId ? ` scope_id=${scopeId}` : " (scope tenant)") +
                    ". Admin wajib setup numbering config dulu sebelum modul ini bisa generate nomor.");
            }
            const config = await tx.numberingConfig.findUniqueOrThrow({ where: { id: locked[0].numbering_config_id } });
            const now = new Date();
            const currentPeriodKey = (0, numbering_pattern_1.computePeriodKey)(config.resetPeriod, now);
            const isNewPeriod = currentPeriodKey !== config.lastPeriodKey;
            const nextSequence = isNewPeriod ? 1 : config.lastSequence + 1;
            const documentNumber = (0, numbering_pattern_1.renderNumberPattern)(config.pattern, {
                prefix: config.prefix,
                sequence: nextSequence,
                now,
                variables: options.variables,
            });
            await tx.numberingConfig.update({
                where: { id: config.id },
                data: { lastSequence: nextSequence, lastPeriodKey: currentPeriodKey },
            });
            return documentNumber;
        });
    }
};
exports.NumberingService = NumberingService;
exports.NumberingService = NumberingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NumberingService);
//# sourceMappingURL=numbering.service.js.map