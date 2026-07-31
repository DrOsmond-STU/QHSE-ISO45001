// Data demo Calibration Management (Modul 16, task 6.2) — 1 kategori aset
// baru "Instrumentasi & Alat Ukur" + 5 aset instrumen (gas detector kritis,
// pressure gauge, thermometer, timbangan, multimeter), 3 provider (internal
// lab, eksternal terakreditasi valid, eksternal akreditasi MENDEKATI habis
// utk demo H-60), 6 item kalibrasi. Sertifikat: FAIL->auto-OOT->assessImpact
// (BR-06 OR-rule)->link CAPA (sourceType CALIBRATION_OOT)->close (BR-07),
// PASS->submit->approve->REVIEWED+jadwal berikut otomatis, akreditasi
// KADALUARSA->BR-05 gate->override justifikasi->ISSUED (dibiarkan belum
// direview). 2 jadwal murni utk calibration-due-scan (due-soon H-30/14/7 +
// overdue BR-09) dipanggil di akhir bersama warning akreditasi provider.
import { INestApplicationContext } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AssetCategoryService } from "../../src/modules/domains/asset-equipment/asset-category.service";
import { AssetService } from "../../src/modules/domains/asset-equipment/asset.service";
import { CapaRegisterService } from "../../src/modules/domains/capa/capa-register.service";
import { CalibrationCertificateService } from "../../src/modules/domains/calibration/calibration-certificate.service";
import { CalibrationDueScanService } from "../../src/modules/domains/calibration/calibration-due-scan.service";
import { CalibrationItemService } from "../../src/modules/domains/calibration/calibration-item.service";
import { CalibrationProviderService } from "../../src/modules/domains/calibration/calibration-provider.service";
import { CalibrationScheduleService } from "../../src/modules/domains/calibration/calibration-schedule.service";
import { OutOfToleranceRecordService } from "../../src/modules/domains/calibration/out-of-tolerance-record.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { actor, daysAgo, daysFromNow, DemoContext } from "./context";
import { approveAllPendingStages } from "./shared";

export async function seedCalibration(app: INestApplicationContext, adminPrisma: PrismaClient, ctx: DemoContext): Promise<void> {
  const assetCategoryService = app.get(AssetCategoryService);
  const assetService = app.get(AssetService);
  const itemService = app.get(CalibrationItemService);
  const providerService = app.get(CalibrationProviderService);
  const scheduleService = app.get(CalibrationScheduleService);
  const certificateService = app.get(CalibrationCertificateService);
  const ootService = app.get(OutOfToleranceRecordService);
  const scanService = app.get(CalibrationDueScanService);
  const capaRegisterService = app.get(CapaRegisterService);

  const coordinator = actor(ctx, "QC_INSPECTOR"); // proxy "Calibration Coordinator".
  const run = <T>(userId: string, fn: () => Promise<T>) => tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);

  const categoryInstrument = await run(coordinator.id, () =>
    assetCategoryService.create({ categoryName: "Instrumentasi & Alat Ukur", defaultIsSafetyCritical: false, requiresDisposalApproval: false }),
  );

  const assetGasDetector = await run(coordinator.id, () =>
    assetService.create({
      siteId: ctx.siteIdCepu,
      assetCategoryId: categoryInstrument.id,
      assetName: "Gas Detector Portable MSA Altair 4X",
      manufacturer: "MSA",
      modelNumber: "Altair 4X",
      serialNumber: "GD-2024-0012",
      isSafetyCritical: true,
    }),
  );
  const assetPressureGauge = await run(coordinator.id, () =>
    assetService.create({ siteId: ctx.siteIdCepu, assetCategoryId: categoryInstrument.id, assetName: "Pressure Gauge Kompressor Utama", manufacturer: "WIKA" }),
  );
  const assetThermometer = await run(coordinator.id, () =>
    assetService.create({ siteId: ctx.siteIdBalikpapan, assetCategoryId: categoryInstrument.id, assetName: "Thermometer Digital Cold Storage", manufacturer: "Fluke" }),
  );

  const providerInternal = await run(coordinator.id, () => providerService.create({ providerName: "Lab Kalibrasi Internal PNS", providerType: "INTERNAL_LAB" }));
  const providerExternal = await run(coordinator.id, () =>
    providerService.create({ providerName: "PT Kalibrasi Nasional Indonesia", providerType: "EXTERNAL_LAB", accreditationBody: "KAN", accreditationValidUntil: daysFromNow(200) }),
  );
  const providerExpiredAccred = await run(coordinator.id, () =>
    providerService.create({ providerName: "Lab Kalibrasi Kadaluarsa", providerType: "EXTERNAL_LAB", accreditationBody: "KAN", accreditationValidUntil: daysAgo(60) }),
  );

  const item1 = await run(coordinator.id, () =>
    itemService.create({ assetId: assetGasDetector.id, measurementParameter: "Konsentrasi Gas (LEL/O2/H2S/CO)", calibrationIntervalMonths: 12 }),
  );
  const item2 = await run(coordinator.id, () => itemService.create({ assetId: assetPressureGauge.id, measurementParameter: "Tekanan", calibrationIntervalMonths: 12 }));
  const item3 = await run(coordinator.id, () => itemService.create({ assetId: assetThermometer.id, measurementParameter: "Suhu", calibrationIntervalMonths: 6 }));

  // 1. Item kritis (gas detector) — hasil FAIL -> auto-OOT (BR-06 requiresCapa
  // true krn is_critical_measurement) -> assessImpact (OR-rule) -> link CAPA
  // -> CLOSED (BR-07). Sertifikat-nya SENDIRI tetap diajukan+direview normal,
  // jadwal re-kalibrasi susulan dibuat manual (PASS-only auto-schedule tidak berlaku utk FAIL).
  const cert1 = await run(coordinator.id, () =>
    certificateService.create({
      calibrationItemId: item1.id,
      certificateNo: `CERT-${randomUUID().slice(0, 8).toUpperCase()}`,
      calibrationProviderId: providerInternal.id,
      calibrationDate: daysAgo(20),
      calibrationResult: "FAIL",
    }),
  );
  const oot1 = await adminPrisma.outOfToleranceRecord.findFirstOrThrow({ where: { calibrationCertificateId: cert1.id } });
  const oot1Assessed = await run(coordinator.id, () =>
    ootService.assessImpact(oot1.id, { impactLevel: "HIGH", potentialImpactAssessment: "Berpotensi gagal deteksi gas berbahaya saat entry ruang terbatas" }),
  );
  const capaOot1 = await run(coordinator.id, () =>
    capaRegisterService.create({
      sourceType: "CALIBRATION_OOT",
      sourceId: oot1Assessed.id,
      category: "CORRECTIVE",
      priority: "HIGH",
      title: "Kalibrasi ulang & investigasi gas detector out-of-tolerance",
      problemStatement: "Hasil kalibrasi gas detector FAIL, berpotensi mempengaruhi keselamatan entry ruang terbatas",
      siteId: ctx.siteIdCepu,
    }),
  );
  await run(coordinator.id, () => ootService.linkCapaRegister(oot1Assessed.id, capaOot1.id));
  await run(coordinator.id, () => ootService.close(oot1Assessed.id));
  const cert1Issued = await run(coordinator.id, () => certificateService.submitForReview(cert1.id));
  await approveAllPendingStages(app, adminPrisma, ctx.tenantId, cert1Issued.workflowInstanceId!);
  await run(coordinator.id, () => scheduleService.create({ calibrationItemId: item1.id, dueDate: daysFromNow(14) }));

  // 2. Item bersih (pressure gauge) — PASS -> submit -> approve -> REVIEWED
  // + jadwal berikutnya otomatis.
  const cert2 = await run(coordinator.id, () =>
    certificateService.create({
      calibrationItemId: item2.id,
      certificateNo: `CERT-${randomUUID().slice(0, 8).toUpperCase()}`,
      calibrationProviderId: providerExternal.id,
      calibrationDate: daysAgo(30),
      calibrationResult: "PASS",
    }),
  );
  const cert2Issued = await run(coordinator.id, () => certificateService.submitForReview(cert2.id));
  await approveAllPendingStages(app, adminPrisma, ctx.tenantId, cert2Issued.workflowInstanceId!);

  // 3. Item (thermometer) — provider akreditasi SUDAH lewat pada calibration_date
  // (BR-05) -> submitForReview() wajib override justifikasi -> ISSUED
  // (dibiarkan belum direview, item terbuka).
  const cert3 = await run(coordinator.id, () =>
    certificateService.create({
      calibrationItemId: item3.id,
      certificateNo: `CERT-${randomUUID().slice(0, 8).toUpperCase()}`,
      calibrationProviderId: providerExpiredAccred.id,
      calibrationDate: daysAgo(10),
      calibrationResult: "PASS",
    }),
  );
  await run(coordinator.id, () =>
    certificateService.submitForReview(cert3.id, "Kondisi darurat operasional — override disetujui Coordinator, lab alternatif belum tersedia"),
  );

  // 4-5. Aset+item khusus utk calibration-due-scan (due-soon H-7/14/30 catch-up + overdue BR-09).
  const assetScale = await run(coordinator.id, () => assetService.create({ siteId: ctx.siteIdCepu, assetCategoryId: categoryInstrument.id, assetName: "Timbangan Digital Gudang B3" }));
  const item4 = await run(coordinator.id, () => itemService.create({ assetId: assetScale.id, measurementParameter: "Berat", calibrationIntervalMonths: 12 }));
  await run(coordinator.id, () => scheduleService.create({ calibrationItemId: item4.id, dueDate: daysFromNow(5) }));

  const assetMultimeter = await run(coordinator.id, () => assetService.create({ siteId: ctx.siteIdCepu, assetCategoryId: categoryInstrument.id, assetName: "Multimeter Digital Panel Listrik" }));
  const item5 = await run(coordinator.id, () => itemService.create({ assetId: assetMultimeter.id, measurementParameter: "Tegangan & Arus", calibrationIntervalMonths: 12 }));
  await run(coordinator.id, () => scheduleService.create({ calibrationItemId: item5.id, dueDate: daysAgo(3) }));

  // Provider akreditasi mendekati habis (H-60) — reuse providerExternal-style baru.
  await run(coordinator.id, () =>
    providerService.create({ providerName: "CV Kalibrasi Mitra Teknik", providerType: "EXTERNAL_LAB", accreditationBody: "KAN", accreditationValidUntil: daysFromNow(30) }),
  );

  await scanService.scan();

  // eslint-disable-next-line no-console
  console.log(
    "  Calibration Management: 5 instrumen, 3 provider (internal, eksternal valid, eksternal H-60), 5 item kalibrasi — FAIL->OOT->CAPA->CLOSED, PASS->REVIEWED+jadwal otomatis, akreditasi kadaluarsa->override ISSUED, due-soon+overdue via scan.",
  );
}
