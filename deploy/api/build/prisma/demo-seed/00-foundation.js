"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEMO_PASSWORD = void 0;
exports.seedFoundation = main;
const argon2 = __importStar(require("argon2"));
const node_crypto_1 = require("node:crypto");
const provisioning_service_1 = require("../../src/modules/domains/system-administration/provisioning/provisioning.service");
const subscription_plan_service_1 = require("../../src/modules/domains/system-administration/provisioning/subscription-plan.service");
const tenant_context_1 = require("../../src/platform/tenancy/tenant-context");
const DEMO_PASSWORD = "Demo!QHSE2026";
exports.DEMO_PASSWORD = DEMO_PASSWORD;
async function main(app, adminPrisma) {
    const provisioningService = app.get(provisioning_service_1.ProvisioningService);
    const subscriptionPlanService = app.get(subscription_plan_service_1.SubscriptionPlanService);
    // provisionTenant() TIDAK butuh tenant context ambient (cross-tenant by
    // design, lihat banner comment provisioning.integration-spec.ts) — cuma
    // butuh SATU actor user_id apa pun yang sudah ada di DB. seed-auth-dev.ts
    // (task 0.7) DITEMUKAN RUSAK — ditulis SEBELUM users.tenant_id jadi FK
    // sungguhan ke tenants (task 1.1), tidak pernah membuat baris `tenants`
    // sama sekali, jadi user.create()-nya SELALU gagal P2003 di skema
    // sekarang (script rot dev-only, di luar cakupan diperbaiki di sini) —
    // bikin bootstrap actor throwaway sendiri, pola PERSIS seedTenant()+
    // seedSysadminFixture() test/auth/test-helpers.ts yang SUDAH benar.
    const bootstrapTenantId = (0, node_crypto_1.randomUUID)();
    await adminPrisma.tenant.create({
        data: { id: bootstrapTenantId, tenantCode: `BOOT-${(0, node_crypto_1.randomUUID)().slice(0, 20)}`, legalName: "Bootstrap Actor Tenant", displayName: "Bootstrap" },
    });
    const bootstrapPasswordHash = await argon2.hash((0, node_crypto_1.randomUUID)(), { type: argon2.argon2id });
    const bootstrapActor = await adminPrisma.user.create({
        data: {
            tenantId: bootstrapTenantId,
            email: `demo-seed-bootstrap-${(0, node_crypto_1.randomUUID)()}@qhse.local`,
            fullName: "Demo Seed Bootstrap Actor",
            status: "ACTIVE",
            passwordHash: bootstrapPasswordHash,
        },
    });
    const bootstrapSysadmin = { tenantId: bootstrapTenantId, id: bootstrapActor.id };
    const plans = await subscriptionPlanService.listActive();
    const enterprisePlan = plans.find((p) => p.planName === "Enterprise");
    if (!enterprisePlan)
        throw new Error("demo-seed: subscription plan 'Enterprise' tidak ditemukan — jalankan seed:subscription-plans dulu.");
    // Suffix acak WAJIB — tenant_code unique global, script ini dijalankan
    // BERULANG selama iterasi/debug (users.tenant_id onDelete:Restrict —
    // TIDAK ADA cara murah "hapus tenant demo lama dulu" tanpa cascade manual
    // lintas ~180 tabel, jadi TIDAK dicoba; tenant demo lama dibiarkan
    // menumpuk di DB dev, pola sama fixture test lain sepanjang sesi ini).
    const tenantCode = `PETRONS-${(0, node_crypto_1.randomUUID)().slice(0, 6).toUpperCase()}`;
    const tenantAdminEmail = `budi.santoso+${(0, node_crypto_1.randomUUID)().slice(0, 6)}@petro-ns.demo`;
    const provisionResult = await tenant_context_1.tenantContextStorage.run({ tenantId: bootstrapSysadmin.tenantId, userId: bootstrapSysadmin.id }, () => provisioningService.provisionTenant({
        tenantCode,
        legalName: "PT Petro Nusantara Sejahtera",
        displayName: "Petro Nusantara Sejahtera",
        subscriptionPlanId: enterprisePlan.id,
        tenantAdminEmail,
        tenantAdminFullName: "Budi Santoso",
    }));
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
    const siteIdOf = (s) => s === "cepu" ? siteCepu.id : s === "balikpapan" ? siteBalikpapan.id : siteHq.id;
    // 18 role tenant-assignable (SUPER_ADMIN_PLATFORM dikecualikan, cross-
    // tenant) — beberapa role dapat >1 orang utk keragaman/coverage lintas
    // site yang realistis (HSE_OFFICER/SUPERVISOR/WORKER_EMPLOYEE).
    const roleSeeds = [
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
    const users = [
        { id: provisionResult.tenantAdminUser.id, email: tenantAdminEmail, fullName: "Budi Santoso", roleCode: "TENANT_ADMIN" },
    ];
    for (const seed of roleSeeds) {
        const roleId = roleIdByCode.get(seed.roleCode);
        if (!roleId)
            throw new Error(`demo-seed: role ${seed.roleCode} tidak ditemukan di baseline RBAC.`);
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
