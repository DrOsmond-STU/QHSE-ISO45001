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
exports.TenantBrandingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const system_administration_context_1 = require("../provisioning/system-administration-context");
const custom_domain_1 = require("./custom-domain");
// PRD Modul 31 §4.2/§12 — branding tenant ringan, self-service Tenant Admin
// (permission sysadmin.branding.manage, belum ditegakkan di layer ini —
// belum ada controller HTTP, pola konsisten 1.1-1.6, PermissionGuard yang
// akan menggerbanginya begitu ada endpoint).
let TenantBrandingService = class TenantBrandingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async upsert(input) {
        const tenantId = (0, system_administration_context_1.requireTenantId)();
        const actorUserId = (0, system_administration_context_1.requireActorUserId)();
        const customDomain = normalizeCustomDomain(input.customDomain);
        if (customDomain && !(0, custom_domain_1.isValidCustomDomainFormat)(customDomain)) {
            throw new common_1.BadRequestException(`Format custom_domain tidak valid: "${customDomain}".`);
        }
        return this.prisma.withRls((tx) => (0, system_administration_context_1.withCleanUniqueViolation)(() => tx.tenantBrandingConfig.upsert({
            where: { tenantId },
            create: {
                tenantId,
                logoUrl: input.logoUrl ?? null,
                primaryColor: input.primaryColor ?? null,
                displayName: input.displayName ?? null,
                customDomain,
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
            update: {
                logoUrl: input.logoUrl ?? null,
                primaryColor: input.primaryColor ?? null,
                displayName: input.displayName ?? null,
                customDomain,
                updatedBy: actorUserId,
            },
        }), `custom_domain "${customDomain}" sudah dipakai tenant lain.`));
    }
    async getByTenantId() {
        const tenantId = (0, system_administration_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.tenantBrandingConfig.findUnique({ where: { tenantId } }));
    }
};
exports.TenantBrandingService = TenantBrandingService;
exports.TenantBrandingService = TenantBrandingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantBrandingService);
function normalizeCustomDomain(customDomain) {
    if (!customDomain)
        return null;
    const trimmed = customDomain.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
}
//# sourceMappingURL=tenant-branding.service.js.map