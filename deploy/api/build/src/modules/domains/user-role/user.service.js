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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const audit_log_service_1 = require("../../../platform/audit-log/audit-log.service");
const user_role_context_1 = require("./user-role-context");
const user_lifecycle_1 = require("./user-lifecycle");
// Task 1.3 (Modul 02) — write-side identitas & lifecycle user. BELUM ada
// endpoint HTTP (pola sama seluruh task 1.1/1.2 — "belum ada controller
// HTTP, dipakai in-process"), dites langsung lewat integration test.
//
// PERTAMA KALINYA ada jalur programatik membuat baris `users` di luar seed
// script (seed-auth-dev.ts/seed-rbac-baseline.ts) — task 0.6-1.2 hanya
// pernah membaca `users`, tidak pernah menulisnya lewat service.
let UserService = class UserService {
    prisma;
    auditLogService;
    constructor(prisma, auditLogService) {
        this.prisma = prisma;
        this.auditLogService = auditLogService;
    }
    /** PRD Modul 02 §4.1 langkah 1 — status awal selalu INVITED, invitedAt
     * diisi. Password/aktivasi ditangani alur login (platform/auth/*, task
     * 0.6) yang SUDAH ADA — TIDAK diubah task ini (gap TDD §26, mengikuti
     * disiplin yang sama seperti sso_mappings: primitif lifecycle disiapkan
     * di sini, wiring ke titik "first successful login" bukan cakupan
     * modul domain, itu perubahan platform/auth cross-cutting). */
    async inviteUser(input) {
        const tenantId = (0, user_role_context_1.requireTenantId)();
        const createdBy = (0, user_role_context_1.requireActorUserId)();
        const userType = input.userType ?? "INTERNAL_EMPLOYEE";
        (0, user_lifecycle_1.validateTenantIdForUserType)(userType, tenantId);
        return this.prisma.withRls((tx) => (0, user_role_context_1.withCleanUniqueViolation)(() => tx.user.create({
            data: {
                ...input,
                userType,
                tenantId,
                createdBy,
                updatedBy: createdBy,
                status: "INVITED",
                invitedAt: new Date(),
            },
        }), `BR-01/BR-09: email "${input.email}" atau employee_id "${input.employeeId ?? ""}" sudah dipakai di tenant ini.`));
    }
    async activateUser(userId) {
        const updatedBy = (0, user_role_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
            (0, user_lifecycle_1.validateUserStatusTransition)(current.status, "ACTIVE");
            return tx.user.update({
                where: { id: userId },
                data: { status: "ACTIVE", activatedAt: new Date(), updatedBy },
            });
        });
    }
    /** PRD Modul 02 §4.2 — ACTIVE->SUSPENDED, reason WAJIB (free text,
     * dicatat system_audit_logs) + seluruh user_sessions aktif di-revoke
     * otomatis. Trigger audit_log_capture() (0.13) sudah menangkap
     * before/after baris users secara otomatis — reason (bukan kolom
     * users) dicatat TERPISAH lewat AuditLogService.record() (pola sama
     * banner comment-nya: "aksi semantik yang bukan mutasi baris
     * sederhana"). */
    async suspendUser(userId, reason) {
        const updatedBy = (0, user_role_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
            (0, user_lifecycle_1.validateUserStatusTransition)(current.status, "SUSPENDED");
            const updated = await tx.user.update({
                where: { id: userId },
                data: { status: "SUSPENDED", suspendedAt: new Date(), updatedBy },
            });
            await tx.userSession.updateMany({
                where: { userId, revoked: false },
                data: { revoked: true, revokedReason: "SUSPENDED" },
            });
            await this.auditLogService.record(tx, {
                action: "USER_SUSPEND",
                entityType: "users",
                entityId: userId,
                afterValue: { reason },
            });
            return updated;
        });
    }
    /** SUSPENDED->ACTIVE — reaktivasi langsung (BR-02), beda dari
     * DEACTIVATED->ACTIVE yang TIDAK diizinkan sama sekali (lihat
     * user-lifecycle.ts). */
    async reactivateUser(userId) {
        const updatedBy = (0, user_role_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
            (0, user_lifecycle_1.validateUserStatusTransition)(current.status, "ACTIVE");
            return tx.user.update({
                where: { id: userId },
                data: { status: "ACTIVE", suspendedAt: null, updatedBy },
            });
        });
    }
    /** PRD Modul 02 §4.2 — (ACTIVE|SUSPENDED)->DEACTIVATED, bersifat
     * mendekati terminal (offboarding). Memicu OTOMATIS: revoke seluruh
     * sesi, user_roles->INACTIVE (BUKAN dihapus, demi audit trail — literal
     * PRD). Notifikasi ke reporting_to_user_id/Tenant Admin (§4.2) SENGAJA
     * belum di-wire (gap TDD §26) — template notifikasi spesifik tidak ada
     * di katalog literal §8, menebak isinya berisiko salah. */
    async deactivateUser(userId) {
        const updatedBy = (0, user_role_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
            (0, user_lifecycle_1.validateUserStatusTransition)(current.status, "DEACTIVATED");
            const updated = await tx.user.update({
                where: { id: userId },
                data: { status: "DEACTIVATED", deactivatedAt: new Date(), updatedBy },
            });
            await tx.userSession.updateMany({
                where: { userId, revoked: false },
                data: { revoked: true, revokedReason: "SUSPENDED" },
            });
            await tx.userRole.updateMany({
                where: { userId, status: "ACTIVE" },
                data: { status: "INACTIVE", updatedBy },
            });
            return updated;
        });
    }
    /** PRD Modul 02 §7 — sinkronisasi subset HRIS (employee_id/department_id/
     * reporting_to_user_id/job_title), BUKAN pengganti HRIS (Non-Goals §2.2).
     * employeeId SENGAJA tidak diubah di sini (BR-09 unique identifier,
     * perubahan employee_id pasca-provisioning di luar cakupan "sinkron"
     * literal PRD — kalau memang berubah, itu perbaikan data manual bukan
     * sync rutin). */
    async syncFromHris(userId, input) {
        const updatedBy = (0, user_role_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.user.update({
            where: { id: userId },
            data: { ...input, hrisLastSyncedAt: new Date(), updatedBy },
        }));
    }
    /** BR-03 (PRD Modul 02 §6) — scope_id WAJIB tervalidasi konsisten:
     * entitas yang dirujuk harus benar-benar berada di tenant_id yang sama.
     * Query LANGSUNG ke tabel companies/branches/sites/departments (BUKAN
     * impor OrganizationService) — pola SAMA PERSIS
     * platform/rbac/prisma-scope-hierarchy.resolver.ts (task 1.1): modul
     * lain yang butuh data organisasi query Prisma langsung, bukan lewat
     * service class modul lain, supaya tidak menambah coupling antar modul
     * domain yang tidak perlu. */
    async assignRole(input) {
        const createdBy = (0, user_role_context_1.requireActorUserId)();
        const tenantId = (0, user_role_context_1.requireTenantId)();
        if (input.scopeType === "TENANT" && input.scopeId) {
            throw new common_1.BadRequestException("BR-03: scope_id harus NULL kalau scope_type=TENANT.");
        }
        if (input.scopeType !== "TENANT" && !input.scopeId) {
            throw new common_1.BadRequestException(`BR-03: scope_id wajib diisi utk scope_type=${input.scopeType}.`);
        }
        return this.prisma.withRls(async (tx) => {
            if (input.scopeId) {
                await this.assertScopeBelongsToTenant(tx, input.scopeType, input.scopeId, tenantId);
            }
            return tx.userRole.create({
                data: {
                    tenantId,
                    userId: input.userId,
                    roleId: input.roleId,
                    scopeType: input.scopeType,
                    scopeId: input.scopeId,
                    validFrom: input.validFrom,
                    validTo: input.validTo,
                    updatedBy: createdBy,
                },
            });
        });
    }
    async revokeRole(userRoleId) {
        const updatedBy = (0, user_role_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.userRole.update({
            where: { id: userRoleId },
            data: { status: "INACTIVE", updatedBy },
        }));
    }
    /** BR-03 — `tx` di sini SELALU tx ber-RLS (dipanggil dari dalam
     * withRls() callback), jadi query di bawah TIDAK PERNAH bisa
     * mengembalikan baris milik tenant lain sama sekali — RLS sudah
     * memfilternya SEBELUM sampai ke perbandingan row.tenantId!==tenantId
     * (dibuktikan empiris lewat test: scope_id lintas tenant menghasilkan
     * NotFoundException, bukan pernah mencapai baris BadRequestException di
     * bawah). Efek sampingnya JUSTRU baik: caller tidak bisa membedakan
     * "scope_id tidak ada" dari "scope_id ada tapi milik tenant lain" —
     * mencegah kebocoran informasi keberadaan entitas lintas tenant lewat
     * pesan error. Perbandingan eksplisit TETAP dipertahankan (bukan dihapus)
     * sebagai defense-in-depth kalau method ini kelak direfactor memakai
     * koneksi non-RLS secara tidak sengaja. */
    async assertScopeBelongsToTenant(tx, scopeType, scopeId, tenantId) {
        const row = await (scopeType === "COMPANY"
            ? tx.company.findUnique({ where: { id: scopeId }, select: { tenantId: true } })
            : scopeType === "BRANCH"
                ? tx.branch.findUnique({ where: { id: scopeId }, select: { tenantId: true } })
                : scopeType === "SITE"
                    ? tx.site.findUnique({ where: { id: scopeId }, select: { tenantId: true } })
                    : tx.department.findUnique({ where: { id: scopeId }, select: { tenantId: true } }));
        if (!row) {
            throw new common_1.NotFoundException(`BR-03: entitas scope_type=${scopeType} scope_id="${scopeId}" tidak ditemukan.`);
        }
        if (row.tenantId !== tenantId) {
            throw new common_1.BadRequestException(`BR-03: scope_id "${scopeId}" bukan milik tenant ini.`);
        }
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService])
], UserService);
