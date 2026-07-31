// Data demo Work Permit (Modul 06, task 3.3+3.4) — 3 tipe izin, 6 permit
// lintas status (draft, active-simple, active-hot-work-2-stage+gas-test+
// extension+closure penuh, active-confined-space+LOTO, rejected, pending-
// approval) — pola panggilan PERSIS work-permit-lifecycle/-extension-closure
// integration-spec.ts. actOnApprovalTask()/actOnExtensionTask() WAJIB
// dipakai (BUKAN WorkflowEngineService.actOnTask() generik) — wrapper BR-09
// segregation-of-duty khusus modul ini.
import { INestApplicationContext } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { GasTestResultService } from "../../src/modules/domains/work-permit/gas-test-result.service";
import { IsolationLotoRecordService } from "../../src/modules/domains/work-permit/isolation-loto-record.service";
import { WorkPermitClosureService } from "../../src/modules/domains/work-permit/work-permit-closure.service";
import { WorkPermitExtensionService } from "../../src/modules/domains/work-permit/work-permit-extension.service";
import { WorkPermitTypeService } from "../../src/modules/domains/work-permit/work-permit-type.service";
import { WorkPermitService } from "../../src/modules/domains/work-permit/work-permit.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { actor, daysFromNow, DemoContext } from "./context";

/** Loop sampai tidak ada workflow_task PENDING lagi (BUKAN hitung manual N
 * kali) — 2 demo SUPERVISOR bikin stage ROLE_IN_SCOPE Issuer jadi parallel
 * group >1 task, pola bug SAMA yang ditemukan di risk-management.ts (lihat
 * banner comment shared.ts approveAllPendingStages()). `act` diparameterkan
 * krn Work Permit py wrapper actOnApprovalTask()/actOnExtensionTask()
 * SENDIRI (BR-09 segregation-of-duty), BUKAN WorkflowEngineService.actOnTask()
 * generik dipakai modul lain. */
async function approveAllPendingWorkPermitStages(
  adminPrisma: PrismaClient,
  tenantId: string,
  workflowInstanceId: string,
  act: (taskId: string, actorUserId: string) => Promise<unknown>,
  maxStages = 6,
): Promise<void> {
  for (let i = 0; i < maxStages; i++) {
    const task = await adminPrisma.workflowTask.findFirst({ where: { instanceId: workflowInstanceId, status: "PENDING" } });
    if (!task || !task.assignedTo) return;
    const actorUserId = task.assignedTo;
    await tenantContextStorage.run({ tenantId, userId: actorUserId }, () => act(task.id, actorUserId));
    await new Promise((r) => setTimeout(r, 350));
  }
}

export async function seedWorkPermit(app: INestApplicationContext, adminPrisma: PrismaClient, ctx: DemoContext): Promise<void> {
  const typeService = app.get(WorkPermitTypeService);
  const permitService = app.get(WorkPermitService);
  const gasTestService = app.get(GasTestResultService);
  const lotoService = app.get(IsolationLotoRecordService);
  const extensionService = app.get(WorkPermitExtensionService);
  const closureService = app.get(WorkPermitClosureService);

  const hseOfficer = actor(ctx, "HSE_OFFICER");
  const hseManager = actor(ctx, "HSE_MANAGER");
  const supervisor = actor(ctx, "SUPERVISOR"); // bertindak sbg Issuer
  const worker = actor(ctx, "WORKER_EMPLOYEE");
  const run = <T>(userId: string, fn: () => Promise<T>) => tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);

  const typeGeneral = await run(hseOfficer.id, () =>
    typeService.create({ code: "GEN", name: "Kerja Umum", requiresGasTest: false, requiresLoto: false, requiresHseApproval: false, defaultRiskLevel: "LOW" }),
  );
  const typeHotWork = await run(hseOfficer.id, () =>
    typeService.create({ code: "HOTWORK", name: "Kerja Panas (Hot Work)", requiresGasTest: true, requiresLoto: false, requiresHseApproval: true, defaultRiskLevel: "HIGH" }),
  );
  const typeConfined = await run(hseOfficer.id, () =>
    typeService.create({ code: "CONFINED", name: "Ruang Terbatas (Confined Space)", requiresGasTest: true, requiresLoto: true, requiresHseApproval: true, defaultRiskLevel: "HIGH", maxExtensionCount: 2 }),
  );

  async function createPermit(typeId: string, title: string, description: string, requesterId: string, hours = 8) {
    return run(requesterId, () =>
      permitService.create({
        workPermitTypeId: typeId,
        siteId: ctx.siteIdCepu,
        title,
        description,
        requesterId,
        plannedStartDatetime: new Date(),
        plannedEndDatetime: daysFromNow(hours / 24),
      }),
    );
  }

  // 1. Sederhana, LOW risk, tanpa Stage 2 HSE — DRAFT -> ACTIVE.
  const permitSimple = await createPermit(typeGeneral.id, "Ganti lampu LED area gudang", "Penggantian armatur lampu rusak", worker.id);
  await run(worker.id, () => permitService.submitHazardChecklist(permitSimple.id, { customFields: { apd: "helm+sarung tangan" }, allMandatoryItemsChecked: true }));
  const simpleSubmitted = await run(worker.id, () => permitService.submitForApproval(permitSimple.id));
  await approveAllPendingWorkPermitStages(adminPrisma, ctx.tenantId, simpleSubmitted.workflowInstanceId!, (taskId, actorId) => permitService.actOnApprovalTask(taskId, "APPROVE", undefined, actorId));
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
  await approveAllPendingWorkPermitStages(adminPrisma, ctx.tenantId, hotWorkSubmitted.workflowInstanceId!, (taskId, actorId) => permitService.actOnApprovalTask(taskId, "APPROVE", undefined, actorId));
  await run(hseOfficer.id, () =>
    gasTestService.record({
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
    }),
  );
  const hotWorkActivated = await run(supervisor.id, () => permitService.activate(permitHotWork.id));
  const hotWorkExtension = await run(supervisor.id, () =>
    extensionService.request({
      workPermitId: hotWorkActivated.id,
      requestedNewEndDatetime: daysFromNow(1.5),
      reason: "Pengelasan belum selesai, dibutuhkan waktu tambahan 12 jam",
      gasRetestRequired: false,
      requestedBy: worker.id,
    }),
  );
  await approveAllPendingWorkPermitStages(adminPrisma, ctx.tenantId, hotWorkExtension.workflowInstanceId!, (taskId, actorId) => extensionService.actOnExtensionTask(taskId, "APPROVE", undefined, actorId));
  await run(supervisor.id, () =>
    closureService.submit(hotWorkActivated.id, { areaSafetyChecklist: { alatDikembalikan: true, housekeeping: true, fireWatchSelesai: true }, isolationRemovedConfirmed: false, requesterSignoffBy: worker.id }),
  );
  await run(hseOfficer.id, () => closureService.verify(hotWorkActivated.id, hseOfficer.id, "VERIFIED"));

  // 3. Confined Space HIGH risk — gas test + LOTO (verifier != applier) ->
  // ACTIVE (dibiarkan aktif, belum ditutup — skenario "sedang berlangsung").
  const permitConfined = await createPermit(typeConfined.id, "Masuk tangki penyimpanan utk inspeksi internal", "Inspeksi visual dinding tangki", worker.id, 8);
  await run(supervisor.id, () => permitService.submitHazardChecklist(permitConfined.id, { customFields: { rescueTeamStandby: true }, allMandatoryItemsChecked: true }));
  const confinedSubmitted = await run(supervisor.id, () => permitService.submitForApproval(permitConfined.id));
  await approveAllPendingWorkPermitStages(adminPrisma, ctx.tenantId, confinedSubmitted.workflowInstanceId!, (taskId, actorId) => permitService.actOnApprovalTask(taskId, "APPROVE", undefined, actorId));
  await run(hseOfficer.id, () =>
    gasTestService.record({
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
    }),
  );
  const confinedLoto = await run(supervisor.id, () =>
    lotoService.apply({
      workPermitId: permitConfined.id,
      isolationPointDescription: "Valve inlet tangki T-105",
      isolationType: "MECHANICAL",
      lockNumber: "LK-105",
      appliedBy: supervisor.id,
      appliedAt: new Date(),
    }),
  );
  await run(hseManager.id, () => lotoService.verify(confinedLoto.id, hseManager.id));
  await run(supervisor.id, () => permitService.activate(permitConfined.id));

  // 4. DRAFT — belum diajukan.
  await createPermit(typeGeneral.id, "Pembersihan area parkir kendaraan berat", "Housekeeping rutin", worker.id, 6);

  // 5. REJECTED di Stage 1.
  const permitRejected = await createPermit(typeGeneral.id, "Pemasangan spanduk K3 tanpa izin lokasi jelas", "Uji penolakan", worker.id, 4);
  await run(worker.id, () => permitService.submitHazardChecklist(permitRejected.id, { customFields: {}, allMandatoryItemsChecked: true }));
  const rejectedSubmitted = await run(worker.id, () => permitService.submitForApproval(permitRejected.id));
  {
    const task = await adminPrisma.workflowTask.findFirst({ where: { instanceId: rejectedSubmitted.workflowInstanceId!, status: "PENDING" } });
    if (task?.assignedTo) {
      await run(task.assignedTo, () => permitService.actOnApprovalTask(task.id, "REJECT", "Lokasi pemasangan belum dikonfirmasi tim area", task.assignedTo!));
    }
  }

  // 6. PENDING_ISSUER_APPROVAL — masih menunggu keputusan.
  const permitPending = await createPermit(typeGeneral.id, "Perbaikan pagar pembatas site", "Perbaikan pagar rusak akibat angin kencang", worker.id, 6);
  await run(worker.id, () => permitService.submitHazardChecklist(permitPending.id, { customFields: {}, allMandatoryItemsChecked: true }));
  await run(worker.id, () => permitService.submitForApproval(permitPending.id));

  // eslint-disable-next-line no-console
  console.log("  Work Permit: 3 tipe, 6 izin (draft, active-simple, active-hotwork+extension+closure, active-confined+LOTO, rejected, pending-approval).");
}
