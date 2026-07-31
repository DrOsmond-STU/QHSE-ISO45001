// Fondasi data demo — SATU tenant "PT Petro Nusantara Sejahtera" (industri
// OIL_GAS, supaya BR Migas-spesifik Work Permit 3.4/Contractor 6.3 genuinely
// teruji di demo), 1 company + 3 branch/site (HQ Jakarta + 2 site lapangan),
// ~24 user lintas 18 role tenant-assignable, subscription plan Enterprise
// (SEMUA module_code aktif), tenant branding config.
//
// provisionTenant() (task 1.5) dipakai utk tenant+subscription+entitlement+
// Tenant Admin PERTAMA — jalur bisnis SUNGGUHAN (bukan raw Prisma), supaya
// module_entitlements/tenant_subscriptions genuinely benar sesuai kontrak
// EntitlementGuard. Org hierarchy (company/branch/site/department) DAN
// ke-23 user berikutnya + role assignment pakai raw adminPrisma langsung —
// pola PERSIS test/organization/test-helpers.ts seedOrganizationTree()
// ("BYPASS OrganizationService/BR validation... cuma butuh SATU pohon
// organisasi valid") krn entity ini murni data referensi tanpa workflow.
import { INestApplicationContext } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { ProvisioningService } from "../../src/modules/domains/system-administration/provisioning/provisioning.service";
import { SubscriptionPlanService } from "../../src/modules/domains/system-administration/provisioning/subscription-plan.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { DemoContext, DemoUser } from "./context";

const DEMO_PASSWORD = "Demo!QHSE2026";

interface RoleSeed {
  roleCode: string;
  fullName: string;
  email: string;
  jobTitle: string;
  siteId?: "hq" | "cepu" | "balikpapan";
}

async function main(app: INestApplicationContext, adminPrisma: PrismaClient): Promise<DemoContext> {
  const provisioningService = app.get(ProvisioningService);
  const subscriptionPlanService = app.get(SubscriptionPlanService);

  // provisionTenant() TIDAK butuh tenant context ambient (cross-tenant by
  // design, lihat banner comment provisioning.integration-spec.ts) — cuma
  // butuh SATU actor user_id apa pun yang sudah ada di DB. seed-auth-dev.ts
  // (task 0.7) DITEMUKAN RUSAK — ditulis SEBELUM users.tenant_id jadi FK
  // sungguhan ke tenants (task 1.1), tidak pernah membuat baris `tenants`
  // sama sekali, jadi user.create()-nya SELALU gagal P2003 di skema
  // sekarang (script rot dev-only, di luar cakupan diperbaiki di sini) —
  // bikin bootstrap actor throwaway sendiri, pola PERSIS seedTenant()+
  // seedSysadminFixture() test/auth/test-helpers.ts yang SUDAH benar.
  const bootstrapTenantId = randomUUID();
  await adminPrisma.tenant.create({
    data: { id: bootstrapTenantId, tenantCode: `BOOT-${randomUUID().slice(0, 20)}`, legalName: "Bootstrap Actor Tenant", displayName: "Bootstrap" },
  });
  const bootstrapPasswordHash = await argon2.hash(randomUUID(), { type: argon2.argon2id });
  const bootstrapActor = await adminPrisma.user.create({
    data: {
      tenantId: bootstrapTenantId,
      email: `demo-seed-bootstrap-${randomUUID()}@qhse.local`,
      fullName: "Demo Seed Bootstrap Actor",
      status: "ACTIVE",
      passwordHash: bootstrapPasswordHash,
    },
  });
  const bootstrapSysadmin = { tenantId: bootstrapTenantId, id: bootstrapActor.id };

  const plans = await subscriptionPlanService.listActive();
  const enterprisePlan = plans.find((p) => p.planName === "Enterprise");
  if (!enterprisePlan) throw new Error("demo-seed: subscription plan 'Enterprise' tidak ditemukan — jalankan seed:subscription-plans dulu.");

  // Suffix acak WAJIB — tenant_code unique global, script ini dijalankan
  // BERULANG selama iterasi/debug (users.tenant_id onDelete:Restrict —
  // TIDAK ADA cara murah "hapus tenant demo lama dulu" tanpa cascade manual
  // lintas ~180 tabel, jadi TIDAK dicoba; tenant demo lama dibiarkan
  // menumpuk di DB dev, pola sama fixture test lain sepanjang sesi ini).
  const tenantCode = `PETRONS-${randomUUID().slice(0, 6).toUpperCase()}`;
  const tenantAdminEmail = `budi.santoso+${randomUUID().slice(0, 6)}@petro-ns.demo`;

  const provisionResult = await tenantContextStorage.run(
    { tenantId: bootstrapSysadmin.tenantId, userId: bootstrapSysadmin.id },
    () =>
      provisioningService.provisionTenant({
        tenantCode,
        legalName: "PT Petro Nusantara Sejahtera",
        displayName: "Petro Nusantara Sejahtera",
        subscriptionPlanId: enterprisePlan.id,
        tenantAdminEmail,
        tenantAdminFullName: "Budi Santoso",
      }),
  );

  const tenantId = provisionResult.tenant.id;

  // Industri OIL_GAS (seed-industry-templates.ts, task 1.2) — supaya BR-04
  // Work Permit 3.4/BR-04 Contractor 6.3 (gate IUJP+CSMS_CERTIFICATE) benar²
  // aktif di data demo ini, bukan cuma tersedia tapi tidak pernah kepakai.
  const oilGasTemplate = await adminPrisma.industryTemplate.findFirstOrThrow({ where: { code: "OIL_GAS" } });

  // Tenant Admin dari provisionTenant() masih status INVITED tanpa password
  // (alur undangan sungguhan di luar cakupan provisioning, lihat banner
  // comment provisioning.integration-spec.ts) — utk demo, aktifkan LANGSUNG
  // dgn password dikenal supaya bisa login seketika, pola sama simulasi
  // "user klik link undangan" di test E2E-4.
  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });
  await adminPrisma.user.update({
    where: { id: provisionResult.tenantAdminUser.id },
    data: { passwordHash, status: "ACTIVE", activatedAt: new Date() },
  });

  const company = await adminPrisma.company.create({
    data: {
      tenantId,
      companyCode: "PETRONS-HO",
      legalName: "PT Petro Nusantara Sejahtera",
      displayName: "Petro Nusantara Sejahtera",
      businessRegistrationNo: "AHU-0012345.AH.01.01.2010",
      taxId: "01.234.567.8-901.000",
      industryTemplateId: oilGasTemplate.id,
      effectiveDate: new Date("2010-03-15"),
      createdBy: provisionResult.tenantAdminUser.id,
      updatedBy: provisionResult.tenantAdminUser.id,
    },
  });

  const branchHq = await adminPrisma.branch.create({
    data: {
      tenantId,
      companyId: company.id,
      branchCode: "HO-JKT",
      name: "Kantor Pusat Jakarta",
      branchType: "HEAD_OFFICE",
      createdBy: provisionResult.tenantAdminUser.id,
      updatedBy: provisionResult.tenantAdminUser.id,
    },
  });
  const branchCepu = await adminPrisma.branch.create({
    data: {
      tenantId,
      companyId: company.id,
      branchCode: "BR-CEPU",
      name: "Cabang Operasi Cepu",
      branchType: "REGIONAL_OFFICE",
      createdBy: provisionResult.tenantAdminUser.id,
      updatedBy: provisionResult.tenantAdminUser.id,
    },
  });
  const branchBalikpapan = await adminPrisma.branch.create({
    data: {
      tenantId,
      companyId: company.id,
      branchCode: "BR-BPN",
      name: "Cabang Operasi Balikpapan",
      branchType: "REGIONAL_OFFICE",
      createdBy: provisionResult.tenantAdminUser.id,
      updatedBy: provisionResult.tenantAdminUser.id,
    },
  });

  const siteHq = await adminPrisma.site.create({
    data: {
      tenantId,
      companyId: company.id,
      branchId: branchHq.id,
      siteCode: "SITE-JKT",
      name: "Kantor Pusat Jakarta",
      siteType: "PERMANENT",
      category: "OFFICE",
      startDate: new Date("2010-03-15"),
      timezone: "Asia/Jakarta",
      createdBy: provisionResult.tenantAdminUser.id,
      updatedBy: provisionResult.tenantAdminUser.id,
    },
  });
  const siteCepu = await adminPrisma.site.create({
    data: {
      tenantId,
      companyId: company.id,
      branchId: branchCepu.id,
      siteCode: "SITE-CEPU",
      name: "Lapangan Produksi Cepu",
      siteType: "PERMANENT",
      category: "PLANT_FACTORY",
      startDate: new Date("2012-06-01"),
      geoLat: -7.1500,
      geoLong: 111.5833,
      timezone: "Asia/Jakarta",
      createdBy: provisionResult.tenantAdminUser.id,
      updatedBy: provisionResult.tenantAdminUser.id,
    },
  });
  const siteBalikpapan = await adminPrisma.site.create({
    data: {
      tenantId,
      companyId: company.id,
      branchId: branchBalikpapan.id,
      siteCode: "SITE-BPN",
      name: "Terminal & Kilang Balikpapan",
      siteType: "PERMANENT",
      category: "PLANT_FACTORY",
      startDate: new Date("2014-01-10"),
      geoLat: -1.2379,
      geoLong: 116.8529,
      timezone: "Asia/Makassar",
      createdBy: provisionResult.tenantAdminUser.id,
      updatedBy: provisionResult.tenantAdminUser.id,
    },
  });

  const departmentHse = await adminPrisma.department.create({
    data: {
      tenantId,
      companyId: company.id,
      branchId: branchHq.id,
      siteId: siteHq.id,
      departmentCode: "DEPT-HSE",
      name: "HSE & Quality",
      departmentType: "SUPPORT",
      createdBy: provisionResult.tenantAdminUser.id,
      updatedBy: provisionResult.tenantAdminUser.id,
    },
  });
  const departmentOps = await adminPrisma.department.create({
    data: {
      tenantId,
      companyId: company.id,
      branchId: branchCepu.id,
      siteId: siteCepu.id,
      departmentCode: "DEPT-OPS",
      name: "Operasi Produksi",
      departmentType: "OPERATIONAL",
      createdBy: provisionResult.tenantAdminUser.id,
      updatedBy: provisionResult.tenantAdminUser.id,
    },
  });

  const siteIdOf = (s?: "hq" | "cepu" | "balikpapan") =>
    s === "cepu" ? siteCepu.id : s === "balikpapan" ? siteBalikpapan.id : siteHq.id;

  // 18 role tenant-assignable (SUPER_ADMIN_PLATFORM dikecualikan, cross-
  // tenant) — beberapa role dapat >1 orang utk keragaman/coverage lintas
  // site yang realistis (HSE_OFFICER/SUPERVISOR/WORKER_EMPLOYEE).
  const roleSeeds: RoleSeed[] = [
    { roleCode: "COMPANY_ADMIN", fullName: "Siti Rahayu", email: "siti.rahayu@petro-ns.demo", jobTitle: "Company Administrator", siteId: "hq" },
    { roleCode: "HSE_MANAGER", fullName: "Andi Wijaya", email: "andi.wijaya@petro-ns.demo", jobTitle: "HSE Manager", siteId: "hq" },
    { roleCode: "HSE_OFFICER", fullName: "Dewi Lestari", email: "dewi.lestari@petro-ns.demo", jobTitle: "HSE Officer — Site Cepu", siteId: "cepu" },
    { roleCode: "HSE_OFFICER", fullName: "Rudi Hartono", email: "rudi.hartono@petro-ns.demo", jobTitle: "HSE Officer — Site Balikpapan", siteId: "balikpapan" },
    { roleCode: "DEPARTMENT_HEAD", fullName: "Agus Setiawan", email: "agus.setiawan@petro-ns.demo", jobTitle: "Kepala Departemen Operasi", siteId: "cepu" },
    { roleCode: "SUPERVISOR", fullName: "Hendra Kusuma", email: "hendra.kusuma@petro-ns.demo", jobTitle: "Supervisor Produksi — Cepu", siteId: "cepu" },
    { roleCode: "SUPERVISOR", fullName: "Yusuf Pratama", email: "yusuf.pratama@petro-ns.demo", jobTitle: "Supervisor Terminal — Balikpapan", siteId: "balikpapan" },
    { roleCode: "AUDITOR_INTERNAL", fullName: "Maria Simanjuntak", email: "maria.simanjuntak@petro-ns.demo", jobTitle: "Internal Auditor", siteId: "hq" },
    { roleCode: "AUDITOR_EXTERNAL", fullName: "Robert Tanjung", email: "robert.tanjung@auditor-eksternal.demo", jobTitle: "Auditor Eksternal — Lembaga Sertifikasi", siteId: "hq" },
    { roleCode: "WORKER_EMPLOYEE", fullName: "Joko Susilo", email: "joko.susilo@petro-ns.demo", jobTitle: "Operator Produksi", siteId: "cepu" },
    { roleCode: "WORKER_EMPLOYEE", fullName: "Bambang Suryadi", email: "bambang.suryadi@petro-ns.demo", jobTitle: "Teknisi Mekanik", siteId: "cepu" },
    { roleCode: "WORKER_EMPLOYEE", fullName: "Fitri Handayani", email: "fitri.handayani@petro-ns.demo", jobTitle: "Operator Terminal", siteId: "balikpapan" },
    { roleCode: "WORKER_EMPLOYEE", fullName: "Eko Prasetyo", email: "eko.prasetyo@petro-ns.demo", jobTitle: "Teknisi Instrumentasi", siteId: "balikpapan" },
    { roleCode: "CONTRACTOR_USER", fullName: "Ahmad Fauzi", email: "ahmad.fauzi@kontraktor-mitra.demo", jobTitle: "PIC Kontraktor — CV Mitra Jasa Teknik", siteId: "cepu" },
    { roleCode: "VISITOR_SELF_SERVICE", fullName: "Tamu Kunjungan", email: "visitor@petro-ns.demo", jobTitle: "Pengunjung", siteId: "hq" },
    { roleCode: "OCCUPATIONAL_HEALTH_STAFF", fullName: "dr. Ratna Sari", email: "ratna.sari@petro-ns.demo", jobTitle: "Dokter Perusahaan / Occupational Health", siteId: "hq" },
    { roleCode: "DOCUMENT_CONTROLLER", fullName: "Nina Puspita", email: "nina.puspita@petro-ns.demo", jobTitle: "Document Controller", siteId: "hq" },
    { roleCode: "COMPLIANCE_OFFICER", fullName: "Iwan Setiabudi", email: "iwan.setiabudi@petro-ns.demo", jobTitle: "Compliance Officer", siteId: "hq" },
    { roleCode: "QUALITY_MANAGER", fullName: "Lina Marlina", email: "lina.marlina@petro-ns.demo", jobTitle: "Quality Manager", siteId: "hq" },
    { roleCode: "QC_INSPECTOR", fullName: "Dedi Kurniawan", email: "dedi.kurniawan@petro-ns.demo", jobTitle: "QC Inspector", siteId: "cepu" },
    { roleCode: "ENVIRONMENTAL_OFFICER", fullName: "Wahyu Nugroho", email: "wahyu.nugroho@petro-ns.demo", jobTitle: "Environmental Officer", siteId: "cepu" },
    { roleCode: "TPS_LB3_OFFICER", fullName: "Yanto Gunawan", email: "yanto.gunawan@petro-ns.demo", jobTitle: "TPS LB3 Officer", siteId: "balikpapan" },
  ];

  const roles = await adminPrisma.role.findMany({ where: { tenantId: null } });
  const roleIdByCode = new Map(roles.map((r) => [r.roleCode, r.id]));

  const users: DemoUser[] = [
    { id: provisionResult.tenantAdminUser.id, email: tenantAdminEmail, fullName: "Budi Santoso", roleCode: "TENANT_ADMIN" },
  ];

  for (const seed of roleSeeds) {
    const roleId = roleIdByCode.get(seed.roleCode);
    if (!roleId) throw new Error(`demo-seed: role ${seed.roleCode} tidak ditemukan di baseline RBAC.`);

    const seedPasswordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });
    const user = await adminPrisma.user.create({
      data: {
        tenantId,
        email: seed.email,
        fullName: seed.fullName,
        jobTitle: seed.jobTitle,
        siteId: siteIdOf(seed.siteId),
        departmentId: seed.siteId === "cepu" ? departmentOps.id : seed.roleCode.includes("HSE") || seed.roleCode === "COMPLIANCE_OFFICER" || seed.roleCode === "ENVIRONMENTAL_OFFICER" ? departmentHse.id : undefined,
        status: "ACTIVE",
        activatedAt: new Date(),
        passwordHash: seedPasswordHash,
        userType: seed.roleCode === "CONTRACTOR_USER" ? "CONTRACTOR" : seed.roleCode === "VISITOR_SELF_SERVICE" ? "VISITOR" : "INTERNAL_EMPLOYEE",
      },
    });

    await adminPrisma.userRole.create({
      data: {
        tenantId,
        userId: user.id,
        roleId,
        scopeType: "TENANT",
        scopeId: null,
        createdBy: provisionResult.tenantAdminUser.id,
      },
    });

    users.push({ id: user.id, email: seed.email, fullName: seed.fullName, roleCode: seed.roleCode });
  }

  // Branding — kosmetik murni, tapi murah dan bikin tenant "terlihat nyata"
  // saat demo (task 1.6 TenantBrandingConfig).
  await adminPrisma.tenantBrandingConfig.create({
    data: {
      tenantId,
      displayName: "Petro Nusantara Sejahtera — QHSE Portal",
      primaryColor: "#0B5D8C",
      createdBy: provisionResult.tenantAdminUser.id,
      updatedBy: provisionResult.tenantAdminUser.id,
    },
  });

  return {
    tenantId,
    companyId: company.id,
    branchIdHq: branchHq.id,
    branchIdCepu: branchCepu.id,
    branchIdBalikpapan: branchBalikpapan.id,
    siteIdHq: siteHq.id,
    siteIdCepu: siteCepu.id,
    siteIdBalikpapan: siteBalikpapan.id,
    departmentIdHse: departmentHse.id,
    departmentIdOps: departmentOps.id,
    users,
  };
}

export { main as seedFoundation, DEMO_PASSWORD };
