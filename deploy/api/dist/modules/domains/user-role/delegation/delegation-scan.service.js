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
exports.DelegationScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../../platform/observability/app-logger.service");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../../platform/tenancy/tenant-context");
const delegation_lifecycle_1 = require("./delegation-lifecycle");
// TDD §13.1/§9 — pola job cross-tenant PERSIS reminder-scan (1.1)/
// workflow-sla-scan (0.9): bootstrap read-only via role admin, lalu SETIAP
// tenant diproses lewat tenantContextStorage + withRls() (RLS penuh).
//
// Tiga tanggung jawab per tenant per scan (PRD Modul 02 §4.3):
// 1. BR-08 aktivasi: delegation_of_authority SCHEDULED -> ACTIVE begitu
//    date_from tercapai, PROVISIONING workflow_delegations terkait (satu
//    baris baru, sourceDelegationOfAuthorityId menunjuk balik) — mencegah
//    admin konfigurasi delegasi dua kali terpisah (PRD §4.3 poin 3).
// 2. BR-08 deaktivasi: delegation_of_authority ACTIVE -> EXPIRED begitu
//    date_to terlewati, workflow_delegations terkait di-nonaktifkan
//    (isActive:false, BUKAN dihapus — riwayat tetap ada) (PRD §4.3 poin 4).
// 3. Reroute workflow_tasks PENDING yang SUDAH ADA sebelum delegasi aktif
//    (acceptance criterion literal TASK_INSTRUCTION.md 1.4: "task yang
//    menunggu approver terdelegasi otomatis terarah ke delegate") — task
//    BARU yang dibuat SETELAH delegasi aktif sudah otomatis dapat delegate
//    lewat ApproverResolutionService.substituteActiveDelegates() (task 1.4
//    juga, tidak perlu ditangani di sini).
let DelegationScanService = class DelegationScanService {
    prisma;
    logger;
    adminPrisma;
    constructor(prisma, logger) {
        this.prisma = prisma;
        this.logger = logger;
        this.adminPrisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    }
    async onModuleDestroy() {
        await this.adminPrisma.$disconnect();
    }
    async scan(now = new Date()) {
        const rows = await this.adminPrisma.$queryRaw `
      SELECT DISTINCT tenant_id FROM delegation_of_authority WHERE status IN ('SCHEDULED', 'ACTIVE')
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                // Satu tenant error TIDAK boleh gagalkan scan tenant lain (TDD
                // §13.2 — pola sama reminder-scan/workflow-sla-scan).
                this.logger.event("error", "delegation-scan gagal untuk satu tenant", {
                    module: "user-role",
                    action: "delegation-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            await this.activateScheduled(tx, tenantId, now);
            await this.expireActive(tx, tenantId, now);
        }));
    }
    async activateScheduled(tx, tenantId, now) {
        const scheduled = await tx.delegationOfAuthority.findMany({
            where: { status: "SCHEDULED" },
            select: {
                id: true,
                dateFrom: true,
                dateTo: true,
                delegatorUserId: true,
                delegateUserId: true,
                roleId: true,
                scopeType: true,
                scopeId: true,
            },
        });
        const candidates = scheduled.map((s) => ({ delegationId: s.id, dateFrom: s.dateFrom }));
        const toActivate = (0, delegation_lifecycle_1.findDelegationsToActivate)(candidates, now);
        if (toActivate.length === 0)
            return;
        for (const candidate of toActivate) {
            const source = scheduled.find((s) => s.id === candidate.delegationId);
            /* istanbul ignore next -- source SELALU ditemukan, sama list asalnya */
            if (!source)
                continue;
            await tx.delegationOfAuthority.update({ where: { id: source.id }, data: { status: "ACTIVE" } });
            await tx.workflowDelegation.create({
                data: {
                    tenantId,
                    delegatorUserId: source.delegatorUserId,
                    delegateUserId: source.delegateUserId,
                    roleId: source.roleId,
                    scopeType: source.scopeType,
                    scopeId: source.scopeId,
                    dateFrom: source.dateFrom,
                    dateTo: source.dateTo,
                    isActive: true,
                    sourceDelegationOfAuthorityId: source.id,
                },
            });
            const reroutedCount = await this.rerouteExistingPendingTasks(tx, source.delegatorUserId, source.delegateUserId, source.roleId);
            this.logger.event("info", "delegation_of_authority SCHEDULED -> ACTIVE (BR-08)", {
                module: "user-role",
                action: "delegation-scan.activated",
                tenant_id: tenantId,
                delegation_id: source.id,
                delegator_user_id: source.delegatorUserId,
                delegate_user_id: source.delegateUserId,
                rerouted_task_count: reroutedCount,
            });
        }
    }
    async expireActive(tx, tenantId, now) {
        const active = await tx.delegationOfAuthority.findMany({
            where: { status: "ACTIVE" },
            select: { id: true, dateTo: true },
        });
        const candidates = active.map((a) => ({ delegationId: a.id, dateTo: a.dateTo }));
        const toExpire = (0, delegation_lifecycle_1.findDelegationsToExpire)(candidates, now);
        if (toExpire.length === 0)
            return;
        const expiredIds = toExpire.map((c) => c.delegationId);
        await tx.delegationOfAuthority.updateMany({ where: { id: { in: expiredIds } }, data: { status: "EXPIRED" } });
        await tx.workflowDelegation.updateMany({
            where: { sourceDelegationOfAuthorityId: { in: expiredIds }, isActive: true },
            data: { isActive: false },
        });
        this.logger.event("info", "delegation_of_authority ACTIVE -> EXPIRED (BR-08)", {
            module: "user-role",
            action: "delegation-scan.expired",
            tenant_id: tenantId,
            delegation_ids: expiredIds,
        });
    }
    /**
     * roleId NULL ("seluruh role delegator", PRD §5) me-reroute SEMUA task
     * PENDING milik delegator di stage manapun yang allowDelegation=true —
     * intent-nya "serahkan seluruh pekerjaan approval saya" (mis. cuti),
     * bukan cuma satu role. roleId TERISI mempersempit ke stage yang
     * approver_role_id-nya PERSIS cocok (delegasi eksplisit dibatasi satu
     * role, PRD §5 "batasi delegasi hanya untuk role tertentu").
     *
     * TIDAK mempersempit dgn scope_type/scope_id — workflow_tasks tidak
     * membawa referensi scope organisasi langsung (cuma
     * workflow_instances.entityType/entityId polymorphic ke tabel domain,
     * platform TIDAK BOLEH tahu bentuknya per modul) — gap didokumentasikan
     * TDD §26, pola sama keterbatasan scope ApproverResolutionService
     * (gap #23) yang sudah ada sejak 1.1.
     */
    async rerouteExistingPendingTasks(tx, delegatorUserId, delegateUserId, roleId) {
        const pendingTasks = await tx.workflowTask.findMany({
            where: {
                assignedTo: delegatorUserId,
                status: "PENDING",
                stage: { allowDelegation: true, ...(roleId ? { approverRoleId: roleId } : {}) },
            },
            select: { id: true },
        });
        if (pendingTasks.length === 0)
            return 0;
        await tx.workflowTask.updateMany({
            where: { id: { in: pendingTasks.map((t) => t.id) } },
            data: { assignedTo: delegateUserId, delegatedTo: delegateUserId },
        });
        return pendingTasks.length;
    }
};
exports.DelegationScanService = DelegationScanService;
exports.DelegationScanService = DelegationScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_logger_service_1.AppLoggerService])
], DelegationScanService);
//# sourceMappingURL=delegation-scan.service.js.map