"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedCalibration = seedCalibration;
const node_crypto_1 = require("node:crypto");
const asset_category_service_1 = require("../../src/modules/domains/asset-equipment/asset-category.service");
const asset_service_1 = require("../../src/modules/domains/asset-equipment/asset.service");
const capa_register_service_1 = require("../../src/modules/domains/capa/capa-register.service");
const calibration_certificate_service_1 = require("../../src/modules/domains/calibration/calibration-certificate.service");
const calibration_due_scan_service_1 = require("../../src/modules/domains/calibration/calibration-due-scan.service");
const calibration_item_service_1 = require("../../src/modules/domains/calibration/calibration-item.service");
const calibration_provider_service_1 = require("../../src/modules/domains/calibration/calibration-provider.service");
const calibration_schedule_service_1 = require("../../src/modules/domains/calibration/calibration-schedule.service");
const out_of_tolerance_record_service_1 = require("../../src/modules/domains/calibration/out-of-tolerance-record.service");
const tenant_context_1 = require("../../src/platform/tenancy/tenant-context");
const context_1 = require("./context");
const shared_1 = require("./shared");
async function seedCalibration(app, adminPrisma, ctx) {
    const assetCategoryService = app.get(asset_category_service_1.AssetCategoryService);
    const assetService = app.get(asset_service_1.AssetService);
    const itemService = app.get(calibration_item_service_1.CalibrationItemService);
    const providerService = app.get(calibration_provider_service_1.CalibrationProviderService);
    const scheduleService = app.get(calibration_schedule_service_1.CalibrationScheduleService);
    const certificateService = app.get(calibration_certificate_service_1.CalibrationCertificateService);
    const ootService = app.get(out_of_tolerance_record_service_1.OutOfToleranceRecordService);
    const scanService = app.get(calibration_due_scan_service_1.CalibrationDueScanService);
    const capaRegisterService = app.get(capa_register_service_1.CapaRegisterService);
    const coordinator = (0, context_1.actor)(ctx, "QC_INSPECTOR"); // proxy "Calibration Coordinator".
    const run = (userId, fn) => tenant_context_1.tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);
    const categoryInstrument = await run(coordinator.id, () => assetCategoryService.create({ categoryName: "Instrumentasi & Alat Ukur", defaultIsSafetyCritical: false, requiresDisposalApproval: false }));
    const assetGasDetector = await run(coordinator.id, () => assetService.create({
        siteId: ctx.siteIdCepu,
        assetCategoryId: categoryInstrument.id,
        assetName: "Gas Detector Portable MSA Altair 4X",
        manufacturer: "MSA",
        modelNumber: "Altair 4X",
        serialNumber: "GD-2024-0012",
        isSafetyCritical: true,
    }));
    const assetPressureGauge = await run(coordinator.id, () => assetService.create({ siteId: ctx.siteIdCepu, assetCategoryId: categoryInstrument.id, assetName: "Pressure Gauge Kompressor Utama", manufacturer: "WIKA" }));
    const assetThermometer = await run(coordinator.id, () => assetService.create({ siteId: ctx.siteIdBalikpapan, assetCategoryId: categoryInstrument.id, assetName: "Thermometer Digital Cold Storage", manufacturer: "Fluke" }));
    const providerInternal = await run(coordinator.id, () => providerService.create({ providerName: "Lab Kalibrasi Internal PNS", providerType: "INTERNAL_LAB" }));
    const providerExternal = await run(coordinator.id, () => providerService.create({ providerName: "PT Kalibrasi Nasional Indonesia", providerType: "EXTERNAL_LAB", accreditationBody: "KAN", accreditationValidUntil: (0, context_1.daysFromNow)(200) }));
    const providerExpiredAccred = await run(coordinator.id, () => providerService.create({ providerName: "Lab Kalibrasi Kadaluarsa", providerType: "EXTERNAL_LAB", accreditationBody: "KAN", accreditationValidUntil: (0, context_1.daysAgo)(60) }));
    const item1 = await run(coordinator.id, () => itemService.create({ assetId: assetGasDetector.id, measurementParameter: "Konsentrasi Gas (LEL/O2/H2S/CO)", calibrationIntervalMonths: 12 }));
    const item2 = await run(coordinator.id, () => itemService.create({ assetId: assetPressureGauge.id, measurementParameter: "Tekanan", calibrationIntervalMonths: 12 }));
    const item3 = await run(coordinator.id, () => itemService.create({ assetId: assetThermometer.id, measurementParameter: "Suhu", calibrationIntervalMonths: 6 }));
    // 1. Item kritis (gas detector) — hasil FAIL -> auto-OOT (BR-06 requiresCapa
    // true krn is_critical_measurement) -> assessImpact (OR-rule) -> link CAPA
    // -> CLOSED (BR-07). Sertifikat-nya SENDIRI tetap diajukan+direview normal,
    // jadwal re-kalibrasi susulan dibuat manual (PASS-only auto-schedule tidak berlaku utk FAIL).
    const cert1 = await run(coordinator.id, () => certificateService.create({
        calibrationItemId: item1.id,
        certificateNo: `CERT-${(0, node_crypto_1.randomUUID)().slice(0, 8).toUpperCase()}`,
        calibrationProviderId: providerInternal.id,
        calibrationDate: (0, context_1.daysAgo)(20),
        calibrationResult: "FAIL",
    }));
    const oot1 = await adminPrisma.outOfToleranceRecord.findFirstOrThrow({ where: { calibrationCertificateId: cert1.id } });
    const oot1Assessed = await run(coordinator.id, () => ootService.assessImpact(oot1.id, { impactLevel: "HIGH", potentialImpactAssessment: "Berpotensi gagal deteksi gas berbahaya saat entry ruang terbatas" }));
    const capaOot1 = await run(coordinator.id, () => capaRegisterService.create({
        sourceType: "CALIBRATION_OOT",
        sourceId: oot1Assessed.id,
        category: "CORRECTIVE",
        priority: "HIGH",
        title: "Kalibrasi ulang & investigasi gas detector out-of-tolerance",
        problemStatement: "Hasil kalibrasi gas detector FAIL, berpotensi mempengaruhi keselamatan entry ruang terbatas",
        siteId: ctx.siteIdCepu,
    }));
    await run(coordinator.id, () => ootService.linkCapaRegister(oot1Assessed.id, capaOot1.id));
    await run(coordinator.id, () => ootService.close(oot1Assessed.id));
    const cert1Issued = await run(coordinator.id, () => certificateService.submitForReview(cert1.id));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, cert1Issued.workflowInstanceId);
    await run(coordinator.id, () => scheduleService.create({ calibrationItemId: item1.id, dueDate: (0, context_1.daysFromNow)(14) }));
    // 2. Item bersih (pressure gauge) — PASS -> submit -> approve -> REVIEWED
    // + jadwal berikutnya otomatis.
    const cert2 = await run(coordinator.id, () => certificateService.create({
        calibrationItemId: item2.id,
        certificateNo: `CERT-${(0, node_crypto_1.randomUUID)().slice(0, 8).toUpperCase()}`,
        calibrationProviderId: providerExternal.id,
        calibrationDate: (0, context_1.daysAgo)(30),
        calibrationResult: "PASS",
    }));
    const cert2Issued = await run(coordinator.id, () => certificateService.submitForReview(cert2.id));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, cert2Issued.workflowInstanceId);
    // 3. Item (thermometer) — provider akreditasi SUDAH lewat pada calibration_date
    // (BR-05) -> submitForReview() wajib override justifikasi -> ISSUED
    // (dibiarkan belum direview, item terbuka).
    const cert3 = await run(coordinator.id, () => certificateService.create({
        calibrationItemId: item3.id,
        certificateNo: `CERT-${(0, node_crypto_1.randomUUID)().slice(0, 8).toUpperCase()}`,
        calibrationProviderId: providerExpiredAccred.id,
        calibrationDate: (0, context_1.daysAgo)(10),
        calibrationResult: "PASS",
    }));
    await run(coordinator.id, () => certificateService.submitForReview(cert3.id, "Kondisi darurat operasional — override disetujui Coordinator, lab alternatif belum tersedia"));
    // 4-5. Aset+item khusus utk calibration-due-scan (due-soon H-7/14/30 catch-up + overdue BR-09).
    const assetScale = await run(coordinator.id, () => assetService.create({ siteId: ctx.siteIdCepu, assetCategoryId: categoryInstrument.id, assetName: "Timbangan Digital Gudang B3" }));
    const item4 = await run(coordinator.id, () => itemService.create({ assetId: assetScale.id, measurementParameter: "Berat", calibrationIntervalMonths: 12 }));
    await run(coordinator.id, () => scheduleService.create({ calibrationItemId: item4.id, dueDate: (0, context_1.daysFromNow)(5) }));
    const assetMultimeter = await run(coordinator.id, () => assetService.create({ siteId: ctx.siteIdCepu, assetCategoryId: categoryInstrument.id, assetName: "Multimeter Digital Panel Listrik" }));
    const item5 = await run(coordinator.id, () => itemService.create({ assetId: assetMultimeter.id, measurementParameter: "Tegangan & Arus", calibrationIntervalMonths: 12 }));
    await run(coordinator.id, () => scheduleService.create({ calibrationItemId: item5.id, dueDate: (0, context_1.daysAgo)(3) }));
    // Provider akreditasi mendekati habis (H-60) — reuse providerExternal-style baru.
    await run(coordinator.id, () => providerService.create({ providerName: "CV Kalibrasi Mitra Teknik", providerType: "EXTERNAL_LAB", accreditationBody: "KAN", accreditationValidUntil: (0, context_1.daysFromNow)(30) }));
    await scanService.scan();
    // eslint-disable-next-line no-console
    console.log("  Calibration Management: 5 instrumen, 3 provider (internal, eksternal valid, eksternal H-60), 5 item kalibrasi — FAIL->OOT->CAPA->CLOSED, PASS->REVIEWED+jadwal otomatis, akreditasi kadaluarsa->override ISSUED, due-soon+overdue via scan.");
}
