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
exports.OccupationalHealthAuthorizedUserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const occupational_health_context_1 = require("./occupational-health-context");
// BR-02 dual-gate bagian (b) — admin CRUD whitelist. PRD §13 Open Question
// #1 SENDIRI belum menjawab apakah wajib dual-approval (HSE Manager +
// Tenant Admin) atau cukup Tenant Admin tunggal — diimplementasikan SEBAGAI
// single-approval (authorizedBy = actor tunggal) demi kesederhanaan Phase
// 1, gap TDD §26 (dual-approval BUTUH state machine "pending confirmation"
// baru yang PRD sendiri belum putuskan strukturnya).
let OccupationalHealthAuthorizedUserService = class OccupationalHealthAuthorizedUserService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async grant(input) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.occupationalHealthAuthorizedUser.create({
            data: {
                tenantId,
                userId: input.userId,
                authorizedScopeType: input.authorizedScopeType,
                authorizedScopeId: input.authorizedScopeId,
                medicalPractitionerLicenseNo: input.medicalPractitionerLicenseNo,
                authorizationReason: input.authorizationReason,
                authorizedBy: actorUserId,
                authorizedAt: new Date(),
                expiryDate: input.expiryDate,
                status: "ACTIVE",
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    async revoke(id, revokeReason) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.occupationalHealthAuthorizedUser.update({
            where: { id },
            data: { status: "REVOKED", revokedAt: new Date(), revokedBy: actorUserId, revokeReason, updatedBy: actorUserId },
        }));
    }
    async markExpired(id) {
        return this.prisma.withRls((tx) => tx.occupationalHealthAuthorizedUser.update({ where: { id }, data: { status: "EXPIRED" } }));
    }
    async getById(id) {
        return this.prisma.withRls((tx) => tx.occupationalHealthAuthorizedUser.findUniqueOrThrow({ where: { id } }));
    }
    async listByUser(userId) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.occupationalHealthAuthorizedUser.findMany({ where: { tenantId, userId }, orderBy: { authorizedAt: "desc" } }));
    }
    /** Dipakai occupational-health-authorization-expiry-scan.service.ts (task
     * 265) — kandidat ACTIVE yang expiryDate-nya sudah lewat, TAPI status
     * kolomnya belum ditransisikan (fail-closed di isAuthorizationActive()
     * TIDAK bergantung ke scan ini, scan HANYA menjaga kolom status tetap
     * akurat utk pelaporan/UI). */
    async listActiveExpired(asOfDate) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.occupationalHealthAuthorizedUser.findMany({ where: { tenantId, status: "ACTIVE", expiryDate: { lt: asOfDate } } }));
    }
};
exports.OccupationalHealthAuthorizedUserService = OccupationalHealthAuthorizedUserService;
exports.OccupationalHealthAuthorizedUserService = OccupationalHealthAuthorizedUserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OccupationalHealthAuthorizedUserService);
