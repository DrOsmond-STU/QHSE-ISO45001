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
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const request_context_1 = require("../observability/request-context");
const tenant_context_1 = require("./tenant-context");
// Runtime app WAJIB connect via role tanpa BYPASSRLS (TDD §5.2) — APP_DATABASE_URL
// (role qhse_app), BUKAN DATABASE_URL yang dipakai Prisma CLI untuk migrate
// (role admin/pemilik tabel). Lihat prisma/migrations/*_enable_rls_smoke_test.
let PrismaService = class PrismaService extends client_1.PrismaClient {
    constructor() {
        super({
            datasources: {
                db: { url: process.env.APP_DATABASE_URL },
            },
        });
    }
    async onModuleInit() {
        await this.$connect();
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
    /**
     * Bungkus satu unit kerja dalam transaksi + `SET LOCAL app.current_tenant_id`
     * (TDD §5.2), tenant_id diambil dari AsyncLocalStorage (TDD §5.1) — bukan
     * parameter manual, supaya tidak ada jalur query yang lupa filter tenant.
     * Fail closed (TDD §2 prinsip 6): tanpa tenant context, request ditolak.
     *
     * Task 0.13 — turut men-`SET LOCAL` user_id/correlation_id/ip_address/
     * user_agent (kalau ada di context) supaya trigger `audit_log_capture()`
     * (Master PRD §11.6) bisa membaca `current_setting('app.current_xxx')` dan
     * mengisi kolom actor_user_id/correlation_id/ip_address/user_agent baris
     * audit — TANPA modul pemanggil withRls() perlu tahu apa-apa soal audit
     * log (observer benar-benar "global": nol perubahan di 12 modul yang
     * sudah ada). Field selain tenantId OPSIONAL (job cross-tenant seperti
     * workflow-sla-scan tidak selalu punya user/correlation manusia).
     */
    async withRls(fn) {
        const tenantId = (0, tenant_context_1.getCurrentTenantId)();
        if (!tenantId) {
            throw new Error("Tenant context tidak ditemukan — request ditolak (fail closed).");
        }
        const userId = (0, tenant_context_1.getCurrentUserId)();
        const correlationId = (0, request_context_1.getCurrentCorrelationId)();
        const ipAddress = (0, request_context_1.getCurrentIpAddress)();
        const userAgent = (0, request_context_1.getCurrentUserAgent)();
        return this.$transaction(async (tx) => {
            // set_config dengan parameter binding (bukan interpolasi string ke SET LOCAL)
            // supaya tidak ada celah SQL injection lewat tenantId.
            await tx.$executeRaw `SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
            if (userId) {
                await tx.$executeRaw `SELECT set_config('app.current_user_id', ${userId}, true)`;
            }
            if (correlationId) {
                await tx.$executeRaw `SELECT set_config('app.current_correlation_id', ${correlationId}, true)`;
            }
            if (ipAddress) {
                await tx.$executeRaw `SELECT set_config('app.current_ip_address', ${ipAddress}, true)`;
            }
            if (userAgent) {
                await tx.$executeRaw `SELECT set_config('app.current_user_agent', ${userAgent}, true)`;
            }
            return fn(tx);
        });
    }
    /**
     * Task 1.2 — varian withRls() untuk tabel GLOBAL tanpa tenant_id sama
     * sekali (mis. industry_templates, TDD §6.3 "data referensi non-tenant").
     * TIDAK mensyaratkan tenant context (beda dari withRls() yang fail-closed
     * tanpa itu) — operasinya memang cross-tenant/pre-tenant (mis. daftar
     * katalog dipanggil SEBELUM tenant baru dibuat, PRD Modul 01 §4.1 setup
     * wizard). tenant_id SENGAJA tidak pernah di-SET LOCAL sama sekali di
     * sini (bukan cuma di-skip kalau kosong seperti userId/dst di bawah —
     * kolomnya memang tidak relevan untuk tabel yang memakai method ini).
     * actor_user_id/correlation_id/dst tetap diisi kalau context-nya ADA,
     * supaya audit_log_capture() (0.13) tetap akurat untuk write yang
     * benar-benar datang dari request terautentikasi (bukan seed/job).
     */
    async withGlobalContext(fn) {
        const userId = (0, tenant_context_1.getCurrentUserId)();
        const correlationId = (0, request_context_1.getCurrentCorrelationId)();
        const ipAddress = (0, request_context_1.getCurrentIpAddress)();
        const userAgent = (0, request_context_1.getCurrentUserAgent)();
        return this.$transaction(async (tx) => {
            if (userId) {
                await tx.$executeRaw `SELECT set_config('app.current_user_id', ${userId}, true)`;
            }
            if (correlationId) {
                await tx.$executeRaw `SELECT set_config('app.current_correlation_id', ${correlationId}, true)`;
            }
            if (ipAddress) {
                await tx.$executeRaw `SELECT set_config('app.current_ip_address', ${ipAddress}, true)`;
            }
            if (userAgent) {
                await tx.$executeRaw `SELECT set_config('app.current_user_agent', ${userAgent}, true)`;
            }
            return fn(tx);
        });
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
