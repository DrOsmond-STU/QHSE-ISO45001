// Data demo CAPA Management (Modul 10, task 4.2) — DUA CAPA yang SUDAH ADA
// dari modul lain (INCIDENT dari 05-incident.ts, AUDIT_FINDING auto-linked
// via AuditFindingCapaTriggerListener dari 08-audit.ts) didorong lewat
// siklus PENUH sampai EFFECTIVE_CLOSED, PLUS 2 CAPA manual baru
// (MANAGEMENT_REVIEW siklus NOT_EFFECTIVE->REOPENED->siklus ulang->
// EFFECTIVE_CLOSED demo BR-04, OTHER dibiarkan DRAFT dgn root-cause SLA
// overdue). CAPA AUDIT_FINDING SENGAJA: finding1a/audit1 (08-audit.ts)
// DIBIARKAN CAPA_LINKED/PENDING_CAPA_CLOSURE (BUKAN diclose manual di sana)
// krn CapaEffectivenessVerificationWorkflowCompletionListener men-sinkron-
// balik finding.verify()+close() OTOMATIS begitu CAPA ini genuinely
// EFFECTIVE_CLOSED — audit1.close() dipanggil DI SINI (bukan di
// 08-audit.ts) SETELAHNYA, rantai ketergantungan CAPA->finding->audit yang
// genuinely benar (ditemukan empiris: memanggilnya lebih dulu di
// 08-audit.ts menabrak listener ini dgn error CLOSED->VERIFIED ditolak).
// Kedua workflow CAPA (capa_action_plan, capa_effectiveness_verification)
// 1-stage HSE_MANAGER saja (lihat pola pendingTaskFor tunggal di
// integration-spec-nya) — approveAllPendingStages() generik shared.ts
// tetap dipakai spy aman kalau suatu saat >1 kandidat HSE_MANAGER.
import { INestApplicationContext } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AuditService } from "../../src/modules/domains/audit/audit.service";
import { CapaActionPlanService } from "../../src/modules/domains/capa/capa-action-plan.service";
import { CapaEffectivenessVerificationDueScanService } from "../../src/modules/domains/capa/capa-effectiveness-verification-due-scan.service";
import { CapaEffectivenessVerificationService } from "../../src/modules/domains/capa/capa-effectiveness-verification.service";
import { CapaRegisterService } from "../../src/modules/domains/capa/capa-register.service";
import { CapaRootCauseAnalysisService } from "../../src/modules/domains/capa/capa-root-cause-analysis.service";
import { CapaRootCauseSlaScanService } from "../../src/modules/domains/capa/capa-root-cause-sla-scan.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { actor, actors, daysAgo, daysFromNow, DemoContext } from "./context";
import { approveAllPendingStages } from "./shared";

async function driveActionPlanToInProgress(
  app: INestApplicationContext,
  adminPrisma: PrismaClient,
  ctx: DemoContext,
  capaRegisterId: string,
  actorUserId: string,
  picUserId: string,
  actionDescription: string,
  rootCauseSummary: string,
  dueDate: Date,
): Promise<void> {
  const rootCauseService = app.get(CapaRootCauseAnalysisService);
  const actionPlanService = app.get(CapaActionPlanService);
  const run = <T>(fn: () => Promise<T>) => tenantContextStorage.run({ tenantId: ctx.tenantId, userId: actorUserId }, fn);

  await run(() =>
    rootCauseService.record({ capaRegisterId, method: "FIVE_WHY", methodDetail: { whys: [rootCauseSummary] }, rootCauseSummary }),
  );
  const actionPlan = await run(() =>
    actionPlanService.define({ capaRegisterId, actionDescription, justification: rootCauseSummary, actionType: "CORRECTIVE", picUserId, dueDate }),
  );
  await run(() => actionPlanService.setActionTrackingId(actionPlan.id, randomUUID()));
  const submitted = await run(() => actionPlanService.submitForApproval(capaRegisterId));
  await approveAllPendingStages(app, adminPrisma, ctx.tenantId, submitted.workflowInstanceId!);
  await run(() => actionPlanService.updateStatusCache(actionPlan.id, "COMPLETED", new Date()));
}

async function driveEffectivenessToOutcome(
  app: INestApplicationContext,
  adminPrisma: PrismaClient,
  ctx: DemoContext,
  capaRegisterId: string,
  actorUserId: string,
  verifierUserId: string,
  result: "EFFECTIVE" | "NOT_EFFECTIVE",
  evidenceDescription: string,
): Promise<void> {
  const effectivenessService = app.get(CapaEffectivenessVerificationService);
  const run = <T>(fn: () => Promise<T>) => tenantContextStorage.run({ tenantId: ctx.tenantId, userId: actorUserId }, fn);

  const verification = await run(() =>
    effectivenessService.create({
      capaRegisterId,
      verificationMethod: "FIELD_OBSERVATION",
      observationPeriodDays: 30,
      verificationDueDate: daysFromNow(30),
      verifiedBy: verifierUserId,
    }),
  );
  await run(() => effectivenessService.recordResult(verification.id, { result, evidenceDescription }));
  await run(() => effectivenessService.submitForApproval(verification.id));
  const capaAfterSubmit = await adminPrisma.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId } });
  await approveAllPendingStages(app, adminPrisma, ctx.tenantId, capaAfterSubmit.workflowInstanceId!);
}

export async function seedCapa(app: INestApplicationContext, adminPrisma: PrismaClient, ctx: DemoContext): Promise<void> {
  const capaRegisterService = app.get(CapaRegisterService);
  const rootCauseSlaScanService = app.get(CapaRootCauseSlaScanService);
  const effectivenessDueScanService = app.get(CapaEffectivenessVerificationDueScanService);

  const hseManager = actor(ctx, "HSE_MANAGER");
  const supervisor = actor(ctx, "SUPERVISOR");
  const [hseOfficerCepu] = actors(ctx, "HSE_OFFICER");
  const leadAuditor = actor(ctx, "AUDITOR_INTERNAL");
  const [worker1, worker2] = actors(ctx, "WORKER_EMPLOYEE");
  const departmentHead = actor(ctx, "DEPARTMENT_HEAD");
  const run = <T>(userId: string, fn: () => Promise<T>) => tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);

  // 1. CAPA dari insiden FATALITY (05-incident.ts) -> siklus penuh -> EFFECTIVE_CLOSED.
  const incidentCapa = await adminPrisma.capaRegister.findFirstOrThrow({ where: { tenantId: ctx.tenantId, sourceType: "INCIDENT" } });
  await driveActionPlanToInProgress(
    app,
    adminPrisma,
    ctx,
    incidentCapa.id,
    hseManager.id,
    supervisor.id,
    "Refresh training bekerja di ketinggian + wajib body harness terpasang sebelum mulai kerja",
    "Prosedur bekerja di ketinggian tidak ditegakkan konsisten di lapangan",
    daysFromNow(14),
  );
  await driveEffectivenessToOutcome(
    app,
    adminPrisma,
    ctx,
    incidentCapa.id,
    hseManager.id,
    hseOfficerCepu.id,
    "EFFECTIVE",
    "Observasi lapangan 30 hari: kepatuhan body harness 100% di area produksi",
  );

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
  const auditCapa = await adminPrisma.capaRegister.findUniqueOrThrow({ where: { id: finding1a.capaRegisterId! } });
  await driveActionPlanToInProgress(
    app,
    adminPrisma,
    ctx,
    auditCapa.id,
    hseManager.id,
    worker1.id,
    "Sosialisasi ulang wajib APD & sanksi bertahap bagi pelanggaran berulang",
    "Kepatuhan APD di area produksi rendah, tidak ada konsekuensi tegas",
    daysFromNow(14),
  );
  await driveEffectivenessToOutcome(
    app,
    adminPrisma,
    ctx,
    auditCapa.id,
    hseManager.id,
    leadAuditor.id,
    "EFFECTIVE",
    "Audit tindak lanjut: kepatuhan APD meningkat signifikan, tidak ada pelanggaran berulang",
  );
  // Jeda TAMBAHAN (di atas 350ms internal approveAllPendingStages) —
  // CapaEffectivenessVerificationWorkflowCompletionListener melakukan
  // LEBIH banyak langkah async berantai (markEffectivenessVerificationApproved
  // + syncClosureToSourceModule verify()+close() + notifyEffectiveClosed)
  // drpd listener 1-langkah biasa, pola sama sleep(500) (bukan 300ms
  // standar) dipakai integration-spec.ts modul ini utk kasus serupa.
  await new Promise((r) => setTimeout(r, 500));
  await tenantContextStorage.run({ tenantId: ctx.tenantId, userId: hseManager.id }, () => app.get(AuditService).close(finding1a.auditId));

  // 3. CAPA manual (MANAGEMENT_REVIEW) — siklus pertama NOT_EFFECTIVE->
  // NOT_EFFECTIVE_REOPENED (BR-04), siklus kedua (root cause BARU) ->
  // EFFECTIVE_CLOSED.
  const capaReopen = await run(hseManager.id, () =>
    capaRegisterService.create({
      sourceType: "MANAGEMENT_REVIEW",
      category: "PREVENTIVE",
      priority: "MEDIUM",
      title: "Tindak lanjut Management Review Q2 2027 — housekeeping gudang berulang",
      problemStatement: "Rapat tinjauan manajemen mengidentifikasi housekeeping gudang jadi temuan berulang 3 bulan terakhir",
      siteId: ctx.siteIdHq,
    }),
  );
  await driveActionPlanToInProgress(
    app,
    adminPrisma,
    ctx,
    capaReopen.id,
    hseManager.id,
    worker2.id,
    "Jadwalkan piket housekeeping mingguan",
    "Tidak ada penanggung jawab tetap utk housekeeping gudang",
    daysFromNow(14),
  );
  await driveEffectivenessToOutcome(
    app,
    adminPrisma,
    ctx,
    capaReopen.id,
    hseManager.id,
    departmentHead.id,
    "NOT_EFFECTIVE",
    "Observasi 30 hari: housekeeping masih belum konsisten, jadwal piket sering terlewat",
  );
  await driveActionPlanToInProgress(
    app,
    adminPrisma,
    ctx,
    capaReopen.id,
    hseManager.id,
    worker2.id,
    "Pasang checklist harian + eskalasi otomatis ke supervisor jika piket terlewat",
    "Root cause revisi: piket berjalan tanpa mekanisme kontrol/eskalasi",
    daysFromNow(14),
  );
  await driveEffectivenessToOutcome(
    app,
    adminPrisma,
    ctx,
    capaReopen.id,
    hseManager.id,
    departmentHead.id,
    "EFFECTIVE",
    "Observasi 30 hari siklus kedua: housekeeping konsisten dgn checklist harian",
  );

  // 4. CAPA manual (OTHER) — dibiarkan DRAFT, initiated_at dibackdate spy
  // root-cause-sla-scan (>=7 hari) genuinely menemukannya.
  const capaOverdue = await run(hseManager.id, () =>
    capaRegisterService.create({
      sourceType: "OTHER",
      category: "CORRECTIVE",
      priority: "HIGH",
      title: "Tindak lanjut komplain pelanggan keterlambatan pengiriman",
      problemStatement: "Komplain berulang dari pelanggan terkait keterlambatan pengiriman produk 2 bulan terakhir",
      siteId: ctx.siteIdBalikpapan,
    }),
  );
  await adminPrisma.capaRegister.update({ where: { id: capaOverdue.id }, data: { initiatedAt: daysAgo(10) } });

  await rootCauseSlaScanService.scan();
  await effectivenessDueScanService.scan();

  // eslint-disable-next-line no-console
  console.log(
    "  CAPA Management: CAPA insiden+audit finding ditutup penuh EFFECTIVE_CLOSED, CAPA Management Review siklus NOT_EFFECTIVE->REOPENED->EFFECTIVE_CLOSED (BR-04), CAPA OTHER DRAFT root-cause SLA overdue.",
  );
}
