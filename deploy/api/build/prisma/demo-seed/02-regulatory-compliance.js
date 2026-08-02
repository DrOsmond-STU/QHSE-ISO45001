"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRegulatoryCompliance = seedRegulatoryCompliance;
const node_crypto_1 = require("node:crypto");
const compliance_evaluation_service_1 = require("../../src/modules/domains/regulatory-compliance/compliance-evaluation.service");
const compliance_obligation_service_1 = require("../../src/modules/domains/regulatory-compliance/compliance-obligation.service");
const license_permit_service_1 = require("../../src/modules/domains/regulatory-compliance/license-permit.service");
const regulatory_register_service_1 = require("../../src/modules/domains/regulatory-compliance/regulatory-register.service");
const tenant_context_1 = require("../../src/platform/tenancy/tenant-context");
const context_1 = require("./context");
const shared_1 = require("./shared");
async function seedRegulatoryCompliance(app, adminPrisma, ctx) {
    const registerService = app.get(regulatory_register_service_1.RegulatoryRegisterService);
    const obligationService = app.get(compliance_obligation_service_1.ComplianceObligationService);
    const evaluationService = app.get(compliance_evaluation_service_1.ComplianceEvaluationService);
    const licenseService = app.get(license_permit_service_1.LicensePermitService);
    const officer = (0, context_1.actor)(ctx, "COMPLIANCE_OFFICER");
    const hseManager = (0, context_1.actor)(ctx, "HSE_MANAGER");
    const run = (userId, fn) => tenant_context_1.tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);
    const registerK3 = await run(officer.id, () => registerService.create({
        regulationType: "GOVERNMENT_REGULATION_PP",
        regulationNumber: "PP No. 50 Tahun 2012",
        title: "Penerapan Sistem Manajemen K3",
        applicableScope: "ALL_TENANT",
    }));
    const registerLimbah = await run(officer.id, () => registerService.create({
        regulationType: "MINISTERIAL_REGULATION_PERMEN",
        regulationNumber: "Permen LHK No. 6 Tahun 2021",
        title: "Tata Cara & Persyaratan Pengelolaan Limbah B3",
        applicableScope: "SPECIFIC_SITE",
        applicableSiteId: ctx.siteIdBalikpapan,
    }));
    await run(officer.id, () => registerService.create({
        regulationType: "LAW_UU",
        regulationNumber: "UU No. 1 Tahun 1970",
        title: "Keselamatan Kerja",
        applicableScope: "ALL_TENANT",
    }));
    const obligationP2K3 = await run(officer.id, () => obligationService.create({
        regulatoryRegisterId: registerK3.id,
        obligationDescription: "Laporan triwulanan P2K3 ke Disnaker setempat",
        obligationType: "REPORTING",
        frequency: "QUARTERLY",
    }));
    await run(officer.id, () => obligationService.create({
        regulatoryRegisterId: registerLimbah.id,
        obligationDescription: "Manifest elektronik limbah B3 (Festronik) bulanan",
        obligationType: "REPORTING",
        frequency: "MONTHLY",
    }));
    // 1. Evaluasi COMPLIANT — siklus penuh sampai CLOSED.
    const evalCompliant = await run(officer.id, () => evaluationService.create({
        regulatoryRegisterId: registerK3.id,
        obligationId: obligationP2K3.id,
        evaluationPeriodStart: new Date("2026-01-01"),
        evaluationPeriodEnd: new Date("2026-03-31"),
        evaluatorUserId: officer.id,
        evaluationDate: new Date(),
        evaluationMethod: "DOCUMENT_REVIEW",
        complianceStatus: "COMPLIANT",
        findingsSummary: "Seluruh dokumen laporan P2K3 Q1 2026 lengkap dan tepat waktu.",
    }));
    const submittedCompliant = await run(officer.id, () => evaluationService.submitForApproval(evalCompliant.id));
    await (0, shared_1.actOnNextPendingTask)(app, adminPrisma, ctx.tenantId, submittedCompliant.workflowInstanceId, "APPROVE");
    await run(officer.id, () => evaluationService.close(evalCompliant.id));
    // 2. Evaluasi NON_COMPLIANT — wajib linked_capa_id (BR-03) sebelum CLOSED.
    const evalNonCompliant = await run(officer.id, () => evaluationService.create({
        regulatoryRegisterId: registerLimbah.id,
        evaluationPeriodStart: new Date("2026-01-01"),
        evaluationPeriodEnd: new Date("2026-03-31"),
        evaluatorUserId: officer.id,
        evaluationDate: new Date(),
        evaluationMethod: "SITE_VERIFICATION",
        complianceStatus: "NON_COMPLIANT",
        findingsSummary: "Manifest Festronik bulan Februari 2026 terlambat diinput 5 hari kerja.",
    }));
    const submittedNonCompliant = await run(officer.id, () => evaluationService.submitForApproval(evalNonCompliant.id));
    await (0, shared_1.actOnNextPendingTask)(app, adminPrisma, ctx.tenantId, submittedNonCompliant.workflowInstanceId, "APPROVE");
    // linkedCapaId murni penanda "CAPA sudah dibuat" di layer ini (BR-03) —
    // TIDAK FK-tervalidasi terhadap capa_register (pola sama test integrasi
    // 2.2 sendiri yang pakai randomUUID() polos), gap TDD §26 lintas-modul.
    await run(officer.id, () => evaluationService.update(evalNonCompliant.id, { linkedCapaId: (0, node_crypto_1.randomUUID)() }));
    await run(officer.id, () => evaluationService.close(evalNonCompliant.id));
    // 3. Evaluasi masih DRAFT — belum diajukan (skenario "sedang disiapkan").
    await run(officer.id, () => evaluationService.create({
        regulatoryRegisterId: registerK3.id,
        evaluationPeriodStart: new Date("2026-04-01"),
        evaluationPeriodEnd: new Date("2026-06-30"),
        evaluatorUserId: officer.id,
        evaluationDate: new Date(),
        evaluationMethod: "DOCUMENT_REVIEW",
        complianceStatus: "COMPLIANT",
    }));
    // Lisensi.
    await run(officer.id, () => licenseService.create({
        licenseNumber: "SIO-FORKLIFT-2024-0088",
        licenseName: "SIO Operator Forklift — Hendra Kusuma",
        licenseType: "SIO_OPERATOR_CERT",
        holderType: "INDIVIDUAL",
        holderReferenceId: (0, context_1.actor)(ctx, "SUPERVISOR").id,
        issueDate: new Date("2024-02-01"),
        expiryDate: (0, context_1.daysFromNow)(365),
    }));
    const envPermitOld = await run(officer.id, () => licenseService.create({
        licenseNumber: "IZLING-BPN-2021-0451",
        licenseName: "Izin Lingkungan Terminal Balikpapan",
        licenseType: "ENVIRONMENTAL_PERMIT",
        holderType: "SITE",
        holderReferenceId: ctx.siteIdBalikpapan,
        issueDate: new Date("2021-05-10"),
        expiryDate: (0, context_1.daysFromNow)(20),
    }));
    await run(officer.id, () => licenseService.markInRenewalProcess(envPermitOld.id));
    await run(officer.id, () => licenseService.createRenewal(envPermitOld.id, { licenseNumber: "IZLING-BPN-2026-0088", issueDate: new Date() }));
    await run(officer.id, () => licenseService.create({
        licenseNumber: "TPS-LB3-CEPU-2025-0012",
        licenseName: "Izin TPS Limbah B3 — Site Cepu",
        licenseType: "HAZWASTE_PERMIT_TPS_LB3",
        holderType: "SITE",
        holderReferenceId: ctx.siteIdCepu,
        issueDate: new Date("2025-01-15"),
        expiryDate: (0, context_1.daysFromNow)(400),
    }));
    // eslint-disable-next-line no-console
    console.log("  Regulatory Compliance: 3 register, 2 obligation, 3 evaluasi (compliant/non-compliant+CAPA/draft), 4 lisensi (incl. 1 rantai renewal).");
}
