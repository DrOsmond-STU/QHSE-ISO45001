"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedQuality = seedQuality;
const node_crypto_1 = require("node:crypto");
const capa_register_service_1 = require("../../src/modules/domains/capa/capa-register.service");
const customer_complaint_service_1 = require("../../src/modules/domains/quality/customer-complaint.service");
const ncr_record_service_1 = require("../../src/modules/domains/quality/ncr-record.service");
const quality_complaint_response_sla_scan_service_1 = require("../../src/modules/domains/quality/quality-complaint-response-sla-scan.service");
const quality_inspection_service_1 = require("../../src/modules/domains/quality/quality-inspection.service");
const quality_objective_service_1 = require("../../src/modules/domains/quality/quality-objective.service");
const supplier_quality_record_service_1 = require("../../src/modules/domains/quality/supplier-quality-record.service");
const tenant_context_1 = require("../../src/platform/tenancy/tenant-context");
const context_1 = require("./context");
const shared_1 = require("./shared");
async function seedQuality(app, adminPrisma, ctx) {
    const ncrRecordService = app.get(ncr_record_service_1.NcrRecordService);
    const customerComplaintService = app.get(customer_complaint_service_1.CustomerComplaintService);
    const qualityInspectionService = app.get(quality_inspection_service_1.QualityInspectionService);
    const supplierQualityRecordService = app.get(supplier_quality_record_service_1.SupplierQualityRecordService);
    const qualityObjectiveService = app.get(quality_objective_service_1.QualityObjectiveService);
    const complaintResponseSlaScanService = app.get(quality_complaint_response_sla_scan_service_1.QualityComplaintResponseSlaScanService);
    const capaRegisterService = app.get(capa_register_service_1.CapaRegisterService);
    const qualityManager = (0, context_1.actor)(ctx, "QUALITY_MANAGER");
    const qcInspector = (0, context_1.actor)(ctx, "QC_INSPECTOR");
    const run = (userId, fn) => tenant_context_1.tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);
    // 1. NCR MAJOR — siklus penuh: containment->disposisi 3-stage->CAPA link
    // ->re-inspeksi PASS->CLOSED.
    const ncr1 = await run(qcInspector.id, () => ncrRecordService.create({
        siteId: ctx.siteIdCepu,
        ncrSource: "INTERNAL",
        title: "Dimensi produk di luar toleransi",
        description: "Diameter luar melebihi spesifikasi pada batch produksi",
        detectedDate: (0, context_1.daysAgo)(10),
        detectionStage: "IN_PROCESS",
        severity: "MAJOR",
        quantityNonconforming: 50,
        unitOfMeasure: "pcs",
    }));
    await run(qcInspector.id, () => ncrRecordService.recordContainment(ncr1.id, "Produk ditahan di area quarantine"));
    const ncr1Proposed = await run(qcInspector.id, () => ncrRecordService.proposeDisposition(ncr1.id, { disposition: "REWORK", dispositionJustification: "Rework toleransi ulang sesuai spesifikasi" }));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, ncr1Proposed.workflowInstanceId);
    const capaNcr1 = await run(qcInspector.id, () => capaRegisterService.create({
        sourceType: "QUALITY_NCR",
        sourceId: ncr1.id,
        category: "CORRECTIVE",
        priority: "HIGH",
        title: `Tindak lanjut ${ncr1.ncrNumber}`,
        problemStatement: "Dimensi produk di luar toleransi",
        siteId: ctx.siteIdCepu,
    }));
    await run(qcInspector.id, () => ncrRecordService.linkCapaRegister(ncr1.id, capaNcr1.id));
    await run(qcInspector.id, () => ncrRecordService.recordReInspectionResult(ncr1.id, "PASS"));
    await run(qcInspector.id, () => ncrRecordService.close(ncr1.id));
    // 2. NCR CRITICAL — dibiarkan DISPOSITIONED, BELUM ber-CAPA (item terbuka,
    // BR-01 gate close() akan menolak sampai capa_id diisi).
    const ncr2 = await run(qcInspector.id, () => ncrRecordService.create({
        siteId: ctx.siteIdCepu,
        ncrSource: "INTERNAL",
        title: "Kontaminasi lini produksi",
        description: "Ditemukan kontaminasi serius pada line produksi utama",
        detectedDate: (0, context_1.daysAgo)(4),
        detectionStage: "IN_PROCESS",
        severity: "CRITICAL",
        quantityNonconforming: 200,
        unitOfMeasure: "pcs",
    }));
    await run(qcInspector.id, () => ncrRecordService.recordContainment(ncr2.id, "Line dihentikan sementara"));
    const ncr2Proposed = await run(qcInspector.id, () => ncrRecordService.proposeDisposition(ncr2.id, { disposition: "SCRAP" }));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, ncr2Proposed.workflowInstanceId);
    // 3. Quality Inspection FINAL FAIL -> auto-NCR (BR-03) + notifikasi.
    const inspection1 = await run(qcInspector.id, () => qualityInspectionService.create({
        siteId: ctx.siteIdBalikpapan,
        inspectionType: "FINAL",
        quantityInspected: 100,
        inspectionDate: (0, context_1.daysAgo)(3),
        parameters: [{ parameterName: "Diameter Luar", specificationMin: 10, specificationMax: 12, sequenceNo: 1 }],
    }));
    const [inspection1Param] = (await run(qcInspector.id, () => qualityInspectionService.getById(inspection1.id))).parameters;
    await run(qcInspector.id, () => qualityInspectionService.recordParameterResult(inspection1Param.id, 15, "FAIL"));
    await run(qcInspector.id, () => qualityInspectionService.submit(inspection1.id));
    // 4. Quality Inspection PASS tapi disposisi USE_AS_IS_DEVIATION -> approval
    // 1-stage (BR-08) -> CLOSED.
    const inspection2 = await run(qcInspector.id, () => qualityInspectionService.create({
        siteId: ctx.siteIdCepu,
        inspectionType: "IN_PROCESS",
        quantityInspected: 50,
        inspectionDate: (0, context_1.daysAgo)(5),
        parameters: [{ parameterName: "Ketebalan Coating", sequenceNo: 1 }],
    }));
    const [inspection2Param] = (await run(qcInspector.id, () => qualityInspectionService.getById(inspection2.id))).parameters;
    await run(qcInspector.id, () => qualityInspectionService.recordParameterResult(inspection2Param.id, 5, "PASS"));
    await run(qcInspector.id, () => qualityInspectionService.submit(inspection2.id));
    const inspection2Reviewed = await run(qcInspector.id, () => qualityInspectionService.review(inspection2.id, "USE_AS_IS_DEVIATION"));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, inspection2Reviewed.deviationWorkflowInstanceId);
    await run(qcInspector.id, () => qualityInspectionService.close(inspection2.id));
    // 5. Customer Complaint CRITICAL — siklus penuh: investigasi->3-stage->
    // CAPA_IN_PROGRESS->link CAPA->RESOLVED->konfirmasi kepuasan->CLOSED.
    const complaint1 = await run(qcInspector.id, () => customerComplaintService.create({
        companyId: ctx.companyId,
        siteId: ctx.siteIdCepu,
        customerName: "PT Petrokimia Mitra Sejahtera",
        complaintChannel: "EMAIL",
        complaintDate: (0, context_1.daysAgo)(15),
        description: "Produk rusak saat diterima di gudang pelanggan",
        complaintCategory: "PRODUCT_QUALITY",
        severity: "CRITICAL",
    }));
    await run(qcInspector.id, () => customerComplaintService.startInvestigation(complaint1.id, "Investigasi awal dimulai, tim QC dikirim ke lokasi pelanggan"));
    const complaint1Submitted = await run(qcInspector.id, () => customerComplaintService.submitForApproval(complaint1.id));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, complaint1Submitted.workflowInstanceId);
    const capaComplaint1 = await run(qcInspector.id, () => capaRegisterService.create({
        sourceType: "CUSTOMER_COMPLAINT",
        sourceId: complaint1.id,
        category: "CORRECTIVE",
        priority: "HIGH",
        title: `Tindak lanjut ${complaint1.complaintNumber}`,
        problemStatement: "Produk rusak saat diterima",
        siteId: ctx.siteIdCepu,
    }));
    await run(qcInspector.id, () => customerComplaintService.linkCapaRegister(complaint1.id, capaComplaint1.id));
    await run(qcInspector.id, () => customerComplaintService.confirmCustomerSatisfaction(complaint1.id, "Kemasan kurang memadai utk pengiriman jarak jauh", "Ganti kemasan ke double-wall corrugated + padding tambahan"));
    // 6. Customer Complaint LOW — response SLA overdue (BR-02, dipanggil di akhir).
    const complaint2 = await run(qcInspector.id, () => customerComplaintService.create({
        companyId: ctx.companyId,
        customerName: "PT Distribusi Nusantara",
        complaintChannel: "PHONE",
        complaintDate: (0, context_1.daysAgo)(5),
        description: "Keterlambatan pengiriman produk ke gudang distributor",
        complaintCategory: "DELIVERY",
        severity: "LOW",
    }));
    await adminPrisma.customerComplaint.update({ where: { id: complaint2.id }, data: { initialResponseDueDate: (0, context_1.daysAgo)(1) } });
    // 7. Supplier Quality Record SUSPENDED -> correctiveActionRequired+CAPA link.
    const supplier1 = await run(qcInspector.id, () => supplierQualityRecordService.create({
        companyId: ctx.companyId,
        supplierCode: `SUP-${(0, node_crypto_1.randomUUID)().slice(0, 6).toUpperCase()}`,
        supplierName: "CV Mitra Jasa Teknik",
        supplierCategory: "SERVICE",
        evaluationType: "PERIODIC_EVALUATION",
        evaluationPeriodStart: new Date("2026-01-01"),
        evaluationPeriodEnd: new Date("2026-06-30"),
        overallScore: 45.5,
    }));
    const supplier1Submitted = await run(qcInspector.id, () => supplierQualityRecordService.submitForApproval(supplier1.id, "SUSPENDED"));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, supplier1Submitted.workflowInstanceId);
    const capaSupplier1 = await run(qcInspector.id, () => capaRegisterService.create({
        sourceType: "OTHER",
        category: "CORRECTIVE",
        priority: "HIGH",
        title: `Tindak lanjut supplier ${supplier1.supplierName}`,
        problemStatement: "Rating SUSPENDED — kinerja di bawah standar 2 evaluasi berturut-turut",
        siteId: ctx.siteIdCepu,
    }));
    await run(qcInspector.id, () => supplierQualityRecordService.linkCapaRegister(supplier1.id, capaSupplier1.id));
    // 8. Supplier Quality Record APPROVED — bersih, tanpa tindak lanjut.
    const supplier2 = await run(qcInspector.id, () => supplierQualityRecordService.create({
        companyId: ctx.companyId,
        supplierCode: `SUP-${(0, node_crypto_1.randomUUID)().slice(0, 6).toUpperCase()}`,
        supplierName: "PT Sumber Material Indonesia",
        supplierCategory: "RAW_MATERIAL",
        evaluationType: "INITIAL_QUALIFICATION",
        evaluationPeriodStart: new Date("2026-01-01"),
        evaluationPeriodEnd: new Date("2026-06-30"),
        overallScore: 92,
    }));
    const supplier2Submitted = await run(qcInspector.id, () => supplierQualityRecordService.submitForApproval(supplier2.id, "APPROVED"));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, supplier2Submitted.workflowInstanceId);
    // 9. Quality Objective — ON_TRACK->AT_RISK (dibiarkan terbuka, sedang berjalan).
    const objective1 = await run(qualityManager.id, () => qualityObjectiveService.create({
        companyId: ctx.companyId,
        objectiveCode: `OBJ-${(0, node_crypto_1.randomUUID)().slice(0, 6).toUpperCase()}`,
        objectiveTitle: "First Pass Yield >= 95%",
        kpiMetricName: "First Pass Yield",
        targetValue: 95,
        atRiskThresholdPercentage: 10,
        measurementFrequency: "MONTHLY",
        ownerUserId: qualityManager.id,
        periodStart: new Date("2026-01-01"),
        periodEnd: new Date("2026-12-31"),
    }));
    await run(qualityManager.id, () => qualityObjectiveService.recordProgress(objective1.id, "2026-Q1", 93));
    await run(qualityManager.id, () => qualityObjectiveService.recordProgress(objective1.id, "2026-Q2", 70));
    // 10. Quality Objective — direview manual jadi NOT_ACHIEVED (terminal, periode lalu).
    const objective2 = await run(qualityManager.id, () => qualityObjectiveService.create({
        companyId: ctx.companyId,
        objectiveCode: `OBJ-${(0, node_crypto_1.randomUUID)().slice(0, 6).toUpperCase()}`,
        objectiveTitle: "Audit Internal Completion Rate >= 100%",
        kpiMetricName: "Audit Completion Rate",
        targetValue: 100,
        atRiskThresholdPercentage: 15,
        measurementFrequency: "QUARTERLY",
        ownerUserId: qualityManager.id,
        periodStart: new Date("2025-01-01"),
        periodEnd: new Date("2025-12-31"),
    }));
    await run(qualityManager.id, () => qualityObjectiveService.recordProgress(objective2.id, "2025-Q4", 60));
    await run(qualityManager.id, () => qualityObjectiveService.reviewOutcome(objective2.id, "NOT_ACHIEVED"));
    await complaintResponseSlaScanService.scan();
    // eslint-disable-next-line no-console
    console.log("  Quality Management: 3 NCR (MAJOR CLOSED, CRITICAL DISPOSITIONED, auto dari inspeksi FAIL), 2 inspeksi (FINAL FAIL->auto-NCR, deviation CLOSED), 2 komplain (CRITICAL CLOSED, LOW SLA overdue), 2 supplier (SUSPENDED+CAPA, APPROVED bersih), 2 objective (AT_RISK terbuka, NOT_ACHIEVED terminal).");
}
