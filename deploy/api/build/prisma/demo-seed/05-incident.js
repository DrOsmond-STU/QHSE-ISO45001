"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedIncident = seedIncident;
const capa_register_service_1 = require("../../src/modules/domains/capa/capa-register.service");
const incident_corrective_action_link_service_1 = require("../../src/modules/domains/incident/incident-corrective-action-link.service");
const incident_investigation_service_1 = require("../../src/modules/domains/incident/incident-investigation.service");
const incident_regulatory_report_service_1 = require("../../src/modules/domains/incident/incident-regulatory-report.service");
const incident_report_service_1 = require("../../src/modules/domains/incident/incident-report.service");
const incident_witness_statement_service_1 = require("../../src/modules/domains/incident/incident-witness-statement.service");
const tenant_context_1 = require("../../src/platform/tenancy/tenant-context");
const context_1 = require("./context");
const shared_1 = require("./shared");
async function seedIncident(app, adminPrisma, ctx) {
    const reportService = app.get(incident_report_service_1.IncidentReportService);
    const investigationService = app.get(incident_investigation_service_1.IncidentInvestigationService);
    const correctiveActionLinkService = app.get(incident_corrective_action_link_service_1.IncidentCorrectiveActionLinkService);
    const witnessStatementService = app.get(incident_witness_statement_service_1.IncidentWitnessStatementService);
    const regulatoryReportService = app.get(incident_regulatory_report_service_1.IncidentRegulatoryReportService);
    const capaRegisterService = app.get(capa_register_service_1.CapaRegisterService);
    const hseManager = (0, context_1.actor)(ctx, "HSE_MANAGER");
    const [hseOfficer1, hseOfficer2] = (0, context_1.actors)(ctx, "HSE_OFFICER");
    const [worker1, worker2, worker3, worker4] = (0, context_1.actors)(ctx, "WORKER_EMPLOYEE");
    const run = (userId, fn) => tenant_context_1.tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);
    // 1. FATALITY — siklus PENUH: lapor->klasifikasi->investigasi->tim->2 root
    // cause->tautan CAPA->saksi->submit (2-stage, BR-03 wajib lapor regulator)
    // ->approve x2->submit regulator->acknowledge->CLOSED.
    const fatality = await run(worker1.id, () => reportService.create({
        siteId: ctx.siteIdCepu,
        initialClassification: "FATALITY",
        incidentDatetime: (0, context_1.daysAgo)(14),
        description: "Pekerja terjatuh dari platform produksi saat pemeliharaan crane",
        reportedBy: worker1.id,
    }));
    await run(hseOfficer1.id, () => reportService.classify(fatality.id, "FATALITY"));
    const fatalityInv = await run(hseOfficer1.id, () => investigationService.create({
        incidentReportId: fatality.id,
        method: "FIVE_WHY",
        leadInvestigatorId: hseOfficer1.id,
        startedAt: (0, context_1.daysAgo)(13),
        targetCompletionAt: (0, context_1.daysAgo)(9),
    }));
    await run(hseOfficer1.id, () => investigationService.assignTeam(fatalityInv.id, hseOfficer1.id, "LEAD"));
    await run(hseOfficer1.id, () => investigationService.assignTeam(fatalityInv.id, (0, context_1.actor)(ctx, "SUPERVISOR").id, "MEMBER"));
    await run(hseOfficer1.id, () => investigationService.recordRootCause(fatalityInv.id, {
        causeType: "IMMEDIATE_CAUSE",
        category: "PEOPLE",
        description: "Tidak memakai body harness saat bekerja di ketinggian",
        sequenceNo: 1,
    }));
    await run(hseOfficer1.id, () => investigationService.recordRootCause(fatalityInv.id, {
        causeType: "ROOT_CAUSE",
        category: "MANAGEMENT_SYSTEM",
        description: "Prosedur bekerja di ketinggian tidak ditegakkan konsisten di lapangan",
        methodReference: "5-Why langkah 3",
        sequenceNo: 3,
    }));
    const fatalityCapa = await run(hseOfficer1.id, () => capaRegisterService.create({
        sourceType: "INCIDENT",
        sourceId: fatality.id,
        category: "CORRECTIVE",
        priority: "CRITICAL",
        title: `Tindak lanjut insiden fatalitas ${fatality.incidentNumber}`,
        problemStatement: "Pekerja terjatuh dari platform produksi akibat tidak memakai body harness",
        siteId: ctx.siteIdCepu,
    }));
    await run(hseOfficer1.id, () => correctiveActionLinkService.link({ incidentReportId: fatality.id, incidentInvestigationId: fatalityInv.id, capaRegisterId: fatalityCapa.id }));
    await run(hseOfficer1.id, () => witnessStatementService.record({
        incidentReportId: fatality.id,
        witnessUserId: worker2.id,
        statementText: "Saya melihat korban terjatuh dari platform lantai 3 saat memeriksa kabel crane",
        statementDatetime: (0, context_1.daysAgo)(14),
    }));
    const fatalitySubmitted = await run(hseOfficer1.id, () => investigationService.submitForApproval(fatalityInv.id));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, fatalitySubmitted.workflowInstanceId);
    const fatalityRegReport = await adminPrisma.incidentRegulatoryReport.findFirstOrThrow({ where: { incidentReportId: fatality.id } });
    await run(hseManager.id, () => regulatoryReportService.submit(fatalityRegReport.id, "KEMNAKER-REF-2026-00147"));
    await run(hseManager.id, () => regulatoryReportService.acknowledge(fatalityRegReport.id));
    await run(hseManager.id, () => reportService.close(fatality.id));
    // 2. NEAR_MISS — 1-stage (TIDAK memicu BR-03) -> CLOSED.
    const nearMiss = await run(worker2.id, () => reportService.create({
        siteId: ctx.siteIdHq,
        initialClassification: "NEAR_MISS",
        incidentDatetime: (0, context_1.daysAgo)(6),
        description: "Nyaris tertimpa pipa yang diangkut forklift di area gudang",
        reportedBy: worker2.id,
    }));
    await run(hseOfficer2.id, () => reportService.classify(nearMiss.id, "NEAR_MISS"));
    const nearMissInv = await run(hseOfficer2.id, () => investigationService.create({
        incidentReportId: nearMiss.id,
        method: "FISHBONE",
        leadInvestigatorId: hseOfficer2.id,
        startedAt: (0, context_1.daysAgo)(6),
        targetCompletionAt: (0, context_1.daysAgo)(5),
    }));
    const nearMissSubmitted = await run(hseOfficer2.id, () => investigationService.submitForApproval(nearMissInv.id));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, nearMissSubmitted.workflowInstanceId);
    await run(hseManager.id, () => reportService.close(nearMiss.id));
    // 3. LOST_TIME_INJURY — investigasi DITOLAK stage 1 -> RETURNED, report
    // TETAP UNDER_INVESTIGATION (skenario "analisis butuh perbaikan").
    const lti = await run(worker3.id, () => reportService.create({
        siteId: ctx.siteIdCepu,
        initialClassification: "LOST_TIME_INJURY",
        incidentDatetime: (0, context_1.daysAgo)(4),
        description: "Tangan terjepit valve saat pembongkaran pipa flowline",
        reportedBy: worker3.id,
        daysLost: 5,
    }));
    await run(hseOfficer1.id, () => reportService.classify(lti.id, "LOST_TIME_INJURY"));
    const ltiInv = await run(hseOfficer1.id, () => investigationService.create({
        incidentReportId: lti.id,
        method: "FIVE_WHY",
        leadInvestigatorId: hseOfficer1.id,
        startedAt: (0, context_1.daysAgo)(4),
        targetCompletionAt: (0, context_1.daysAgo)(1),
    }));
    const ltiSubmitted = await run(hseOfficer1.id, () => investigationService.submitForApproval(ltiInv.id));
    await (0, shared_1.actOnNextPendingTask)(app, adminPrisma, ctx.tenantId, ltiSubmitted.workflowInstanceId, "REJECT", "Analisis akar masalah kurang mendalam, mohon dilengkapi 5-Why sampai root cause");
    // 4. PROCESS_SAFETY_EVENT — 2-stage APPROVED tapi regulatory report BELUM
    // disubmit -> PENDING_REGULATORY_REPORT (item tindak lanjut terbuka,
    // BR-09 blocking gate SENGAJA belum dilewati).
    const pse = await run(worker4.id, () => reportService.create({
        siteId: ctx.siteIdBalikpapan,
        initialClassification: "PROCESS_SAFETY_EVENT",
        incidentDatetime: (0, context_1.daysAgo)(2),
        description: "Kebocoran gas kecil pada sambungan pipa flowline area produksi",
        reportedBy: worker4.id,
    }));
    await run(hseOfficer2.id, () => reportService.classify(pse.id, "PROCESS_SAFETY_EVENT"));
    const pseInv = await run(hseOfficer2.id, () => investigationService.create({
        incidentReportId: pse.id,
        method: "BOWTIE",
        leadInvestigatorId: hseOfficer2.id,
        startedAt: (0, context_1.daysAgo)(2),
        targetCompletionAt: (0, context_1.daysAgo)(0.5),
    }));
    const pseSubmitted = await run(hseOfficer2.id, () => investigationService.submitForApproval(pseInv.id));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, pseSubmitted.workflowInstanceId);
    // 5. FIRST_AID — baru REPORTED, belum diklasifikasi ulang HSE Officer.
    await run(worker1.id, () => reportService.create({
        siteId: ctx.siteIdHq,
        initialClassification: "FIRST_AID",
        incidentDatetime: (0, context_1.daysAgo)(0.2),
        description: "Tergores material tajam saat housekeeping area kantor",
        reportedBy: worker1.id,
    }));
    // 6. MEDICAL_TREATMENT — sudah diklasifikasi (UNDER_VERIFICATION), HSE
    // belum memutuskan perlu investigasi formal atau tidak (opsional/sampling).
    const medical = await run(worker2.id, () => reportService.create({
        siteId: ctx.siteIdBalikpapan,
        initialClassification: "MEDICAL_TREATMENT",
        incidentDatetime: (0, context_1.daysAgo)(1),
        description: "Iritasi mata terkena percikan bahan kimia pembersih",
        reportedBy: worker2.id,
    }));
    await run(hseOfficer1.id, () => reportService.classify(medical.id, "MEDICAL_TREATMENT"));
    // eslint-disable-next-line no-console
    console.log("  Incident Management: 6 laporan (FATALITY+CAPA+saksi+regulator CLOSED, NEAR_MISS CLOSED 1-stage, LTI investigasi RETURNED, PSE PENDING_REGULATORY_REPORT, FIRST_AID REPORTED, MEDICAL_TREATMENT UNDER_VERIFICATION).");
}
