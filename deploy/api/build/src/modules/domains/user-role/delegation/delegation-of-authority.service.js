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
exports.DelegationOfAuthorityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const user_role_context_1 = require("../user-role-context");
const delegation_lifecycle_1 = require("./delegation-lifecycle");
// Task 1.4 (Modul 02 §4.3/§5) — master record organisasional/HR-driven.
// BELUM ada controller HTTP (pola sama seluruh task 1.1-1.3).
let DelegationOfAuthorityService = class DelegationOfAuthorityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /** BR-07 — overlap dicek terhadap kombinasi identitas
     * (delegator/role/scope) yang SAMA, status SCHEDULED/ACTIVE saja
     * (riwayat EXPIRED/CANCELLED/REVOKED tidak menghalangi). Delegator/
     * delegate divalidasi ADA di tenant yang sama (query di dalam withRls(),
     * RLS yang jadi jaminan — pola sama gap TDD §26 poin 14: FK constraint
     * TIDAK menghormati RLS, jadi validasi eksplisit tetap wajib walau FK
     * "sukses"). */
    async create(input) {
        const createdBy = (0, user_role_context_1.requireActorUserId)();
        const tenantId = (0, user_role_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const [delegator, delegate] = await Promise.all([
                tx.user.findUnique({ where: { id: input.delegatorUserId }, select: { id: true } }),
                tx.user.findUnique({ where: { id: input.delegateUserId }, select: { id: true } }),
            ]);
            if (!delegator)
                throw new common_1.NotFoundException(`delegator_user_id "${input.delegatorUserId}" tidak ditemukan di tenant ini.`);
            if (!delegate)
                throw new common_1.NotFoundException(`delegate_user_id "${input.delegateUserId}" tidak ditemukan di tenant ini.`);
            const existing = await tx.delegationOfAuthority.findMany({
                where: {
                    tenantId,
                    delegatorUserId: input.delegatorUserId,
                    roleId: input.roleId ?? null,
                    scopeType: input.scopeType ?? null,
                    scopeId: input.scopeId ?? null,
                    status: { in: ["SCHEDULED", "ACTIVE"] },
                },
                select: { dateFrom: true, dateTo: true },
            });
            (0, delegation_lifecycle_1.assertNoDelegationOverlap)({ dateFrom: input.dateFrom, dateTo: input.dateTo }, existing);
            return tx.delegationOfAuthority.create({
                data: {
                    tenantId,
                    delegatorUserId: input.delegatorUserId,
                    delegateUserId: input.delegateUserId,
                    scopeType: input.scopeType,
                    scopeId: input.scopeId,
                    roleId: input.roleId,
                    reason: input.reason ?? "OTHER",
                    dateFrom: input.dateFrom,
                    dateTo: input.dateTo,
                    approvedBy: input.approvedBy,
                    createdBy,
                    updatedBy: createdBy,
                },
            });
        });
    }
    /** PRD §4.3 poin 5 — "Delegator dapat REVOKE sewaktu-waktu sebelum
     * date_to." Berlaku utk SCHEDULED maupun ACTIVE (menonaktifkan
     * workflow_delegations terkait SEKETIKA kalau sudah ada — no-op aman
     * kalau belum, masih SCHEDULED). Menolak revoke delegasi yang statusnya
     * SUDAH terminal (EXPIRED/CANCELLED/REVOKED) — tidak boleh mengubah
     * riwayat. */
    async revoke(delegationId) {
        const updatedBy = (0, user_role_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const current = await tx.delegationOfAuthority.findUniqueOrThrow({ where: { id: delegationId } });
            if (current.status !== "SCHEDULED" && current.status !== "ACTIVE") {
                throw new common_1.ConflictException(`Delegasi berstatus "${current.status}" — hanya SCHEDULED/ACTIVE yang bisa di-REVOKE.`);
            }
            const updated = await tx.delegationOfAuthority.update({
                where: { id: delegationId },
                data: { status: "REVOKED", updatedBy },
            });
            await tx.workflowDelegation.updateMany({
                where: { sourceDelegationOfAuthorityId: delegationId, isActive: true },
                data: { isActive: false },
            });
            return updated;
        });
    }
    async listForDelegator(delegatorUserId) {
        return this.prisma.withRls((tx) => tx.delegationOfAuthority.findMany({ where: { delegatorUserId }, orderBy: { dateFrom: "desc" } }));
    }
};
exports.DelegationOfAuthorityService = DelegationOfAuthorityService;
exports.DelegationOfAuthorityService = DelegationOfAuthorityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DelegationOfAuthorityService);
