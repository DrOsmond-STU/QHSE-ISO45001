"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedCapa = seedCapa;
const node_crypto_1 = require("node:crypto");
const audit_service_1 = require("../../src/modules/domains/audit/audit.service");
const capa_action_plan_service_1 = require("../../src/modules/domains/capa/capa-action-plan.service");
const capa_effectiveness_verification_due_scan_service_1 = require("../../src/modules/domains/capa/capa-effectiveness-verification-due-scan.service");
const capa_effectiveness_verification_service_1 = require("../../src/modules/domains/capa/capa-effectiveness-verification.service");
const capa_register_service_1 = require("../../src/modules/domains/capa/capa-register.service");
const capa_root_cause_analysis_service_1 = require("../../src/modules/domains/capa/capa-root-cause-analysis.service");
const capa_root_cause_sla_scan_service_1 = require("../../src/modules/domains/capa/capa-root-cause-sla-scan.service");
const tenant_context_1 = require("../../src/platform/tenancy/tenant-context");
const context_1 = require("./context");
const shared_1 = require("./shared");
async function driveActionPlanToInProgress(app, adminPrisma, ctx, capaRegisterId, actorUserId, picUserId, actionDescription, rootCauseSummary, dueDate) {
    const rootCauseService = app.get(capa_root_cause_analysis_service_1.CapaRootCauseAnalysisService);
    const actionPlanService = app.get(capa_action_plan_service_1.CapaActionPlanService);
    const run = (fn) => tenant_context_1.tenantContextStorage.run({ tenantId: ctx.tenantId, userId: actorUserId }, fn);
    await run(() => rootCauseService.record({ capaRegisterId, method: "FIVE_WHY", methodDetail: { whys: [rootCauseSummary] }, rootCauseSummary }));
    const actionPlan = await run(() => actionPlanService.define({ capaRegisterId, actionDescription, justification: rootCauseSummary, actionType: "CORRECTIVE", picUserId, dueDate }));
    await run(() => actionPlanService.setActionTrackingId(actionPlan.id, (0, node_crypto_1.randomUUID)()));
    const submitted = await run(() => actionPlanService.submitForApproval(capaRegisterId));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, submitted.workflowInstanceId);
    await run(() => actionPlanService.updateStatusCache(actionPlan.id, "COMPLETED", new Date()));
}
async function driveEffectivenessToOutcome(app, adminPrisma, ctx, capaRegisterId, actorUserId, verifierUserId, result, evidenceDescription) {
    const effectivenessService = app.get(capa_effectiveness_verification_service_1.CapaEffectivenessVerificationService);
    const run = (fn) => tenant_context_1.tenantContextStorage.run({ tenantId: ctx.tenantId, userId: actorUserId }, fn);
    const verification = await run(() => effectivenessService.create({
        capaRegisterId,
        verificationMethod: "FIELD_OBSERVATION",
        observationPeriodDays: 30,
        verificationDueDate: (0, context_1.daysFromNow)(30),
        verifiedBy: verifierUserId,
    }));
    await run(() => effectivenessService.recordResult(verification.id, { result, evidenceDescription }));
    await run(() => effectivenessService.submitForApproval(verification.id));
    const capaAfterSubmit = await adminPrisma.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId } });
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, capaAfterSubmit.workflowInstanceId);
}
async function seedCapa(app, adminPrisma, ctx) {
    const capaRegisterService = app.get(capa_register_service_1.CapaRegisterService);
    const rootCauseSlaScanService = app.get(capa_root_cause_sla_scan_service_1.CapaRootCauseSlaScanService);
    const effectivenessDueScanService = app.get(capa_effectiveness_verification_due_scan_service_1.CapaEffectivenessVerificationDueScanService);
    const hseManager = (0, context_1.actor)(ctx, "HSE_MANAGER");
    const supervisor = (0, context_1.actor)(ctx, "SUPERVISOR");
    const [hseOfficerCepu] = (0, context_1.actors)(ctx, "HSE_OFFICER");
    const leadAuditor = (0, context_1.actor)(ctx, "AUDITOR_INTERNAL");
    const [worker1, worker2] = (0, context_1.actors)(ctx, "WORKER_EMPLOYEE");
    const departmentHead = (0, context_1.actor)(ctx, "DEPARTMENT_HEAD");
    const run = (userId, fn) => tenant_context_1.tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);
    // 1. CAPA dari insiden FATALITY (05-incident.ts) -> siklus penuh -> EFFECTIVE_CLOSED.
    const incidentCapa = await adminPrisma.capaRegister.findFirstOrThrow({ where: { tenantId: ctx.tenantId, sourceType: "INCIDENT" } });
    await driveActionPlanToInProgress(app, adminPrisma, ctx, incidentCapa.id, hseManager.id, supervisor.id, "Refresh training bekerja di ketinggian + wajib body harness terpasang sebelum mulai kerja", "Prosedur bekerja di ketinggian tidak ditegakkan konsisten di lapangan", (0, context_1.daysFromNow)(14));
    await driveEffectivenessToOutcome(app, adminPrisma, ctx, incidentCapa.id, hseManager.id, hseOfficerCepu.id, "EFFECTIVE", "Observasi lapangan 30 hari: kepatuhan body harness 100% di area produksi");
    // 2. CAPA dari audit_finding MAJOR_NC (08-audit.ts, auto-linked via
    // AuditFindingCapaTriggerListener) -> siklus penuh -> EFFECTIVE_CLOSED.
    // finding1a/audit1 SENGAJA dibiarkan CAPA_LINKED/PENDING_CAPA_CLOSURE di
    // 08-audit.ts — CapaEffectivenessVerificationWorkflowCompletionListener
    // men-sinkron-balik finding.verify()+close() OTOMATIS begitu CAPA ini
    // EFFECTIVE_CLOSED (lihat banner comment atas file ini), audit1.close()
    // baru genuinely valid dipanggil SETELAHNYA.
    const finding1a = await adminPrisma.auditFinding.findFirstOrThrow({
        where: { tenantId: ctx.tenantId, findingNumber: "F-01", classification: "MAJOR_NC" },
    });
    const auditCapa = await adminPrisma.capaRegister.findUniqueOrThrow({ where: { id: finding1a.capaRegisterId } });
    await driveActionPlanToInProgress(app, adminPrisma, ctx, auditCapa.id, hseManager.id, worker1.id, "Sosialisasi ulang wajib APD & sanksi bertahap bagi pelanggaran berulang", "Kepatuhan APD di area produksi rendah, tidak ada konsekuensi tegas", (0, context_1.daysFromNow)(14));
    await driveEffectivenessToOutcome(app, adminPrisma, ctx, auditCapa.id, hseManager.id, leadAuditor.id, "EFFECTIVE", "Audit tindak lanjut: kepatuhan APD meningkat signifikan, tidak ada pelanggaran berulang");
    // Jeda TAMBAHAN (di atas 350ms internal approveAllPendingStages) —
    // CapaEffectivenessVerificationWorkflowCompletionListener melakukan
    // LEBIH banyak langkah async berantai (markEffectivenessVerificationApproved
    // + syncClosureToSourceModule verify()+close() + notifyEffectiveClosed)
    // drpd listener 1-langkah biasa, pola sama sleep(500) (bukan 300ms
    // standar) dipakai integration-spec.ts modul ini utk kasus serupa.
    await new Promise((r) => setTimeout(r, 500));
    await tenant_context_1.tenantContextStorage.run({ tenantId: ctx.tenantId, userId: hseManager.id }, () => app.get(audit_service_1.AuditService).close(finding1a.auditId));
    // 3. CAPA manual (MANAGEMENT_REVIEW) — siklus pertama NOT_EFFECTIVE->
    // NOT_EFFECTIVE_REOPENED (BR-04), siklus kedua (root cause BARU) ->
    // EFFECTIVE_CLOSED.
    const capaReopen = await run(hseManager.id, () => capaRegisterService.create({
        sourceType: "MANAGEMENT_REVIEW",
        category: "PREVENTIVE",
        priority: "MEDIUM",
        title: "Tindak lanjut Management Review Q2 2027 — housekeeping gudang berulang",
        problemStatement: "Rapat tinjauan manajemen mengidentifikasi housekeeping gudang jadi temuan berulang 3 bulan terakhir",
        siteId: ctx.siteIdHq,
    }));
    await driveActionPlanToInProgress(app, adminPrisma, ctx, capaReopen.id, hseManager.id, worker2.id, "Jadwalkan piket housekeeping mingguan", "Tidak ada penanggung jawab tetap utk housekeeping gudang", (0, context_1.daysFromNow)(14));
    await driveEffectivenessToOutcome(app, adminPrisma, ctx, capaReopen.id, hseManager.id, departmentHead.id, "NOT_EFFECTIVE", "Observasi 30 hari: housekeeping masih belum konsisten, jadwal piket sering terlewat");
    await driveActionPlanToInProgress(app, adminPrisma, ctx, capaReopen.id, hseManager.id, worker2.id, "Pasang checklist harian + eskalasi otomatis ke supervisor jika piket terlewat", "Root cause revisi: piket berjalan tanpa mekanisme kontrol/eskalasi", (0, context_1.daysFromNow)(14));
    await driveEffectivenessToOutcome(app, adminPrisma, ctx, capaReopen.id, hseManager.id, departmentHead.id, "EFFECTIVE", "Observasi 30 hari siklus kedua: housekeeping konsisten dgn checklist harian");
    // 4. CAPA manual (OTHER) — dibiarkan DRAFT, initiated_at dibackdate spy
    // root-cause-sla-scan (>=7 hari) genuinely menemukannya.
    const capaOverdue = await run(hseManager.id, () => capaRegisterService.create({
        sourceType: "OTHER",
        category: "CORRECTIVE",
        priority: "HIGH",
        title: "Tindak lanjut komplain pelanggan keterlambatan pengiriman",
        problemStatement: "Komplain berulang dari pelanggan terkait keterlambatan pengiriman produk 2 bulan terakhir",
        siteId: ctx.siteIdBalikpapan,
    }));
    await adminPrisma.capaRegister.update({ where: { id: capaOverdue.id }, data: { initiatedAt: (0, context_1.daysAgo)(10) } });
    await rootCauseSlaScanService.scan();
    await effectivenessDueScanService.scan();
    // eslint-disable-next-line no-console
    console.log("  CAPA Management: CAPA insiden+audit finding ditutup penuh EFFECTIVE_CLOSED, CAPA Management Review siklus NOT_EFFECTIVE->REOPENED->EFFECTIVE_CLOSED (BR-04), CAPA OTHER DRAFT root-cause SLA overdue.");
}
