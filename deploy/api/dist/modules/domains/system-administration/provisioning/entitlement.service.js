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
exports.EntitlementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const system_administration_context_1 = require("./system-administration-context");
// Task 1.5 (Modul 31 §5/§6) — module_entitlements, tenant-scoped biasa.
let EntitlementService = class EntitlementService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /** BR-01 — dipanggil ProvisioningService SETELAH tenant context di-set ke
     * tenant BARU: insert satu module_entitlements row (is_enabled:true) per
     * module_code di plan.includedModuleCodes. Modul yang TIDAK termasuk plan
     * SENGAJA TIDAK dapat baris false eksplisit — "row tidak ada" itu
     * sendiri berarti "tidak entitled" (lihat isModuleEnabledForTenant()),
     * PRD literal: "sistem otomatis MENGAKTIFKAN module_entitlements sesuai
     * plan" (bukan "membuat baris utk seluruh modul, sebagian true sebagian
     * false"). */
    async activateFromPlan(tenantId, plan) {
        if (plan.includedModuleCodes.length === 0)
            return;
        await this.prisma.withRls((tx) => tx.moduleEntitlement.createMany({
            data: plan.includedModuleCodes.map((moduleCode) => ({ tenantId, moduleCode, isEnabled: true })),
        }));
    }
    /** BR-04 — HANYA Super Admin Platform boleh override entitlement di luar
     * batas default plan. Otorisasi PERMISSION-LEVEL (`sysadmin.entitlement.override`,
     * PRD Modul 31 §3) — method ini TIDAK mengecek role secara langsung
     * (bukan tanggung jawabnya, pola sama seluruh service lain di codebase
     * ini yang mengandalkan PermissionGuard/EntitlementGuard di layer HTTP
     * begitu controller-nya ada), murni menegakkan BENTUK data (upsert by
     * tenantId+moduleCode) + audit trail (overriddenBy wajib terisi dari
     * actor). */
    async override(input) {
        const overriddenBy = (0, system_administration_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.moduleEntitlement.upsert({
            where: { tenantId_moduleCode: { tenantId: input.tenantId, moduleCode: input.moduleCode } },
            create: {
                tenantId: input.tenantId,
                moduleCode: input.moduleCode,
                isEnabled: input.isEnabled,
                overrideReason: input.overrideReason,
                overriddenBy,
            },
            update: { isEnabled: input.isEnabled, overrideReason: input.overrideReason, overriddenBy },
        }));
    }
};
exports.EntitlementService = EntitlementService;
exports.EntitlementService = EntitlementService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EntitlementService);
//# sourceMappingURL=entitlement.service.js.map