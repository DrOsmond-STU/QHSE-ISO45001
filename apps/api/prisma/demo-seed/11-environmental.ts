// Data demo Environmental Management (Modul 12, task 5.2) — 2 Aspect Impact
// (SIGNIFICANT+existingControls siklus penuh 2-stage->ACTIVE, NOT_SIGNIFICANT
// dibiarkan DRAFT), 2 Monitoring Record (EXCEED->auto-CAPA via event stub
// BR-02, COMPLIANT->VERIFIED dgn lampiran lab riil BR-07), Waste Generation
// Log + Manifest (siklus 7-tahap penuh sampai COMPLETED+Festronik, +1 log
// dibackdate utk H-7 storage-duration warning BR-03), PROPER Self-Assessment
// (2 kriteria->skor terbobot auto-calc->override rating BR-06->2-stage
// workflow->submit KLHK->hasil resmi diterima), Environmental Permit (1:1
// ekstensi licenses_permits BARU BR-05). approveAllPendingStages() generik
// dipakai utk KEDUA workflow modul ini (aspect review, PROPER assessment).
import { INestApplicationContext } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { EnvironmentalAspectImpactService } from "../../src/modules/domains/environmental/environmental-aspect-impact.service";
import { EnvironmentalMonitoringRecordService } from "../../src/modules/domains/environmental/environmental-monitoring-record.service";
import { EnvironmentalPermitService } from "../../src/modules/domains/environmental/environmental-permit.service";
import { ProperSelfAssessmentService } from "../../src/modules/domains/environmental/proper-self-assessment.service";
import { WasteGenerationLogService } from "../../src/modules/domains/environmental/waste-generation-log.service";
import { WasteManifestService } from "../../src/modules/domains/environmental/waste-manifest.service";
import { WasteStorageDurationScanService } from "../../src/modules/domains/environmental/waste-storage-duration-scan.service";
import { LicensePermitService } from "../../src/modules/domains/regulatory-compliance/license-permit.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { actor, daysAgo, DemoContext } from "./context";
import { approveAllPendingStages, uploadDemoFile } from "./shared";

export async function seedEnvironmental(app: INestApplicationContext, adminPrisma: PrismaClient, ctx: DemoContext): Promise<void> {
  const aspectImpactService = app.get(EnvironmentalAspectImpactService);
  const monitoringRecordService = app.get(EnvironmentalMonitoringRecordService);
  const wasteGenerationLogService = app.get(WasteGenerationLogService);
  const wasteManifestService = app.get(WasteManifestService);
  const wasteStorageDurationScanService = app.get(WasteStorageDurationScanService);
  const properSelfAssessmentService = app.get(ProperSelfAssessmentService);
  const environmentalPermitService = app.get(EnvironmentalPermitService);
  const licensePermitService = app.get(LicensePermitService);

  const envOfficer = actor(ctx, "ENVIRONMENTAL_OFFICER");
  const hseManager = actor(ctx, "HSE_MANAGER");
  const tpsOfficer = actor(ctx, "TPS_LB3_OFFICER");
  const companyAdmin = actor(ctx, "COMPANY_ADMIN");
  const run = <T>(userId: string, fn: () => Promise<T>) => tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);

  // 1. Aspect Impact SIGNIFICANT dgn existing_controls — siklus penuh 2-stage -> ACTIVE.
  const aspect1 = await run(envOfficer.id, () =>
    aspectImpactService.create({
      companyId: ctx.companyId,
      siteId: ctx.siteIdCepu,
      conditionType: "NORMAL",
      activityProcessArea: "Genset diesel darurat",
      environmentalAspect: "Emisi udara dari genset diesel",
      environmentalImpact: "Penurunan kualitas udara ambien",
      impactType: "AIR",
      scores: { likelihoodScore: 5, severityScore: 5, frequencyScore: 4, regulatoryScore: 4, stakeholderConcernScore: 4 },
      existingControls: "Filter udara terpasang, jadwal maintenance rutin",
    }),
  );
  const aspect1Submitted = await run(envOfficer.id, () => aspectImpactService.submitForReview(aspect1.id));
  await approveAllPendingStages(app, adminPrisma, ctx.tenantId, aspect1Submitted.workflowInstanceId!);

  // 2. Aspect Impact NOT_SIGNIFICANT — dibiarkan DRAFT.
  await run(envOfficer.id, () =>
    aspectImpactService.create({
      companyId: ctx.companyId,
      siteId: ctx.siteIdHq,
      conditionType: "NORMAL",
      activityProcessArea: "Penggunaan AC kantor",
      environmentalAspect: "Konsumsi listrik AC",
      environmentalImpact: "Peningkatan jejak karbon tidak langsung",
      impactType: "RESOURCE_CONSUMPTION",
      scores: { likelihoodScore: 2, severityScore: 2, frequencyScore: 2, regulatoryScore: 1, stakeholderConcernScore: 1 },
    }),
  );

  // 3. Monitoring EXCEED -> auto-CAPA (BR-02, event stub async).
  await run(envOfficer.id, () =>
    monitoringRecordService.create({
      siteId: ctx.siteIdCepu,
      monitoringType: "AIR_EMISSION",
      monitoringPointCode: "CEROBONG-01",
      monitoringPointName: "Cerobong Genset Darurat",
      parameterName: "SO2",
      unitOfMeasure: "mg/Nm3",
      resultValue: 800,
      bakuMutuMin: 0,
      bakuMutuMax: 500,
      samplingDate: daysAgo(5),
    }),
  );
  await new Promise((r) => setTimeout(r, 500)); // EnvironmentalMonitoringCapaTriggerListener async.

  // 4. Monitoring COMPLIANT -> VERIFIED dgn lampiran lab riil (BR-07).
  const monitoring2 = await run(envOfficer.id, () =>
    monitoringRecordService.create({
      siteId: ctx.siteIdCepu,
      monitoringType: "WASTEWATER_EFFLUENT",
      monitoringPointCode: "IPAL-OUT",
      monitoringPointName: "Outlet IPAL",
      parameterName: "COD",
      unitOfMeasure: "mg/L",
      resultValue: 80,
      bakuMutuMax: 100,
      samplingDate: daysAgo(3),
    }),
  );
  await uploadDemoFile(app, ctx.tenantId, envOfficer.id, {
    entityType: "environmental_monitoring_record",
    entityId: monitoring2.id,
    fileName: "lab-report-cod-ipal.pdf",
  });
  await run(envOfficer.id, () => monitoringRecordService.verify(monitoring2.id));

  // 5. Waste — log->manifest tertaut->siklus 7-tahap penuh->COMPLETED+Festronik.
  const log1 = await run(tpsOfficer.id, () =>
    wasteGenerationLogService.create({
      siteId: ctx.siteIdCepu,
      logDate: daysAgo(10),
      wasteCode: "A102d",
      wasteName: "Oli bekas",
      wasteType: "HAZARDOUS_B3",
      quantityGenerated: 200,
      unitOfMeasure: "KG",
      storageLocation: "TPS LB3 Blok A",
    }),
  );
  const manifest1 = await run(tpsOfficer.id, () =>
    wasteManifestService.create({
      siteId: ctx.siteIdCepu,
      wasteType: "HAZARDOUS_B3",
      wasteCode: "A102d",
      wasteName: "Oli bekas",
      quantity: 200,
      unitOfMeasure: "KG",
      packagingType: "DRUM",
      generationDate: daysAgo(10),
      linkedGenerationLogIds: [log1.id],
    }),
  );
  await run(tpsOfficer.id, () => wasteManifestService.issue(manifest1.id));
  await run(tpsOfficer.id, () =>
    wasteManifestService.markInTransit(manifest1.id, {
      transporterName: "PT Angkut Aman Sentosa",
      transporterLicenseNo: "TRANS-2026-001",
      transporterVehicleNo: "B 9012 XYZ",
      transportDate: daysAgo(8),
    }),
  );
  await run(tpsOfficer.id, () => wasteManifestService.markReceivedByTransporter(manifest1.id));
  await run(tpsOfficer.id, () =>
    wasteManifestService.markReceivedByProcessor(manifest1.id, {
      destinationFacilityName: "PT Pengolah Limbah Industri",
      destinationFacilityLicenseNo: "PROC-2026-045",
      receivingConfirmationDate: daysAgo(5),
    }),
  );
  await run(tpsOfficer.id, () => wasteManifestService.complete(manifest1.id));
  await run(tpsOfficer.id, () =>
    wasteManifestService.recordFestronikNumber(manifest1.id, `FTR-2026-${randomUUID().slice(0, 8).toUpperCase()}`),
  );

  // 6. Waste — log dibackdate spy waste-storage-duration-scan (H-7, BR-03)
  // genuinely menemukannya (dipanggil di akhir).
  const storageStart = daysAgo(84);
  await run(tpsOfficer.id, () =>
    wasteGenerationLogService.create({
      siteId: ctx.siteIdCepu,
      logDate: storageStart,
      wasteCode: "B105d",
      wasteName: "Majun terkontaminasi",
      wasteType: "HAZARDOUS_B3",
      quantityGenerated: 15,
      unitOfMeasure: "KG",
      storageLocation: "TPS LB3 Blok B",
      storageStartDate: storageStart,
      maxStorageDurationDays: 90,
    }),
  );

  // 7. PROPER Self-Assessment — 2 kriteria->skor terbobot->override BR-06->
  // 2-stage->submit KLHK->hasil resmi.
  const assessment1 = await run(hseManager.id, () =>
    properSelfAssessmentService.create({
      companyId: ctx.companyId,
      siteId: ctx.siteIdCepu,
      assessmentPeriod: "2026",
      assessmentType: "INTERNAL_SELF_ASSESSMENT",
      assessmentDate: daysAgo(30),
    }),
  );
  await run(hseManager.id, () =>
    properSelfAssessmentService.recordCriteriaScore(assessment1.id, {
      criteriaCategory: "AIR_POLLUTION_CONTROL",
      criteriaDescription: "Pengendalian emisi udara",
      complianceStatus: "FULLY_COMPLIANT",
      scoreValue: 90,
      weightPercentage: 50,
    }),
  );
  await run(hseManager.id, () =>
    properSelfAssessmentService.recordCriteriaScore(assessment1.id, {
      criteriaCategory: "HAZARDOUS_WASTE_MANAGEMENT",
      criteriaDescription: "Tata kelola limbah B3",
      complianceStatus: "PARTIALLY_COMPLIANT",
      scoreValue: 70,
      weightPercentage: 50,
    }),
  );
  await run(hseManager.id, () =>
    properSelfAssessmentService.overrideRating(assessment1.id, "HIJAU", "Data sampling terbaru kuartal ini belum masuk sistem"),
  );
  const assessment1Submitted = await run(hseManager.id, () => properSelfAssessmentService.submitForInternalReview(assessment1.id));
  await approveAllPendingStages(app, adminPrisma, ctx.tenantId, assessment1Submitted.workflowInstanceId!);
  await run(hseManager.id, () => properSelfAssessmentService.submitToKlhk(assessment1.id));
  await run(hseManager.id, () => properSelfAssessmentService.recordOfficialResult(assessment1.id, "HIJAU"));

  // 8. Environmental Permit — 1:1 ekstensi licenses_permits BARU (BR-05).
  const license1 = await run(envOfficer.id, () =>
    licensePermitService.create({
      licenseNumber: "IPLC-CEPU-001",
      licenseName: "Izin Pembuangan Limbah Cair Site Cepu",
      licenseType: "ENVIRONMENTAL_PERMIT",
      holderType: "SITE",
      holderReferenceId: ctx.siteIdCepu,
      issueDate: new Date("2024-01-01"),
      expiryDate: new Date("2027-01-01"),
    }),
  );
  await run(envOfficer.id, () =>
    environmentalPermitService.create({
      licensePermitId: license1.id,
      permitMedia: "WASTEWATER",
      requiredMonitoringFrequency: "MONTHLY",
      reportingObligationTo: "DLH Kabupaten Blora",
    }),
  );

  await wasteStorageDurationScanService.scan();

  // eslint-disable-next-line no-console
  console.log(
    "  Environmental Management: 2 aspect impact (SIGNIFICANT ACTIVE, NOT_SIGNIFICANT DRAFT), 2 monitoring (EXCEED auto-CAPA, COMPLIANT VERIFIED+lampiran), waste manifest siklus 7-tahap+Festronik + 1 storage H-7 warning, PROPER assessment lengkap sampai hasil KLHK, 1 environmental permit.",
  );
}
