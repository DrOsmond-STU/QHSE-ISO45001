"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedWorkPermit = seedWorkPermit;
const gas_test_result_service_1 = require("../../src/modules/domains/work-permit/gas-test-result.service");
const isolation_loto_record_service_1 = require("../../src/modules/domains/work-permit/isolation-loto-record.service");
const work_permit_closure_service_1 = require("../../src/modules/domains/work-permit/work-permit-closure.service");
const work_permit_extension_service_1 = require("../../src/modules/domains/work-permit/work-permit-extension.service");
const work_permit_type_service_1 = require("../../src/modules/domains/work-permit/work-permit-type.service");
const work_permit_service_1 = require("../../src/modules/domains/work-permit/work-permit.service");
const tenant_context_1 = require("../../src/platform/tenancy/tenant-context");
const context_1 = require("./context");
/** Loop sampai tidak ada workflow_task PENDING lagi (BUKAN hitung manual N
 * kali) — 2 demo SUPERVISOR bikin stage ROLE_IN_SCOPE Issuer jadi parallel
 * group >1 task, pola bug SAMA yang ditemukan di risk-management.ts (lihat
 * banner comment shared.ts approveAllPendingStages()). `act` diparameterkan
 * krn Work Permit py wrapper actOnApprovalTask()/actOnExtensionTask()
 * SENDIRI (BR-09 segregation-of-duty), BUKAN WorkflowEngineService.actOnTask()
 * generik dipakai modul lain. */
async function approveAllPendingWorkPermitStages(adminPrisma, tenantId, workflowInstanceId, act, maxStages = 6) {
    for (let i = 0; i < maxStages; i++) {
        const task = await adminPrisma.workflowTask.findFirst({ where: { instanceId: workflowInstanceId, status: "PENDING" } });
        if (!task || !task.assignedTo)
            return;
        const actorUserId = task.assignedTo;
        await tenant_context_1.tenantContextStorage.run({ tenantId, userId: actorUserId }, () => act(task.id, actorUserId));
        await new Promise((r) => setTimeout(r, 350));
    }
}
async function seedWorkPermit(app, adminPrisma, ctx) {
    const typeService = app.get(work_permit_type_service_1.WorkPermitTypeService);
    const permitService = app.get(work_permit_service_1.WorkPermitService);
    const gasTestService = app.get(gas_test_result_service_1.GasTestResultService);
    const lotoService = app.get(isolation_loto_record_service_1.IsolationLotoRecordService);
    const extensionService = app.get(work_permit_extension_service_1.WorkPermitExtensionService);
    const closureService = app.get(work_permit_closure_service_1.WorkPermitClosureService);
    const hseOfficer = (0, context_1.actor)(ctx, "HSE_OFFICER");
    const hseManager = (0, context_1.actor)(ctx, "HSE_MANAGER");
    const supervisor = (0, context_1.actor)(ctx, "SUPERVISOR"); // bertindak sbg Issuer
    const worker = (0, context_1.actor)(ctx, "WORKER_EMPLOYEE");
    const run = (userId, fn) => tenant_context_1.tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);
    const typeGeneral = await run(hseOfficer.id, () => typeService.create({ code: "GEN", name: "Kerja Umum", requiresGasTest: false, requiresLoto: false, requiresHseApproval: false, defaultRiskLevel: "LOW" }));
    const typeHotWork = await run(hseOfficer.id, () => typeService.create({ code: "HOTWORK", name: "Kerja Panas (Hot Work)", requiresGasTest: true, requiresLoto: false, requiresHseApproval: true, defaultRiskLevel: "HIGH" }));
    const typeConfined = await run(hseOfficer.id, () => typeService.create({ code: "CONFINED", name: "Ruang Terbatas (Confined Space)", requiresGasTest: true, requiresLoto: true, requiresHseApproval: true, defaultRiskLevel: "HIGH", maxExtensionCount: 2 }));
    async function createPermit(typeId, title, description, requesterId, hours = 8) {
        return run(requesterId, () => permitService.create({
            workPermitTypeId: typeId,
            siteId: ctx.siteIdCepu,
            title,
            description,
            requesterId,
            plannedStartDatetime: new Date(),
            plannedEndDatetime: (0, context_1.daysFromNow)(hours / 24),
        }));
    }
    // 1. Sederhana, LOW risk, tanpa Stage 2 HSE — DRAFT -> ACTIVE.
    const permitSimple = await createPermit(typeGeneral.id, "Ganti lampu LED area gudang", "Penggantian armatur lampu rusak", worker.id);
    await run(worker.id, () => permitService.submitHazardChecklist(permitSimple.id, { customFields: { apd: "helm+sarung tangan" }, allMandatoryItemsChecked: true }));
    const simpleSubmitted = await run(worker.id, () => permitService.submitForApproval(permitSimple.id));
    await approveAllPendingWorkPermitStages(adminPrisma, ctx.tenantId, simpleSubmitted.workflowInstanceId, (taskId, actorId) => permitService.actOnApprovalTask(taskId, "APPROVE", undefined, actorId));
    await run(worker.id, () => permitService.activate(permitSimple.id));
    // 2. Hot Work HIGH risk, 2-stage (Issuer+HSE Manager), gas test, LALU
    // extension + closure penuh — cerita paling lengkap.
    // requesterId WAJIB beda dari pool approver Issuer (role SUPERVISOR,
    // ROLE_IN_SCOPE) — BR-09 segregation-of-duty menolak requester jadi
    // approver permit miliknya sendiri, ditemukan empiris saat supervisor.id
    // dipakai sbg requesterId di sini (Hendra Kusuma kebetulan JUGA salah
    // satu kandidat approver Issuer).
    const permitHotWork = await createPermit(typeHotWork.id, "Pengelasan pipa flowline area produksi", "Perbaikan darurat kebocoran las", worker.id);
    await run(supervisor.id, () => permitService.submitHazardChecklist(permitHotWork.id, { customFields: { fireWatch: true, apar: true }, allMandatoryItemsChecked: true }));
    const hotWorkSubmitted = await run(supervisor.id, () => permitService.submitForApproval(permitHotWork.id));
    await approveAllPendingWorkPermitStages(adminPrisma, ctx.tenantId, hotWorkSubmitted.workflowInstanceId, (taskId, actorId) => permitService.actOnApprovalTask(taskId, "APPROVE", undefined, actorId));
    await run(hseOfficer.id, () => gasTestService.record({
        workPermitId: permitHotWork.id,
        gasType: "LEL_FLAMMABLE",
        readingValue: 0,
        unit: "%LEL",
        acceptableMin: 0,
        acceptableMax: 5,
        result: "PASS",
        testDatetime: new Date(),
        instrumentName: "MSA Altair 4X",
        testedBy: hseOfficer.id,
    }));
    const hotWorkActivated = await run(supervisor.id, () => permitService.activate(permitHotWork.id));
    const hotWorkExtension = await run(supervisor.id, () => extensionService.request({
        workPermitId: hotWorkActivated.id,
        requestedNewEndDatetime: (0, context_1.daysFromNow)(1.5),
        reason: "Pengelasan belum selesai, dibutuhkan waktu tambahan 12 jam",
        gasRetestRequired: false,
        requestedBy: worker.id,
    }));
    await approveAllPendingWorkPermitStages(adminPrisma, ctx.tenantId, hotWorkExtension.workflowInstanceId, (taskId, actorId) => extensionService.actOnExtensionTask(taskId, "APPROVE", undefined, actorId));
    await run(supervisor.id, () => closureService.submit(hotWorkActivated.id, { areaSafetyChecklist: { alatDikembalikan: true, housekeeping: true, fireWatchSelesai: true }, isolationRemovedConfirmed: false, requesterSignoffBy: worker.id }));
    await run(hseOfficer.id, () => closureService.verify(hotWorkActivated.id, hseOfficer.id, "VERIFIED"));
    // 3. Confined Space HIGH risk — gas test + LOTO (verifier != applier) ->
    // ACTIVE (dibiarkan aktif, belum ditutup — skenario "sedang berlangsung").
    const permitConfined = await createPermit(typeConfined.id, "Masuk tangki penyimpanan utk inspeksi internal", "Inspeksi visual dinding tangki", worker.id, 8);
    await run(supervisor.id, () => permitService.submitHazardChecklist(permitConfined.id, { customFields: { rescueTeamStandby: true }, allMandatoryItemsChecked: true }));
    const confinedSubmitted = await run(supervisor.id, () => permitService.submitForApproval(permitConfined.id));
    await approveAllPendingWorkPermitStages(adminPrisma, ctx.tenantId, confinedSubmitted.workflowInstanceId, (taskId, actorId) => permitService.actOnApprovalTask(taskId, "APPROVE", undefined, actorId));
    await run(hseOfficer.id, () => gasTestService.record({
        workPermitId: permitConfined.id,
        gasType: "OXYGEN",
        readingValue: 20.9,
        unit: "%VOL",
        acceptableMin: 19.5,
        acceptableMax: 23.5,
        result: "PASS",
        testDatetime: new Date(),
        instrumentName: "MSA Altair 4X",
        testedBy: hseOfficer.id,
    }));
    const confinedLoto = await run(supervisor.id, () => lotoService.apply({
        workPermitId: permitConfined.id,
        isolationPointDescription: "Valve inlet tangki T-105",
        isolationType: "MECHANICAL",
        lockNumber: "LK-105",
        appliedBy: supervisor.id,
        appliedAt: new Date(),
    }));
    await run(hseManager.id, () => lotoService.verify(confinedLoto.id, hseManager.id));
    await run(supervisor.id, () => permitService.activate(permitConfined.id));
    // 4. DRAFT — belum diajukan.
    await createPermit(typeGeneral.id, "Pembersihan area parkir kendaraan berat", "Housekeeping rutin", worker.id, 6);
    // 5. REJECTED di Stage 1.
    const permitRejected = await createPermit(typeGeneral.id, "Pemasangan spanduk K3 tanpa izin lokasi jelas", "Uji penolakan", worker.id, 4);
    await run(worker.id, () => permitService.submitHazardChecklist(permitRejected.id, { customFields: {}, allMandatoryItemsChecked: true }));
    const rejectedSubmitted = await run(worker.id, () => permitService.submitForApproval(permitRejected.id));
    {
        const task = await adminPrisma.workflowTask.findFirst({ where: { instanceId: rejectedSubmitted.workflowInstanceId, status: "PENDING" } });
        if (task?.assignedTo) {
            await run(task.assignedTo, () => permitService.actOnApprovalTask(task.id, "REJECT", "Lokasi pemasangan belum dikonfirmasi tim area", task.assignedTo));
        }
    }
    // 6. PENDING_ISSUER_APPROVAL — masih menunggu keputusan.
    const permitPending = await createPermit(typeGeneral.id, "Perbaikan pagar pembatas site", "Perbaikan pagar rusak akibat angin kencang", worker.id, 6);
    await run(worker.id, () => permitService.submitHazardChecklist(permitPending.id, { customFields: {}, allMandatoryItemsChecked: true }));
    await run(worker.id, () => permitService.submitForApproval(permitPending.id));
    // eslint-disable-next-line no-console
    console.log("  Work Permit: 3 tipe, 6 izin (draft, active-simple, active-hotwork+extension+closure, active-confined+LOTO, rejected, pending-approval).");
}
