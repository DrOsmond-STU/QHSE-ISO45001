import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { BillingPeriod, PrismaClient, Tenant, TenantSubscription, User } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../../platform/tenancy/tenant-context";
import { IndustryTemplateService } from "../../organization/industry-template/industry-template.service";
import { UserService } from "../../user-role/user.service";
import { EntitlementService } from "./entitlement.service";
import { SubscriptionPlanService } from "./subscription-plan.service";
import { requireActorUserId, withCleanUniqueViolation } from "./system-administration-context";

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

// Task 1.5 (Modul 31 §4.1 poin 1-3 — poin 4 "wizard setup awal Tenant Admin
// login pertama" BUKAN cakupan service ini, itu langkah SETELAH
// provisioning, dipicu Tenant Admin sendiri). MODUL DOMAIN KETIGA yang
// mengimpor modul domain LAIN (OrganizationModule utk IndustryTemplateService,
// UserRoleModule utk UserService) — orkestrasi lintas-modul yang genuinely
// butuh kedua-duanya, BEDA dari platform/* yang TIDAK BOLEH impor domain
// sama sekali (arah modular monolith tetap satu arah: domain->platform
// atau domain->domain-lain sbg orkestrator, TIDAK PERNAH platform->domain).
@Injectable()
export class ProvisioningService implements OnModuleDestroy {
  private readonly adminPrisma: PrismaClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionPlanService: SubscriptionPlanService,
    private readonly entitlementService: EntitlementService,
    private readonly industryTemplateService: IndustryTemplateService,
    private readonly userService: UserService,
  ) {
    // Task 1.5 — TERBUKTI EMPIRIS wajib (bukan pola default sejak awal):
    // kebijakan RLS "tenants" (task 1.1, PK sekaligus tenant_id) menolak
    // MUTLAK setiap INSERT lewat qhse_app tanpa app.current_tenant_id yang
    // SUDAH cocok dgn baris itu — tapi baris itu SENDIRI belum ada
    // (tenant_id baru di-generate SAAT insert), jadi TIDAK ADA nilai
    // context valid yang mungkin bisa dipakai (dibuktikan psql: error
    // Postgres 42501 "new row violates row-level security policy for
    // table tenants"). PrismaService.withGlobalContext() (1.2) TIDAK
    // cukup di sini — beda dari industry_templates, tenants MEMANG punya
    // RLS (pola self-referencing PK-sebagai-tenant_id, 1.1). Koneksi admin
    // terpisah PERSIS pola reminder-scan/delegation-scan/audit-log-
    // partition-maintenance — bukan solusi baru, cuma konteks baru.
    this.adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.adminPrisma.$disconnect();
  }

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
  async provisionTenant(input: ProvisionTenantInput): Promise<ProvisionTenantResult> {
    const provisionedBy = requireActorUserId();

    if (input.industryTemplateId) {
      await this.industryTemplateService.getActiveOrThrow(input.industryTemplateId);
    }
    const plan = await this.subscriptionPlanService.getActiveOrThrow(input.subscriptionPlanId);

    const tenant = await withCleanUniqueViolation(
      () =>
        this.adminPrisma.tenant.create({
          data: {
            tenantCode: input.tenantCode,
            legalName: input.legalName,
            displayName: input.displayName,
            industryTemplateId: input.industryTemplateId,
            status: "PROVISIONING",
            createdBy: provisionedBy,
            updatedBy: provisionedBy,
          },
        }),
      `tenant_code "${input.tenantCode}" sudah dipakai.`,
    );

    return tenantContextStorage.run({ tenantId: tenant.id, userId: provisionedBy }, async () => {
      const tenantSubscription = await this.prisma.withRls((tx) =>
        tx.tenantSubscription.create({
          data: {
            tenantId: tenant.id,
            subscriptionPlanId: plan.id,
            billingPeriod: input.billingPeriod ?? "MONTHLY",
            createdBy: provisionedBy,
            updatedBy: provisionedBy,
          },
        }),
      );

      await this.entitlementService.activateFromPlan(tenant.id, plan);

      const tenantAdminRole = await this.prisma.withRls((tx) =>
        tx.role.findFirstOrThrow({ where: { tenantId: null, roleCode: "TENANT_ADMIN" } }),
      );

      const tenantAdminUser = await this.userService.inviteUser({
        email: input.tenantAdminEmail,
        fullName: input.tenantAdminFullName,
      });

      await this.userService.assignRole({
        userId: tenantAdminUser.id,
        roleId: tenantAdminRole.id,
        scopeType: "TENANT",
      });

      // PRD Modul 01 §4.1 langkah 6 literal: "status tenants.status berubah
      // ke ACTIVE, activated_at terisi." Verifikasi empiris (bukan asumsi):
      // qhse_app BISA meng-UPDATE baris tenants ini via withRls() sekarang
      // — beda dari INSERT di atas — karena app.current_tenant_id (di-set
      // tenantContextStorage.run() pembuka closure ini) SEKARANG cocok
      // dgn tenant_id baris yang sudah benar-benar ada.
      const activatedTenant = await this.prisma.withRls((tx) =>
        tx.tenant.update({
          where: { id: tenant.id },
          data: { status: "ACTIVE", activatedAt: new Date(), updatedBy: provisionedBy },
        }),
      );

      // Notifikasi undangan Tenant Admin (PRD Modul 31 §8 "Tenant baru
      // berhasil diprovisioning") SENGAJA belum di-wire — pola konsisten
      // SETIAP task 1.1-1.4: template notifikasi baru butuh baris
      // notification_templates yang belum ada seed-nya di codebase manapun
      // (gap TDD §26).
      return { tenant: activatedTenant, tenantSubscription, tenantAdminUser };
    });
  }
}
