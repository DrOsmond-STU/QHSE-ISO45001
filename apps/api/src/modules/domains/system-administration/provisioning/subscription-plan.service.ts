import { Injectable, NotFoundException } from "@nestjs/common";
import { SubscriptionPlan } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";

// Task 1.5 (Modul 31 §5) — katalog GLOBAL platform ("platform-level, bukan
// per tenant" PRD literal), TIDAK ADA tenant_id sama sekali — pola PERSIS
// IndustryTemplateService (1.2). Read-only di sini (listActive/getActiveOrThrow);
// authoring katalog lewat prisma/seed-subscription-plans.ts (TDD §6.3),
// pola sama industry_templates.
@Injectable()
export class SubscriptionPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(): Promise<SubscriptionPlan[]> {
    return this.prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { planName: "asc" } });
  }

  /** Dipakai ProvisioningService.provisionTenant() sebelum membuat
   * tenant_subscriptions — plan harus ADA dan AKTIF, pola sama
   * IndustryTemplateService.getActiveOrThrow() (1.2). */
  async getActiveOrThrow(subscriptionPlanId: string): Promise<SubscriptionPlan> {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: subscriptionPlanId } });
    if (!plan || !plan.isActive) {
      throw new NotFoundException(`subscription_plan_id "${subscriptionPlanId}" tidak ditemukan atau tidak aktif.`);
    }
    return plan;
  }
}
