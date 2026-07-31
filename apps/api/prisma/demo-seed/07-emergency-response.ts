// Data demo Emergency Response (Modul 14, task 3.7) — 4 plan lintas
// severity/status (LEVEL_1_LOCAL 1-stage APPROVED_ACTIVE dgn tim+drill+
// aktivasi REAL_EMERGENCY penuh, LEVEL_3 2-stage APPROVED_ACTIVE tapi
// review OVERDUE, REJECTED->DRAFT, DRAFT belum diajukan), 1 tim ERT (BR-03
// Incident Commander unik+backup eksplisit), 2 drill (FULL_SCALE_EVACUATION
// dgn aktivasi DRILL utk lolos BR-04 + partisipasi PRESENT/ABSENT campuran,
// TABLETOP dgn gapsIdentified+capaId placeholder BR-08), 1 aktivasi
// REAL_EMERGENCY (broadcast CRITICAL) dgn self-checkin+marshal-checkin
// (BR-05)+markAllClear, 2 equipment readiness checklist (READY tanpa
// notif, OUT_OF_SERVICE eskalasi real-time BR-06). approveAllPendingStages()
// generik dipakai (TIDAK ada wrapper BR-09-style — kedua stage plan-approval
// SAMA-SAMA HSE_MANAGER, lihat banner comment workflow-bootstrap-nya).
import { INestApplicationContext } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { EmergencyActivationService } from "../../src/modules/domains/emergency-response/emergency-activation.service";
import { EmergencyDrillService } from "../../src/modules/domains/emergency-response/emergency-drill.service";
import { EmergencyEquipmentReadinessChecklistService } from "../../src/modules/domains/emergency-response/emergency-equipment-readiness-checklist.service";
import { EmergencyMusterPointService } from "../../src/modules/domains/emergency-response/emergency-muster-point.service";
import { EmergencyPlanReviewOverdueScanService } from "../../src/modules/domains/emergency-response/emergency-plan-review-overdue-scan.service";
import { EmergencyResponsePlanService } from "../../src/modules/domains/emergency-response/emergency-response-plan.service";
import { EmergencyResponseTeamService } from "../../src/modules/domains/emergency-response/emergency-response-team.service";
import { MusterPointCheckinService } from "../../src/modules/domains/emergency-response/muster-point-checkin.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { actor, actors, daysAgo, DemoContext } from "./context";
import { actOnNextPendingTask, approveAllPendingStages } from "./shared";

export async function seedEmergencyResponse(app: INestApplicationContext, adminPrisma: PrismaClient, ctx: DemoContext): Promise<void> {
  const musterPointService = app.get(EmergencyMusterPointService);
  const planService = app.get(EmergencyResponsePlanService);
  const teamService = app.get(EmergencyResponseTeamService);
  const drillService = app.get(EmergencyDrillService);
  const activationService = app.get(EmergencyActivationService);
  const checkinService = app.get(MusterPointCheckinService);
  const readinessService = app.get(EmergencyEquipmentReadinessChecklistService);
  const reviewOverdueScanService = app.get(EmergencyPlanReviewOverdueScanService);

  const hseManager = actor(ctx, "HSE_MANAGER");
  const [hseOfficerCepu, hseOfficerBalikpapan] = actors(ctx, "HSE_OFFICER");
  const supervisor = actor(ctx, "SUPERVISOR");
  const departmentHead = actor(ctx, "DEPARTMENT_HEAD");
  const [worker1, worker2] = actors(ctx, "WORKER_EMPLOYEE");
  const run = <T>(userId: string, fn: () => Promise<T>) => tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);

  // 1. Plan LEVEL_1_LOCAL (FIRE, Cepu) — cerita paling lengkap: tim ERT +
  // 2 drill + 1 aktivasi REAL_EMERGENCY + equipment readiness.
  const musterPointCepu = await run(hseOfficerCepu.id, () =>
    musterPointService.create({
      siteId: ctx.siteIdCepu,
      musterPointCode: "MP-CEPU-01",
      musterPointName: "Titik Kumpul Utama Cepu",
      locationDescription: "Lapangan parkir depan gerbang utama",
      capacityEstimate: 150,
    }),
  );
  const plan1 = await run(hseOfficerCepu.id, () =>
    planService.create({
      companyId: ctx.companyId,
      siteId: ctx.siteIdCepu,
      planTitle: "SOP Kebakaran Area Produksi Cepu",
      emergencyType: "FIRE",
      scenarioDescription: "Kebakaran pada fasilitas produksi/tangki penyimpanan",
      defaultMusterPointId: musterPointCepu.id,
      severityLevel: "LEVEL_1_LOCAL",
      steps: [
        { sequenceNo: 1, stepDescription: "Aktifkan alarm kebakaran & hubungi pemadam internal", responsibleErtRole: "FIRE_WARDEN", maxTimeTargetMinutes: 2 },
        { sequenceNo: 2, stepDescription: "Pimpin evakuasi seluruh area produksi", responsibleErtRole: "INCIDENT_COMMANDER", maxTimeTargetMinutes: 10 },
        { sequenceNo: 3, stepDescription: "Arahkan personel menuju titik kumpul", responsibleErtRole: "EVACUATION_MARSHAL", maxTimeTargetMinutes: 15 },
      ],
    }),
  );
  const plan1Submitted = await run(hseOfficerCepu.id, () => planService.submitForApproval(plan1.id));
  await approveAllPendingStages(app, adminPrisma, ctx.tenantId, plan1Submitted.workflowInstanceId!);

  const team = await run(hseOfficerCepu.id, () =>
    teamService.create({ siteId: ctx.siteIdCepu, teamName: "ERT Site Cepu", teamType: "SITE_WIDE", effectiveDate: daysAgo(60) }),
  );
  const icMember = await run(hseOfficerCepu.id, () =>
    teamService.addMember(team.id, { userId: supervisor.id, ertRole: "INCIDENT_COMMANDER", assignedDate: daysAgo(60) }),
  );
  // BR-03 — Incident Commander KEDUA ditolak kecuali sbg backup eksplisit;
  // baris ini SENGAJA memakai backupForMemberId supaya lolos.
  await run(hseOfficerCepu.id, () =>
    teamService.addMember(team.id, { userId: departmentHead.id, ertRole: "INCIDENT_COMMANDER", backupForMemberId: icMember.id, assignedDate: daysAgo(60) }),
  );
  await run(hseOfficerCepu.id, () => teamService.addMember(team.id, { userId: worker1.id, ertRole: "FIRE_WARDEN", assignedDate: daysAgo(60) }));
  await run(hseOfficerCepu.id, () => teamService.addMember(team.id, { userId: worker2.id, ertRole: "EVACUATION_MARSHAL", assignedDate: daysAgo(60) }));
  await run(hseOfficerCepu.id, () => teamService.addMember(team.id, { userId: hseOfficerCepu.id, ertRole: "FIRST_AIDER", assignedDate: daysAgo(60) }));

  // Drill 1 — FULL_SCALE_EVACUATION, BR-04 wajib >=1 emergency_activations
  // (trigger_context=DRILL, TIDAK memicu broadcast) sebelum boleh COMPLETED.
  const drill1 = await run(hseOfficerCepu.id, () =>
    drillService.create({
      siteId: ctx.siteIdCepu,
      emergencyResponsePlanId: plan1.id,
      drillType: "FULL_SCALE_EVACUATION",
      scheduledDate: daysAgo(20),
      objective: "Menguji waktu evakuasi penuh area produksi",
      plannedParticipantCount: 4,
      evacuationTimeTargetMinutes: 15,
      conductedBy: hseOfficerCepu.id,
    }),
  );
  await run(hseOfficerCepu.id, () => drillService.start(drill1.id));
  await run(hseOfficerCepu.id, () =>
    activationService.declare({ siteId: ctx.siteIdCepu, emergencyResponsePlanId: plan1.id, triggerContext: "DRILL", relatedEmergencyDrillId: drill1.id, emergencyType: "FIRE" }),
  );
  await run(hseOfficerCepu.id, () => drillService.recordParticipation(drill1.id, { userId: worker1.id, participantType: "EMPLOYEE", attendanceStatus: "PRESENT" }));
  await run(hseOfficerCepu.id, () => drillService.recordParticipation(drill1.id, { userId: worker2.id, participantType: "EMPLOYEE", attendanceStatus: "PRESENT" }));
  await run(hseOfficerCepu.id, () => drillService.recordParticipation(drill1.id, { userId: supervisor.id, participantType: "EMPLOYEE", attendanceStatus: "ABSENT" }));
  await run(hseOfficerCepu.id, () =>
    drillService.recordParticipation(drill1.id, { participantName: "Slamet (Kontraktor Lepas)", participantType: "CONTRACTOR", attendanceStatus: "PRESENT" }),
  );
  await run(hseOfficerCepu.id, () =>
    drillService.complete(drill1.id, { evacuationTimeActualMinutes: 13, observerNotes: "Evakuasi berjalan lancar, sedikit lebih cepat dari target" }),
  );

  // Drill 2 — TABLETOP dgn temuan gap (BR-08 wajib capa_id kalau
  // gaps_identified terisi; Modul 10 sudah ada tapi tautan CAPA nyata utk
  // drill BUKAN cakupan modul ini, placeholder randomUUID() pola sama
  // capa-placeholder Regulatory Compliance 2.2/CAPA gap TDD §26 modul ini).
  const drill2 = await run(hseOfficerCepu.id, () =>
    drillService.create({
      siteId: ctx.siteIdCepu,
      emergencyResponsePlanId: plan1.id,
      drillType: "TABLETOP",
      scheduledDate: daysAgo(10),
      objective: "Simulasi meja skenario kebocoran gas",
      conductedBy: hseOfficerCepu.id,
    }),
  );
  await run(hseOfficerCepu.id, () => drillService.start(drill2.id));
  await run(hseOfficerCepu.id, () =>
    drillService.complete(drill2.id, { gapsIdentified: "Waktu respon tim P3K masih lambat, perlu pelatihan ulang", capaId: randomUUID() }),
  );

  // Aktivasi REAL_EMERGENCY — memicu broadcast prioritas CRITICAL ke seluruh
  // karyawan/kontraktor site Cepu + HSE Manager + Tenant Admin (BUKAN
  // visitor/site lain, lihat EmergencyActivationService.broadcastRealEmergencyActivation).
  const realActivation = await run(hseOfficerCepu.id, () =>
    activationService.declare({
      siteId: ctx.siteIdCepu,
      emergencyResponsePlanId: plan1.id,
      triggerContext: "REAL_EMERGENCY",
      emergencyType: "FIRE",
      description: "Kebakaran kecil di area tangki B-12, api berhasil dipadamkan APAR",
      totalExpectedHeadcount: 6,
    }),
  );
  await run(worker1.id, () => checkinService.selfCheckin({ siteId: ctx.siteIdCepu, musterPointId: musterPointCepu.id, emergencyActivationId: realActivation.id }));
  await run(worker2.id, () => checkinService.selfCheckin({ siteId: ctx.siteIdCepu, musterPointId: musterPointCepu.id, emergencyActivationId: realActivation.id }));
  await run(supervisor.id, () =>
    checkinService.marshalCheckin({
      siteId: ctx.siteIdCepu,
      musterPointId: musterPointCepu.id,
      emergencyActivationId: realActivation.id,
      checkinPersonName: "Slamet (Kontraktor Lepas)",
      checkinPersonType: "CONTRACTOR",
    }),
  );
  await run(hseOfficerCepu.id, () => activationService.markAllClear(realActivation.id));

  // Equipment readiness — READY tanpa notifikasi, OUT_OF_SERVICE eskalasi
  // real-time ke HSE Manager (BR-06, BUKAN scan job). assetId placeholder
  // (Modul 15 tidak menyediakan FK ke sini, lihat banner comment servicenya).
  await run(hseOfficerCepu.id, () => readinessService.create({ siteId: ctx.siteIdCepu, assetId: randomUUID(), inspectionDate: daysAgo(5), readinessStatus: "READY" }));
  await run(hseOfficerCepu.id, () =>
    readinessService.create({
      siteId: ctx.siteIdCepu,
      assetId: randomUUID(),
      inspectionDate: daysAgo(2),
      readinessStatus: "OUT_OF_SERVICE",
      issueDescription: "APAR area gudang B kosong, perlu isi ulang segera",
    }),
  );

  // 2. Plan LEVEL_3 (EXPLOSION, Balikpapan) — 2-stage APPROVED_ACTIVE, lalu
  // next_review_due_date dibackdate supaya BR-01 review-overdue-scan
  // genuinely menemukan item ini (dipanggil sungguhan di akhir).
  const plan2 = await run(hseOfficerBalikpapan.id, () =>
    planService.create({
      companyId: ctx.companyId,
      siteId: ctx.siteIdBalikpapan,
      planTitle: "SOP Ledakan Fasilitas Terminal Balikpapan",
      emergencyType: "EXPLOSION",
      scenarioDescription: "Ledakan pada fasilitas penyimpanan/terminal BBM",
      severityLevel: "LEVEL_3_COMPANY_WIDE_EXTERNAL_AGENCY",
      steps: [{ sequenceNo: 1, stepDescription: "Isolasi area & evakuasi total", responsibleErtRole: "INCIDENT_COMMANDER", maxTimeTargetMinutes: 5 }],
    }),
  );
  const plan2Submitted = await run(hseOfficerBalikpapan.id, () => planService.submitForApproval(plan2.id));
  await approveAllPendingStages(app, adminPrisma, ctx.tenantId, plan2Submitted.workflowInstanceId!);
  await adminPrisma.emergencyResponsePlan.update({ where: { id: plan2.id }, data: { nextReviewDueDate: daysAgo(45) } });

  // 3. Plan REJECTED -> kembali DRAFT (LEVEL_1_LOCAL, EARTHQUAKE, HQ).
  const plan3 = await run(hseManager.id, () =>
    planService.create({
      companyId: ctx.companyId,
      siteId: ctx.siteIdHq,
      planTitle: "SOP Gempa Bumi Kantor Pusat",
      emergencyType: "EARTHQUAKE",
      scenarioDescription: "Gempa bumi mengguncang area perkantoran HQ",
      severityLevel: "LEVEL_1_LOCAL",
      steps: [],
    }),
  );
  const plan3Submitted = await run(hseManager.id, () => planService.submitForApproval(plan3.id));
  await actOnNextPendingTask(
    app,
    adminPrisma,
    ctx.tenantId,
    plan3Submitted.workflowInstanceId!,
    "REJECT",
    "Prosedur evakuasi gempa belum mencakup gedung bertingkat, mohon direvisi",
  );

  // 4. Plan DRAFT — belum diajukan (HAZMAT_SPILL, Balikpapan).
  await run(hseOfficerBalikpapan.id, () =>
    planService.create({
      companyId: ctx.companyId,
      siteId: ctx.siteIdBalikpapan,
      planTitle: "SOP Tumpahan B3 Area Terminal",
      emergencyType: "HAZMAT_SPILL",
      scenarioDescription: "Tumpahan bahan kimia berbahaya saat bongkar muat",
      severityLevel: "LEVEL_1_LOCAL",
      steps: [{ sequenceNo: 1, stepDescription: "Isolasi area tumpahan", responsibleErtRole: "HAZMAT_RESPONSE_OFFICER" }],
    }),
  );

  await reviewOverdueScanService.scan();

  // eslint-disable-next-line no-console
  console.log(
    "  Emergency Response: 4 plan (LEVEL_1 APPROVED_ACTIVE+tim ERT+2 drill+aktivasi REAL_EMERGENCY+checkin+equipment, LEVEL_3 APPROVED_ACTIVE+review OVERDUE, REJECTED->DRAFT, DRAFT).",
  );
}
