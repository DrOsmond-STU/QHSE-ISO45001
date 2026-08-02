"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRiskManagement = seedRiskManagement;
const hazard_register_service_1 = require("../../src/modules/domains/risk-management/matrix/hazard-register.service");
const risk_matrix_bootstrap_service_1 = require("../../src/modules/domains/risk-management/matrix/risk-matrix-bootstrap.service");
const hira_assessment_service_1 = require("../../src/modules/domains/risk-management/hira-jsa-hiradc/hira-assessment.service");
const hiradc_record_service_1 = require("../../src/modules/domains/risk-management/hira-jsa-hiradc/hiradc-record.service");
const jsa_record_service_1 = require("../../src/modules/domains/risk-management/hira-jsa-hiradc/jsa-record.service");
const risk_register_service_1 = require("../../src/modules/domains/risk-management/hira-jsa-hiradc/risk-register.service");
const risk_treatment_plan_service_1 = require("../../src/modules/domains/risk-management/hira-jsa-hiradc/risk-treatment-plan.service");
const tenant_context_1 = require("../../src/platform/tenancy/tenant-context");
const context_1 = require("./context");
const shared_1 = require("./shared");
async function seedRiskManagement(app, adminPrisma, ctx) {
    const matrixBootstrap = app.get(risk_matrix_bootstrap_service_1.RiskMatrixBootstrapService);
    const hazardService = app.get(hazard_register_service_1.HazardRegisterService);
    const hiraService = app.get(hira_assessment_service_1.HiraAssessmentService);
    const jsaService = app.get(jsa_record_service_1.JsaRecordService);
    const hiradcService = app.get(hiradc_record_service_1.HiradcRecordService);
    const riskRegisterService = app.get(risk_register_service_1.RiskRegisterService);
    const treatmentService = app.get(risk_treatment_plan_service_1.RiskTreatmentPlanService);
    const hseOfficer = (0, context_1.actor)(ctx, "HSE_OFFICER");
    const supervisor = (0, context_1.actor)(ctx, "SUPERVISOR");
    const hseManager = (0, context_1.actor)(ctx, "HSE_MANAGER");
    const companyAdmin = (0, context_1.actor)(ctx, "COMPANY_ADMIN");
    const worker = (0, context_1.actor)(ctx, "WORKER_EMPLOYEE");
    const run = (userId, fn) => tenant_context_1.tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);
    const matrix = await run(hseOfficer.id, () => matrixBootstrap.ensureDefaultMatrix("ALL"));
    await run(hseOfficer.id, () => hazardService.create({ siteId: ctx.siteIdCepu, hazardCategory: "MECHANICAL", hazardDescription: "Bagian mesin berputar tanpa pelindung (pompa produksi)" }));
    await run(hseOfficer.id, () => hazardService.create({ siteId: ctx.siteIdCepu, hazardCategory: "CHEMICAL", hazardDescription: "Paparan H2S pada area wellhead" }));
    await run(hseOfficer.id, () => hazardService.create({ siteId: ctx.siteIdBalikpapan, hazardCategory: "ELECTRICAL", hazardDescription: "Panel listrik tegangan menengah tanpa arc-flash label" }));
    await run(hseOfficer.id, () => hazardService.create({ siteId: ctx.siteIdBalikpapan, hazardCategory: "PHYSICAL", hazardDescription: "Kebisingan area kompresor > 85 dBA" }));
    // HIRA 1 — ROUTINE, risiko rendah, 2-stage terminal (TANPA hazard EXTREME).
    const hiraRoutine = await run(hseOfficer.id, () => hiraService.create({
        siteId: ctx.siteIdCepu,
        activityDescription: "Inspeksi rutin harian area produksi",
        assessmentType: "ROUTINE",
        riskMatrixConfigId: matrix.id,
        assessmentDate: new Date(),
    }));
    await run(hseOfficer.id, () => hiraService.addHazardLine(hiraRoutine.id, {
        hazardDescriptionFreetext: "Lantai licin area walkway",
        likelihoodBefore: 2,
        severityBefore: 2,
        additionalControlsRequired: "Rambu peringatan + anti-slip mat",
        likelihoodAfter: 1,
        severityAfter: 1,
    }));
    const hiraRoutineSubmitted = await run(hseOfficer.id, () => hiraService.submitForApproval(hiraRoutine.id));
    // approveAllPendingStages() (BUKAN hitung manual N kali) — 2 demo
    // SUPERVISOR bikin stage ROLE_IN_SCOPE jadi parallel group >1 task,
    // ditemukan empiris menulis JSA di bawah (lihat banner comment shared.ts).
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, hiraRoutineSubmitted.workflowInstanceId);
    // HIRA 2 — NON_ROUTINE confined space, hazard EXTREME (5x5=25) -> 3-stage
    // penuh sampai Company Admin ("Company HSE Head").
    const hiraExtreme = await run(hseOfficer.id, () => hiraService.create({
        siteId: ctx.siteIdCepu,
        activityDescription: "Masuk ruang terbatas (confined space) tangki penyimpanan",
        assessmentType: "NON_ROUTINE",
        riskMatrixConfigId: matrix.id,
        assessmentDate: new Date(),
    }));
    await run(hseOfficer.id, () => hiraService.addHazardLine(hiraExtreme.id, {
        hazardDescriptionFreetext: "Ruang terbatas — kekurangan oksigen & gas beracun",
        likelihoodBefore: 5,
        severityBefore: 5,
        additionalControlsRequired: "Gas test berkala + standby rescue team + izin kerja ruang terbatas",
        likelihoodAfter: 1,
        severityAfter: 2,
    }));
    const hiraExtremeSubmitted = await run(hseOfficer.id, () => hiraService.submitForApproval(hiraExtreme.id));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, hiraExtremeSubmitted.workflowInstanceId);
    // JSA 1 — full cycle sampai diakui pekerja.
    const jsaDone = await run(supervisor.id, () => jsaService.create({ siteId: ctx.siteIdCepu, jobTitle: "Ganti oli & filter pompa produksi", preparedBy: supervisor.id, assessmentDate: new Date() }));
    const jsaStep1 = await run(supervisor.id, () => jsaService.addJobStep(jsaDone.id, 1, "Matikan mesin & lakukan lockout-tagout"));
    await run(supervisor.id, () => jsaService.addStepHazard(jsaStep1.id, { hazardDescriptionFreetext: "Energi tersimpan pada sistem hidrolik", controlMeasures: "LOTO (lockout-tagout) penuh sebelum bekerja" }));
    const jsaStep2 = await run(supervisor.id, () => jsaService.addJobStep(jsaDone.id, 2, "Buka penutup pompa & keluarkan oli bekas"));
    await run(supervisor.id, () => jsaService.addStepHazard(jsaStep2.id, { hazardDescriptionFreetext: "Tumpahan oli bekas", controlMeasures: "Gunakan drip pan + APD sarung tangan tahan kimia" }));
    const jsaSubmitted = await run(supervisor.id, () => jsaService.submitForApproval(jsaDone.id));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, jsaSubmitted.workflowInstanceId);
    await run(worker.id, () => jsaService.acknowledge(jsaDone.id, worker.id, new Date()));
    // JSA 2 — masih pending approval (belum ditandatangani/diakui).
    const jsaPending = await run(supervisor.id, () => jsaService.create({ siteId: ctx.siteIdBalikpapan, jobTitle: "Pembersihan tangki timbun BBM", preparedBy: supervisor.id, assessmentDate: new Date() }));
    await run(supervisor.id, () => jsaService.addJobStep(jsaPending.id, 1, "Isolasi & purging tangki sebelum masuk"));
    await run(supervisor.id, () => jsaService.submitForApproval(jsaPending.id));
    // HIRADC 1 — risiko rendah, verify(false) -> langsung APPROVED tanpa
    // co-sign HSE Manager.
    const hiradcLow = await run(supervisor.id, () => hiradcService.create({ siteId: ctx.siteIdBalikpapan, taskDescription: "Pemeriksaan visual harian tangki timbun", performedBy: supervisor.id, assessmentDatetime: new Date(), validUntil: (0, context_1.daysFromNow)(1) }));
    await run(supervisor.id, () => hiradcService.addLine(hiradcLow.id, { hazardDescriptionFreetext: "Terpeleset di area tangga tangki", likelihood: 1, severity: 1, controlMeasures: "Rambu peringatan + housekeeping" }));
    await run(supervisor.id, () => hiradcService.verify(hiradcLow.id, false));
    // HIRADC 2 — kerja panas (risiko lebih tinggi), verify(true) -> WAJIB
    // co-sign HSE Manager via workflow.
    const hiradcHot = await run(supervisor.id, () => hiradcService.create({ siteId: ctx.siteIdCepu, taskDescription: "Pengelasan pipa flowline darurat", performedBy: supervisor.id, assessmentDatetime: new Date(), validUntil: (0, context_1.daysFromNow)(1) }));
    await run(supervisor.id, () => hiradcService.addLine(hiradcHot.id, { hazardDescriptionFreetext: "Percikan api memicu kebakaran area proses", likelihood: 2, severity: 3, controlMeasures: "Fire watch + APAR + gas test sebelum pengelasan" }));
    const hiradcHotVerified = await run(supervisor.id, () => hiradcService.verify(hiradcHot.id, true));
    if (hiradcHotVerified.workflowInstanceId) {
        await (0, shared_1.actOnNextPendingTask)(app, adminPrisma, ctx.tenantId, hiradcHotVerified.workflowInstanceId, "APPROVE");
    }
    // Corporate Risk Register — 3 baris, siklus status berbeda.
    const riskSupplier = await run(hseManager.id, () => riskRegisterService.create({
        companyId: ctx.companyId,
        riskCategory: "OPERATIONAL",
        riskTitle: "Ketergantungan pemasok tunggal spare-part kritis",
        riskDescription: "Satu pemasok tunggal utk spare-part pompa produksi utama — lead time impor 3 bulan.",
        riskOwnerUserId: hseManager.id,
        riskMatrixConfigId: matrix.id,
        likelihoodInherent: 4,
        severityInherent: 4,
        likelihoodResidual: 4,
        severityResidual: 4,
        identifiedDate: new Date(),
    }));
    const riskSupplierUpdated = await run(hseManager.id, () => riskRegisterService.updateResidual(riskSupplier.id, { likelihoodResidual: 2, severityResidual: 2, currentControls: "Kontrak jangka panjang + kualifikasi pemasok cadangan lokal" }));
    await run(hseManager.id, () => treatmentService.create({
        sourceType: "RISK_REGISTER",
        sourceId: riskSupplier.id,
        treatmentStrategy: "REDUCE_MITIGATE",
        treatmentDescription: "Kualifikasi 2 pemasok cadangan lokal utk spare-part kritis, target Q3 2026.",
        responsibleUserId: hseManager.id,
        targetDate: (0, context_1.daysFromNow)(90),
    }));
    await run(hseManager.id, () => riskRegisterService.advanceStatus(riskSupplier.id, "ASSESSED"));
    await run(hseManager.id, () => riskRegisterService.advanceStatus(riskSupplier.id, "TREATMENT_IN_PROGRESS"));
    const riskReputasi = await run(hseManager.id, () => riskRegisterService.create({
        companyId: ctx.companyId,
        riskCategory: "REPUTATIONAL",
        riskTitle: "Risiko tumpahan minyak mencemari area pesisir Balikpapan",
        riskDescription: "Insiden tumpahan skala besar dapat berdampak reputasi & sanksi regulasi.",
        riskOwnerUserId: companyAdmin.id,
        riskMatrixConfigId: matrix.id,
        likelihoodInherent: 2,
        severityInherent: 5,
        likelihoodResidual: 1,
        severityResidual: 3,
        identifiedDate: new Date(),
        currentControls: "Boom tumpahan siaga + prosedur tanggap darurat pesisir",
    }));
    await run(hseManager.id, () => riskRegisterService.advanceStatus(riskReputasi.id, "ASSESSED"));
    await run(hseManager.id, () => riskRegisterService.advanceStatus(riskReputasi.id, "TREATMENT_IN_PROGRESS"));
    await run(hseManager.id, () => riskRegisterService.advanceStatus(riskReputasi.id, "MONITORED"));
    // Risiko baru, baru IDENTIFIED (belum dinilai lebih lanjut).
    await run(hseManager.id, () => riskRegisterService.create({
        companyId: ctx.companyId,
        riskCategory: "FINANCIAL",
        riskTitle: "Fluktuasi harga minyak dunia thd margin operasional",
        riskDescription: "Penurunan tajam harga minyak dapat menekan anggaran maintenance & HSE.",
        riskOwnerUserId: companyAdmin.id,
        riskMatrixConfigId: matrix.id,
        likelihoodInherent: 3,
        severityInherent: 3,
        likelihoodResidual: 3,
        severityResidual: 3,
        identifiedDate: new Date(),
    }));
    void riskSupplierUpdated;
    // eslint-disable-next-line no-console
    console.log("  Risk Management: matriks 5x5, 4 hazard, 2 HIRA (routine+EXTREME 3-stage), 2 JSA, 2 HIRADC, 3 corporate risk + 1 rencana penanganan.");
}
