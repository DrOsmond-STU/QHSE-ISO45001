"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedEnvironmental = seedEnvironmental;
const node_crypto_1 = require("node:crypto");
const environmental_aspect_impact_service_1 = require("../../src/modules/domains/environmental/environmental-aspect-impact.service");
const environmental_monitoring_record_service_1 = require("../../src/modules/domains/environmental/environmental-monitoring-record.service");
const environmental_permit_service_1 = require("../../src/modules/domains/environmental/environmental-permit.service");
const proper_self_assessment_service_1 = require("../../src/modules/domains/environmental/proper-self-assessment.service");
const waste_generation_log_service_1 = require("../../src/modules/domains/environmental/waste-generation-log.service");
const waste_manifest_service_1 = require("../../src/modules/domains/environmental/waste-manifest.service");
const waste_storage_duration_scan_service_1 = require("../../src/modules/domains/environmental/waste-storage-duration-scan.service");
const license_permit_service_1 = require("../../src/modules/domains/regulatory-compliance/license-permit.service");
const tenant_context_1 = require("../../src/platform/tenancy/tenant-context");
const context_1 = require("./context");
const shared_1 = require("./shared");
async function seedEnvironmental(app, adminPrisma, ctx) {
    const aspectImpactService = app.get(environmental_aspect_impact_service_1.EnvironmentalAspectImpactService);
    const monitoringRecordService = app.get(environmental_monitoring_record_service_1.EnvironmentalMonitoringRecordService);
    const wasteGenerationLogService = app.get(waste_generation_log_service_1.WasteGenerationLogService);
    const wasteManifestService = app.get(waste_manifest_service_1.WasteManifestService);
    const wasteStorageDurationScanService = app.get(waste_storage_duration_scan_service_1.WasteStorageDurationScanService);
    const properSelfAssessmentService = app.get(proper_self_assessment_service_1.ProperSelfAssessmentService);
    const environmentalPermitService = app.get(environmental_permit_service_1.EnvironmentalPermitService);
    const licensePermitService = app.get(license_permit_service_1.LicensePermitService);
    const envOfficer = (0, context_1.actor)(ctx, "ENVIRONMENTAL_OFFICER");
    const hseManager = (0, context_1.actor)(ctx, "HSE_MANAGER");
    const tpsOfficer = (0, context_1.actor)(ctx, "TPS_LB3_OFFICER");
    const companyAdmin = (0, context_1.actor)(ctx, "COMPANY_ADMIN");
    const run = (userId, fn) => tenant_context_1.tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);
    // 1. Aspect Impact SIGNIFICANT dgn existing_controls — siklus penuh 2-stage -> ACTIVE.
    const aspect1 = await run(envOfficer.id, () => aspectImpactService.create({
        companyId: ctx.companyId,
        siteId: ctx.siteIdCepu,
        conditionType: "NORMAL",
        activityProcessArea: "Genset diesel darurat",
        environmentalAspect: "Emisi udara dari genset diesel",
        environmentalImpact: "Penurunan kualitas udara ambien",
        impactType: "AIR",
        scores: { likelihoodScore: 5, severityScore: 5, frequencyScore: 4, regulatoryScore: 4, stakeholderConcernScore: 4 },
        existingControls: "Filter udara terpasang, jadwal maintenance rutin",
    }));
    const aspect1Submitted = await run(envOfficer.id, () => aspectImpactService.submitForReview(aspect1.id));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, aspect1Submitted.workflowInstanceId);
    // 2. Aspect Impact NOT_SIGNIFICANT — dibiarkan DRAFT.
    await run(envOfficer.id, () => aspectImpactService.create({
        companyId: ctx.companyId,
        siteId: ctx.siteIdHq,
        conditionType: "NORMAL",
        activityProcessArea: "Penggunaan AC kantor",
        environmentalAspect: "Konsumsi listrik AC",
        environmentalImpact: "Peningkatan jejak karbon tidak langsung",
        impactType: "RESOURCE_CONSUMPTION",
        scores: { likelihoodScore: 2, severityScore: 2, frequencyScore: 2, regulatoryScore: 1, stakeholderConcernScore: 1 },
    }));
    // 3. Monitoring EXCEED -> auto-CAPA (BR-02, event stub async).
    await run(envOfficer.id, () => monitoringRecordService.create({
        siteId: ctx.siteIdCepu,
        monitoringType: "AIR_EMISSION",
        monitoringPointCode: "CEROBONG-01",
        monitoringPointName: "Cerobong Genset Darurat",
        parameterName: "SO2",
        unitOfMeasure: "mg/Nm3",
        resultValue: 800,
        bakuMutuMin: 0,
        bakuMutuMax: 500,
        samplingDate: (0, context_1.daysAgo)(5),
    }));
    await new Promise((r) => setTimeout(r, 500)); // EnvironmentalMonitoringCapaTriggerListener async.
    // 4. Monitoring COMPLIANT -> VERIFIED dgn lampiran lab riil (BR-07).
    const monitoring2 = await run(envOfficer.id, () => monitoringRecordService.create({
        siteId: ctx.siteIdCepu,
        monitoringType: "WASTEWATER_EFFLUENT",
        monitoringPointCode: "IPAL-OUT",
        monitoringPointName: "Outlet IPAL",
        parameterName: "COD",
        unitOfMeasure: "mg/L",
        resultValue: 80,
        bakuMutuMax: 100,
        samplingDate: (0, context_1.daysAgo)(3),
    }));
    await (0, shared_1.uploadDemoFile)(app, ctx.tenantId, envOfficer.id, {
        entityType: "environmental_monitoring_record",
        entityId: monitoring2.id,
        fileName: "lab-report-cod-ipal.pdf",
    });
    await run(envOfficer.id, () => monitoringRecordService.verify(monitoring2.id));
    // 5. Waste — log->manifest tertaut->siklus 7-tahap penuh->COMPLETED+Festronik.
    const log1 = await run(tpsOfficer.id, () => wasteGenerationLogService.create({
        siteId: ctx.siteIdCepu,
        logDate: (0, context_1.daysAgo)(10),
        wasteCode: "A102d",
        wasteName: "Oli bekas",
        wasteType: "HAZARDOUS_B3",
        quantityGenerated: 200,
        unitOfMeasure: "KG",
        storageLocation: "TPS LB3 Blok A",
    }));
    const manifest1 = await run(tpsOfficer.id, () => wasteManifestService.create({
        siteId: ctx.siteIdCepu,
        wasteType: "HAZARDOUS_B3",
        wasteCode: "A102d",
        wasteName: "Oli bekas",
        quantity: 200,
        unitOfMeasure: "KG",
        packagingType: "DRUM",
        generationDate: (0, context_1.daysAgo)(10),
        linkedGenerationLogIds: [log1.id],
    }));
    await run(tpsOfficer.id, () => wasteManifestService.issue(manifest1.id));
    await run(tpsOfficer.id, () => wasteManifestService.markInTransit(manifest1.id, {
        transporterName: "PT Angkut Aman Sentosa",
        transporterLicenseNo: "TRANS-2026-001",
        transporterVehicleNo: "B 9012 XYZ",
        transportDate: (0, context_1.daysAgo)(8),
    }));
    await run(tpsOfficer.id, () => wasteManifestService.markReceivedByTransporter(manifest1.id));
    await run(tpsOfficer.id, () => wasteManifestService.markReceivedByProcessor(manifest1.id, {
        destinationFacilityName: "PT Pengolah Limbah Industri",
        destinationFacilityLicenseNo: "PROC-2026-045",
        receivingConfirmationDate: (0, context_1.daysAgo)(5),
    }));
    await run(tpsOfficer.id, () => wasteManifestService.complete(manifest1.id));
    await run(tpsOfficer.id, () => wasteManifestService.recordFestronikNumber(manifest1.id, `FTR-2026-${(0, node_crypto_1.randomUUID)().slice(0, 8).toUpperCase()}`));
    // 6. Waste — log dibackdate spy waste-storage-duration-scan (H-7, BR-03)
    // genuinely menemukannya (dipanggil di akhir).
    const storageStart = (0, context_1.daysAgo)(84);
    await run(tpsOfficer.id, () => wasteGenerationLogService.create({
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
    }));
    // 7. PROPER Self-Assessment — 2 kriteria->skor terbobot->override BR-06->
    // 2-stage->submit KLHK->hasil resmi.
    const assessment1 = await run(hseManager.id, () => properSelfAssessmentService.create({
        companyId: ctx.companyId,
        siteId: ctx.siteIdCepu,
        assessmentPeriod: "2026",
        assessmentType: "INTERNAL_SELF_ASSESSMENT",
        assessmentDate: (0, context_1.daysAgo)(30),
    }));
    await run(hseManager.id, () => properSelfAssessmentService.recordCriteriaScore(assessment1.id, {
        criteriaCategory: "AIR_POLLUTION_CONTROL",
        criteriaDescription: "Pengendalian emisi udara",
        complianceStatus: "FULLY_COMPLIANT",
        scoreValue: 90,
        weightPercentage: 50,
    }));
    await run(hseManager.id, () => properSelfAssessmentService.recordCriteriaScore(assessment1.id, {
        criteriaCategory: "HAZARDOUS_WASTE_MANAGEMENT",
        criteriaDescription: "Tata kelola limbah B3",
        complianceStatus: "PARTIALLY_COMPLIANT",
        scoreValue: 70,
        weightPercentage: 50,
    }));
    await run(hseManager.id, () => properSelfAssessmentService.overrideRating(assessment1.id, "HIJAU", "Data sampling terbaru kuartal ini belum masuk sistem"));
    const assessment1Submitted = await run(hseManager.id, () => properSelfAssessmentService.submitForInternalReview(assessment1.id));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, assessment1Submitted.workflowInstanceId);
    await run(hseManager.id, () => properSelfAssessmentService.submitToKlhk(assessment1.id));
    await run(hseManager.id, () => properSelfAssessmentService.recordOfficialResult(assessment1.id, "HIJAU"));
    // 8. Environmental Permit — 1:1 ekstensi licenses_permits BARU (BR-05).
    const license1 = await run(envOfficer.id, () => licensePermitService.create({
        licenseNumber: "IPLC-CEPU-001",
        licenseName: "Izin Pembuangan Limbah Cair Site Cepu",
        licenseType: "ENVIRONMENTAL_PERMIT",
        holderType: "SITE",
        holderReferenceId: ctx.siteIdCepu,
        issueDate: new Date("2024-01-01"),
        expiryDate: new Date("2027-01-01"),
    }));
    await run(envOfficer.id, () => environmentalPermitService.create({
        licensePermitId: license1.id,
        permitMedia: "WASTEWATER",
        requiredMonitoringFrequency: "MONTHLY",
        reportingObligationTo: "DLH Kabupaten Blora",
    }));
    await wasteStorageDurationScanService.scan();
    // eslint-disable-next-line no-console
    console.log("  Environmental Management: 2 aspect impact (SIGNIFICANT ACTIVE, NOT_SIGNIFICANT DRAFT), 2 monitoring (EXCEED auto-CAPA, COMPLIANT VERIFIED+lampiran), waste manifest siklus 7-tahap+Festronik + 1 storage H-7 warning, PROPER assessment lengkap sampai hasil KLHK, 1 environmental permit.");
}
