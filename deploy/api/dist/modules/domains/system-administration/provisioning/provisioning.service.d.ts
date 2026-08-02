import { OnModuleDestroy } from "@nestjs/common";
import { BillingPeriod, Tenant, TenantSubscription, User } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { IndustryTemplateService } from "../../organization/industry-template/industry-template.service";
import { UserService } from "../../user-role/user.service";
import { EntitlementService } from "./entitlement.service";
import { SubscriptionPlanService } from "./subscription-plan.service";
export interface ProvisionTenantInput {
    tenantCode: string;
    legalName: string;
    displayName: string;
    industryTemplateId?: string;
    subscriptionPlanId: string;
    billingPeriod?: BillingPeriod;
    tenantAdminEmail: string;
    tenantAdminFullName: string;
}
export interface ProvisionTenantResult {
    tenant: Tenant;
    tenantSubscription: TenantSubscription;
    tenantAdminUser: User;
}
export declare class ProvisioningService implements OnModuleDestroy {
    private readonly prisma;
    private readonly subscriptionPlanService;
    private readonly entitlementService;
    private readonly industryTemplateService;
    private readonly userService;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, subscriptionPlanService: SubscriptionPlanService, entitlementService: EntitlementService, industryTemplateService: IndustryTemplateService, userService: UserService);
    onModuleDestroy(): Promise<void>;
    /**
     * E2E-4 (TESTING.md §7): "Provisioning tenant baru -> aktivasi modul via
     * plan -> buat Tenant Admin pertama -> login pertama." 3 langkah PERTAMA
     * diorkestrasi method ini; langkah KEEMPAT (login pertama) SENGAJA BUKAN
     * tanggung jawabnya — dibuktikan test lewat panggilan NYATA ke
     * POST /auth/login (0.6, TIDAK disentuh sama sekali) memakai kredensial
     * user yang baru dibuat, membuktikan integrasi genuinely end-to-end
     * tanpa menduplikasi logic auth di sini.
     *
     * TIDAK atomik lintas SELURUH langkah (gap TDD §26) — INSERT tenant
     * (koneksi admin, lihat catatan constructor) ada di TRANSAKSI TERPISAH
     * dari langkah berikutnya (tiap withRls() buka transaksinya sendiri) —
     * kegagalan di tengah flow bisa menyisakan tenant PROVISIONING tanpa
     * admin/subscription lengkap. Tidak ada mekanisme retry/cleanup
     * otomatis; operasional manual Super Admin Platform utk sekarang
     * (skala kejadian: provisioning tenant BUKAN operasi frekuensi tinggi).
     */
    provisionTenant(input: ProvisionTenantInput): Promise<ProvisionTenantResult>;
}
