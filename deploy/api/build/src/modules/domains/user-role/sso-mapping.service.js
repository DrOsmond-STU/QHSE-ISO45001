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
exports.SsoMappingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const user_role_context_1 = require("./user-role-context");
// Task 1.3 (Modul 02 §5/§2.2) — HANYA pemetaan identitas, bukan handshake
// SAML/OIDC sungguhan (Modul 30, belum ada). resolveByExternalSubject()
// adalah primitif yang akan dipanggil alur login SSO nanti begitu Modul 30
// (konfigurasi teknis IdP) ada — BELUM di-wire ke platform/auth/* sekarang
// (gap TDD §26, pola sama primitif business-day 1.2).
let SsoMappingService = class SsoMappingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createMapping(input) {
        const createdBy = (0, user_role_context_1.requireActorUserId)();
        const tenantId = (0, user_role_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => (0, user_role_context_1.withCleanUniqueViolation)(() => tx.ssoMapping.create({
            data: {
                ...input,
                tenantId,
                createdBy,
                updatedBy: createdBy,
                autoProvision: input.autoProvision ?? false, // PRD §13 Open Question #4 — default FALSE eksplisit
            },
        }), `Mapping SSO (idp_provider, external_subject_id) ini sudah ada di tenant.`));
    }
    async resolveByExternalSubject(idpProvider, externalSubjectId) {
        const tenantId = (0, user_role_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.ssoMapping.findUnique({
            where: { tenantId_idpProvider_externalSubjectId: { tenantId, idpProvider, externalSubjectId } },
        }));
    }
    async linkUser(ssoMappingId, userId) {
        const updatedBy = (0, user_role_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.ssoMapping.update({
            where: { id: ssoMappingId },
            data: { userId, lastSsoLoginAt: new Date(), updatedBy },
        }));
    }
    async deactivateMapping(ssoMappingId) {
        const updatedBy = (0, user_role_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.ssoMapping.update({ where: { id: ssoMappingId }, data: { status: "INACTIVE", updatedBy } }));
    }
};
exports.SsoMappingService = SsoMappingService;
exports.SsoMappingService = SsoMappingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SsoMappingService);
