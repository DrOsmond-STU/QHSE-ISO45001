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
exports.SubscriptionPlanService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
// Task 1.5 (Modul 31 §5) — katalog GLOBAL platform ("platform-level, bukan
// per tenant" PRD literal), TIDAK ADA tenant_id sama sekali — pola PERSIS
// IndustryTemplateService (1.2). Read-only di sini (listActive/getActiveOrThrow);
// authoring katalog lewat prisma/seed-subscription-plans.ts (TDD §6.3),
// pola sama industry_templates.
let SubscriptionPlanService = class SubscriptionPlanService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listActive() {
        return this.prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { planName: "asc" } });
    }
    /** Dipakai ProvisioningService.provisionTenant() sebelum membuat
     * tenant_subscriptions — plan harus ADA dan AKTIF, pola sama
     * IndustryTemplateService.getActiveOrThrow() (1.2). */
    async getActiveOrThrow(subscriptionPlanId) {
        const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: subscriptionPlanId } });
        if (!plan || !plan.isActive) {
            throw new common_1.NotFoundException(`subscription_plan_id "${subscriptionPlanId}" tidak ditemukan atau tidak aktif.`);
        }
        return plan;
    }
};
exports.SubscriptionPlanService = SubscriptionPlanService;
exports.SubscriptionPlanService = SubscriptionPlanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionPlanService);
//# sourceMappingURL=subscription-plan.service.js.map