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
exports.EntitlementCheckService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../tenancy/prisma.service");
// Task 1.5 — BR-01 (Modul 31 §6): "module_entitlements.is_enabled=false
// WAJIB memblokir akses UI & API modul tersebut secara penuh ... enforced
// di middleware backend." Query LANGSUNG ke tenant_subscriptions/
// module_entitlements (BUKAN impor EntitlementService dari
// modules/domains/system-administration/*) — pola PERSIS
// PrismaScopeHierarchyResolver (platform/rbac, task 1.1): platform/*
// TIDAK BOLEH impor modul domain (arah modular monolith terbalik,
// berpotensi circular). Dipakai EntitlementGuard (entitlement.guard.ts).
let EntitlementCheckService = class EntitlementCheckService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Tenant yang BELUM PERNAH punya `tenant_subscriptions` sama sekali
     * (seluruh tenant lama pra-1.5, tiap fixture test 0.1-1.4) lolos TANPA
     * syarat (fail OPEN utk kasus ini SECARA SENGAJA) — supaya provisioning
     * formal tidak diam-diam jadi migrasi wajib retroaktif utk seluruh
     * tenant lama, gap didokumentasikan TDD §26. Tenant yang SUDAH punya
     * minimal 1 baris `tenant_subscriptions` (APAPUN statusnya —
     * `module_entitlements` adalah snapshot POINT-IN-TIME, bukan
     * re-derivasi dari status subscription terkini) baru tunduk fail-closed:
     * baris `module_entitlements` TIDAK ADA ATAU `is_enabled=false` ->
     * DITOLAK.
     */
    async isModuleEnabledForTenant(tenantId, moduleCode) {
        return this.prisma.withRls(async (tx) => {
            const hasAnySubscription = await tx.tenantSubscription.findFirst({ where: { tenantId }, select: { id: true } });
            if (!hasAnySubscription)
                return true;
            const entitlement = await tx.moduleEntitlement.findUnique({
                where: { tenantId_moduleCode: { tenantId, moduleCode } },
            });
            return entitlement?.isEnabled ?? false;
        });
    }
    /** permission_code (mis. "user_mgmt.permission.manage") DAN module_code
     * (mis. "USER_MGMT") TIDAK selalu casing-identik (dibuktikan empiris:
     * prefix permission_code sebelum titik pertama "user_mgmt" LOWERCASE,
     * sementara Permission.moduleCode tersimpan "USER_MGMT" UPPERCASE) —
     * jadi module_code diresolusi lewat lookup katalog `permissions`
     * (kolom moduleCode yang SUDAH didenormalisasi di tiap baris permission
     * sejak 0.8), BUKAN string-parsing prefix permission_code. Tabel
     * `permissions` GLOBAL tanpa RLS (0.8) — query langsung, tanpa withRls(). */
    async resolveModuleCodeForPermission(permissionCode) {
        const permission = await this.prisma.permission.findUnique({
            where: { permissionCode },
            select: { moduleCode: true },
        });
        return permission?.moduleCode ?? null;
    }
};
exports.EntitlementCheckService = EntitlementCheckService;
exports.EntitlementCheckService = EntitlementCheckService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EntitlementCheckService);
//# sourceMappingURL=entitlement-check.service.js.map