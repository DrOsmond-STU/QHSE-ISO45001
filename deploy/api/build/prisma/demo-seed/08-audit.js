"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAudit = seedAudit;
const audit_auditee_scope_service_1 = require("../../src/modules/domains/audit/audit-auditee-scope.service");
const audit_checklist_service_1 = require("../../src/modules/domains/audit/audit-checklist.service");
const audit_finding_closure_due_scan_service_1 = require("../../src/modules/domains/audit/audit-finding-closure-due-scan.service");
const audit_finding_service_1 = require("../../src/modules/domains/audit/audit-finding.service");
const audit_program_service_1 = require("../../src/modules/domains/audit/audit-program.service");
const audit_report_service_1 = require("../../src/modules/domains/audit/audit-report.service");
const audit_team_member_service_1 = require("../../src/modules/domains/audit/audit-team-member.service");
const audit_type_service_1 = require("../../src/modules/domains/audit/audit-type.service");
const auditor_competency_expiry_scan_service_1 = require("../../src/modules/domains/audit/auditor-competency-expiry-scan.service");
const auditor_competency_record_service_1 = require("../../src/modules/domains/audit/auditor-competency-record.service");
const audit_service_1 = require("../../src/modules/domains/audit/audit.service");
const tenant_context_1 = require("../../src/platform/tenancy/tenant-context");
const context_1 = require("./context");
const shared_1 = require("./shared");
async function seedAudit(app, adminPrisma, ctx) {
    const typeService = app.get(audit_type_service_1.AuditTypeService);
    const checklistService = app.get(audit_checklist_service_1.AuditChecklistService);
    const programService = app.get(audit_program_service_1.AuditProgramService);
    const auditService = app.get(audit_service_1.AuditService);
    const teamMemberService = app.get(audit_team_member_service_1.AuditTeamMemberService);
    const auditeeScopeService = app.get(audit_auditee_scope_service_1.AuditAuditeeScopeService);
    const findingService = app.get(audit_finding_service_1.AuditFindingService);
    const competencyService = app.get(auditor_competency_record_service_1.AuditorCompetencyRecordService);
    const reportService = app.get(audit_report_service_1.AuditReportService);
    const competencyExpiryScanService = app.get(auditor_competency_expiry_scan_service_1.AuditorCompetencyExpiryScanService);
    const findingClosureDueScanService = app.get(audit_finding_closure_due_scan_service_1.AuditFindingClosureDueScanService);
    const hseManager = (0, context_1.actor)(ctx, "HSE_MANAGER");
    const companyAdmin = (0, context_1.actor)(ctx, "COMPANY_ADMIN");
    const leadAuditor = (0, context_1.actor)(ctx, "AUDITOR_INTERNAL"); // Maria — departmentId NULL (selalu independen).
    const externalAuditor = (0, context_1.actor)(ctx, "AUDITOR_EXTERNAL"); // Robert — TANPA competency record (demo BR-01).
    // Rudi (index [1], Balikpapan) — departmentHse, SENGAJA beda dari
    // auditee scope audit1 (departmentIdOps) supaya BR-07 lolos; Dewi
    // (index [0], Cepu) TIDAK dipakai di sini krn departmentId-nya JUSTRU
    // departmentIdOps juga (aturan cepu short-circuit di 00-foundation.ts).
    const auditorBalikpapan = (0, context_1.actors)(ctx, "HSE_OFFICER")[1];
    const run = (userId, fn) => tenant_context_1.tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);
    const auditType1 = await run(hseManager.id, () => typeService.create({ code: "INTERNAL", name: "Audit Internal ISO 45001", requiresExternalBody: false }));
    const auditType2 = await run(hseManager.id, () => typeService.create({ code: "SURVEILLANCE", name: "Audit Surveilans Eksternal", requiresExternalBody: true }));
    const checklist1 = await run(hseManager.id, () => checklistService.create({
        name: "Checklist ISO 45001:2018 Klausul 6-10",
        standardCode: "ISO 45001:2018",
        items: [
            { clauseReference: "6.1.2", sequenceNo: 1, criteriaText: "Identifikasi bahaya & penilaian risiko terdokumentasi dan mutakhir" },
            { clauseReference: "8.1.1", sequenceNo: 2, criteriaText: "APD dipakai konsisten sesuai penilaian risiko area kerja" },
            { clauseReference: "9.1", sequenceNo: 3, criteriaText: "Pemantauan & pengukuran kinerja K3 terekam sesuai jadwal" },
            { clauseReference: "10.2", sequenceNo: 4, criteriaText: "Tindak lanjut ketidaksesuaian sebelumnya efektif & tertutup" },
        ],
    }));
    // 1. Program 2027 — 2-stage APPROVED (Review HSE Manager -> Approval
    // Company Admin), 2 plan item (Cepu bulan 3, Balikpapan bulan 6).
    const program1 = await run(hseManager.id, () => programService.create({
        companyId: ctx.companyId,
        programYear: 2027,
        name: "Program Audit Internal QHSE 2027",
        objective: "Verifikasi kepatuhan ISO 45001:2018 di seluruh site operasional",
        planItems: [
            { plannedMonth: 3, auditTypeId: auditType1.id, siteId: ctx.siteIdCepu, standardReference: "ISO 45001:2018" },
            { plannedMonth: 6, auditTypeId: auditType1.id, siteId: ctx.siteIdBalikpapan, standardReference: "ISO 45001:2018" },
        ],
    }));
    const program1Submitted = await run(hseManager.id, () => programService.submitForApproval(program1.id));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, program1Submitted.workflowInstanceId);
    const planItemCepu = await adminPrisma.auditProgramPlanItem.findFirstOrThrow({ where: { auditProgramId: program1.id, plannedMonth: 3 } });
    // 2. Audit 1 (dari plan item, Cepu) — siklus PENUH: tim+scope (BR-07)->
    // competency (BR-01 bersih)->start->opening meeting->2 temuan (MAJOR_NC
    // otomatis CAPA + OBSERVATION tanpa CAPA)->closing meeting->report 2-stage
    // (CONTEXT_USER Lead Auditor -> HSE Manager)->PENDING_CAPA_CLOSURE->
    // verify+close temuan->CLOSED.
    const audit1 = await run(hseManager.id, () => auditService.createFromPlanItem(planItemCepu.id, {
        siteId: ctx.siteIdCepu,
        auditTypeId: auditType1.id,
        auditChecklistId: checklist1.id,
        leadAuditorId: leadAuditor.id,
        plannedStartDate: (0, context_1.daysAgo)(20),
        plannedEndDate: (0, context_1.daysAgo)(18),
    }));
    await run(hseManager.id, () => auditeeScopeService.addScope(audit1.id, { departmentId: ctx.departmentIdOps }));
    await run(hseManager.id, () => teamMemberService.addMember(audit1.id, { userId: leadAuditor.id, roleInTeam: "LEAD_AUDITOR" }));
    // BR-07 — auditor kedua SENGAJA dipilih dari departemen BEDA (HSE, bukan
    // Operasi/auditee scope) supaya independensi lolos; auditor dari
    // departemen Operasi yang SAMA akan ditolak (tidak didemonstrasikan di
    // sini — pemanggilan yang gagal tidak meninggalkan baris apa pun utk
    // ditunjukkan, cukup dijelaskan di komentar ini).
    await run(hseManager.id, () => teamMemberService.addMember(audit1.id, { userId: auditorBalikpapan.id, roleInTeam: "AUDITOR" }));
    await run(hseManager.id, () => competencyService.create({
        userId: leadAuditor.id,
        competencyType: "LEAD_AUDITOR_CERT",
        standardScope: "ISO 45001:2018",
        certificationBody: "Lembaga Sertifikasi Nasional",
        certificateNumber: "CERT-2025-0042",
        issuedDate: (0, context_1.daysAgo)(400),
    }));
    await run(hseManager.id, () => auditService.start(audit1.id));
    await run(hseManager.id, () => auditService.recordOpeningMeeting(audit1.id, { datetime: (0, context_1.daysAgo)(20), notes: "Dihadiri Kepala Departemen Operasi & tim produksi" }));
    const finding1a = await run(leadAuditor.id, () => findingService.create({
        auditId: audit1.id,
        findingNumber: "F-01",
        classification: "MAJOR_NC",
        clauseReference: "8.1.1",
        description: "APD tidak dipakai konsisten di area produksi",
        evidenceDescription: "Observasi lapangan: 3 dari 5 pekerja tanpa helm saat kunjungan audit",
    }));
    await new Promise((r) => setTimeout(r, 350)); // AuditFindingCapaTriggerListener async.
    const finding1b = await run(leadAuditor.id, () => findingService.create({
        auditId: audit1.id,
        findingNumber: "F-02",
        classification: "OBSERVATION",
        clauseReference: "9.1",
        description: "Format dokumentasi inspeksi APAR belum konsisten antar site",
    }));
    await run(hseManager.id, () => auditService.recordClosingMeeting(audit1.id, { datetime: (0, context_1.daysAgo)(18), notes: "Temuan dipaparkan, auditee sepakat menindaklanjuti" }));
    const report1 = await run(leadAuditor.id, () => reportService.create(audit1.id));
    await run(leadAuditor.id, () => reportService.updateContent(report1.id, {
        executiveSummary: "Audit internal ISO 45001 area produksi Cepu, 1 Major NC dan 1 Observation ditemukan.",
        scopeDescription: "Proses produksi, penyimpanan, dan area kerja bertekanan tinggi site Cepu.",
        methodologyDescription: "Wawancara, observasi lapangan, dan tinjauan dokumen sesuai checklist ISO 45001:2018.",
        conclusion: "Sistem manajemen K3 berjalan namun kepatuhan APD perlu penguatan segera.",
    }));
    const report1Submitted = await run(leadAuditor.id, () => reportService.submitForApproval(report1.id));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, report1Submitted.workflowInstanceId);
    // finding1a (MAJOR_NC, wajib-CAPA) SENGAJA TIDAK ditutup manual di sini —
    // CapaEffectivenessVerificationWorkflowCompletionListener (Modul 10)
    // men-sinkron-balik verify()+close() OTOMATIS begitu CAPA-nya genuinely
    // EFFECTIVE_CLOSED (lihat 09-capa.ts) — menutupnya manual di sini
    // SEBELUM CAPA selesai akan tabrakan dgn listener itu nanti (transisi
    // CLOSED->VERIFIED ditolak, ditemukan empiris lewat log ERROR tertangkap
    // saat 09-capa.ts pertama kali dijalankan). audit1.close() JUGA dipindah
    // ke akhir 09-capa.ts krn BR-02/BR-03 gate-nya butuh finding1a SUDAH
    // CLOSED (rantai ketergantungan CAPA->finding->audit, bukan sebaliknya)
    // — audit1 dibiarkan PENDING_CAPA_CLOSURE di sini, status yang genuinely
    // valid utk "menunggu CAPA".
    await run(leadAuditor.id, () => findingService.close(finding1b.id));
    // 3. Audit 2 (ad-hoc, Balikpapan, surveilans eksternal) — Lead Auditor
    // TANPA competency record terdaftar -> BR-01 soft warning saat start().
    // Dibiarkan IN_PROGRESS (belum ada report) — audit "sedang berlangsung".
    const audit2 = await run(hseManager.id, () => auditService.createAdHoc({
        siteId: ctx.siteIdBalikpapan,
        auditTypeId: auditType2.id,
        auditChecklistId: checklist1.id,
        leadAuditorId: externalAuditor.id,
        plannedStartDate: (0, context_1.daysAgo)(5),
        plannedEndDate: (0, context_1.daysAgo)(3),
    }));
    await run(hseManager.id, () => teamMemberService.addMember(audit2.id, { userId: externalAuditor.id, roleInTeam: "LEAD_AUDITOR" }));
    await run(hseManager.id, () => auditService.start(audit2.id));
    const finding2 = await run(externalAuditor.id, () => findingService.create({
        auditId: audit2.id,
        findingNumber: "F-01",
        classification: "MINOR_NC",
        clauseReference: "7.2",
        description: "Rekaman pelatihan APD sebagian tidak terarsip rapi di site Balikpapan",
    }));
    await new Promise((r) => setTimeout(r, 350));
    // Backdate jendela tenggat supaya audit-finding-closure-due-scan (7 hari)
    // genuinely menemukan baris ini saat scan dipanggil di akhir.
    await adminPrisma.auditFinding.update({ where: { id: finding2.id }, data: { targetClosureDate: (0, context_1.daysFromNow)(3) } });
    // 4. Program REJECTED -> kembali DRAFT.
    const program2 = await run(hseManager.id, () => programService.create({ companyId: ctx.companyId, programYear: 2027, name: "Program Audit Tambahan (Draft Awal)", planItems: [] }));
    const program2Submitted = await run(hseManager.id, () => programService.submitForApproval(program2.id));
    await (0, shared_1.actOnNextPendingTask)(app, adminPrisma, ctx.tenantId, program2Submitted.workflowInstanceId, "REJECT", "Objective program belum jelas, mohon dilengkapi sebelum diajukan ulang");
    // 5. Program DRAFT 2028 — belum diajukan.
    await run(hseManager.id, () => programService.create({
        companyId: ctx.companyId,
        programYear: 2028,
        name: "Program Audit Internal QHSE 2028 (Perencanaan Awal)",
        planItems: [{ plannedMonth: 2, auditTypeId: auditType1.id, siteId: ctx.siteIdHq, standardReference: "ISO 45001:2018" }],
    }));
    // 6. Competency EXPIRED demo — dibuat ACTIVE (create() selalu ACTIVE),
    // expiryDate SUDAH lewat, scan job di akhir yang genuinely men-transisi.
    await run(hseManager.id, () => competencyService.create({
        userId: auditorBalikpapan.id,
        competencyType: "AUDITOR_CERT",
        standardScope: "ISO 45001:2018",
        issuedDate: (0, context_1.daysAgo)(1000),
        expiryDate: (0, context_1.daysAgo)(10),
    }));
    await competencyExpiryScanService.scan();
    await findingClosureDueScanService.scan();
    // eslint-disable-next-line no-console
    console.log("  Audit Management: 3 program (2027 APPROVED+2 plan item, REJECTED->DRAFT, DRAFT 2028), 2 audit (Cepu CLOSED penuh+2 temuan+CAPA otomatis+report 2-stage, Balikpapan IN_PROGRESS+BR-01 warning), competency EXPIRED via scan.");
}
