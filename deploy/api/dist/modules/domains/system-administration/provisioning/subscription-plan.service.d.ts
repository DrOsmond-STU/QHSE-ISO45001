import { SubscriptionPlan } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
export declare class SubscriptionPlanService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listActive(): Promise<SubscriptionPlan[]>;
    /** Dipakai ProvisioningService.provisionTenant() sebelum membuat
     * tenant_subscriptions — plan harus ADA dan AKTIF, pola sama
     * IndustryTemplateService.getActiveOrThrow() (1.2). */
    getActiveOrThrow(subscriptionPlanId: string): Promise<SubscriptionPlan>;
}
