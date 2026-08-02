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
exports.AuditLogService = void 0;
const common_1 = require("@nestjs/common");
const request_context_1 = require("../observability/request-context");
const tenant_context_1 = require("../tenancy/tenant-context");
const prisma_service_1 = require("../tenancy/prisma.service");
// Master PRD §11.6 poin 6 — "dicatat otomatis...untuk operasi
// create/update/delete/APPROVE/EXPORT/LOGIN". create/update/delete mutasi
// baris tunggal SUDAH tertangkap generik oleh trigger `audit_log_capture()`
// (audit-log-trigger.template.sql) — service ini untuk SISANYA: aksi
// semantik yang bukan mutasi baris sederhana (login tidak selalu menulis
// baris, export menghasilkan file bukan row, "approve" kadang perlu
// before/after gabungan lintas beberapa baris sekaligus).
//
// record() menerima `tx` EKSPLISIT (pola sama ApproverResolutionService
// 0.9) — WAJIB dipanggil di DALAM withRls() milik caller sendiri supaya
// baris audit atomic dengan operasi bisnis yang memicunya (bukan
// auto-commit terpisah — pelajaran yang sama yang membuat trigger
// dipilih di atas Prisma extension, lihat migration init).
let AuditLogService = class AuditLogService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async record(tx, entry) {
        // Trigger generik (audit_log_capture()) mengisi tenant_id/actor_user_id/
        // correlation_id/ip_address/user_agent dari Postgres session GUC
        // (current_setting('app.current_xxx')) yang di-SET LOCAL withRls() —
        // insert manual lewat Prisma model create() di sini TIDAK melalui
        // trigger itu (systemAuditLog bukan tabel yang di-trigger), jadi field
        // yang sama harus diisi eksplisit dari AsyncLocalStorage yang SAMA
        // persis dipakai withRls() supaya kedua jalur (otomatis vs manual)
        // hasilnya konsisten.
        await tx.systemAuditLog.create({
            data: {
                tenantId: (0, tenant_context_1.getCurrentTenantId)(),
                actorUserId: (0, tenant_context_1.getCurrentUserId)(),
                action: entry.action,
                entityType: entry.entityType,
                entityId: entry.entityId,
                beforeValue: entry.beforeValue,
                afterValue: entry.afterValue,
                ipAddress: (0, request_context_1.getCurrentIpAddress)(),
                userAgent: (0, request_context_1.getCurrentUserAgent)(),
                correlationId: (0, request_context_1.getCurrentCorrelationId)(),
            },
        });
    }
    /**
     * Convenience untuk pemanggil yang BELUM berada di dalam withRls() milik
     * sendiri (mis. AuthService mencatat event LOGIN yang tidak selalu
     * memodifikasi baris lain). Membuka transaksi withRls() SENDIRI — kalau
     * caller SUDAH punya tx aktif, pakai record(tx, entry) langsung supaya
     * tetap dalam transaksi yang sama (atomicity), JANGAN panggil ini nested.
     */
    async recordStandalone(entry) {
        await this.prisma.withRls((tx) => this.record(tx, entry));
    }
};
exports.AuditLogService = AuditLogService;
exports.AuditLogService = AuditLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditLogService);
//# sourceMappingURL=audit-log.service.js.map