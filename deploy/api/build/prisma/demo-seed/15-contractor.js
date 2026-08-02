"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedContractor = seedContractor;
const contractor_document_compliance_service_1 = require("../../src/modules/domains/contractor/contractor-document-compliance.service");
const contractor_due_scan_service_1 = require("../../src/modules/domains/contractor/contractor-due-scan.service");
const contractor_performance_evaluation_service_1 = require("../../src/modules/domains/contractor/contractor-performance-evaluation.service");
const contractor_prequalification_service_1 = require("../../src/modules/domains/contractor/contractor-prequalification.service");
const contractor_project_assignment_service_1 = require("../../src/modules/domains/contractor/contractor-project-assignment.service");
const contractor_worker_service_1 = require("../../src/modules/domains/contractor/contractor-worker.service");
const contractor_service_1 = require("../../src/modules/domains/contractor/contractor.service");
const tenant_context_1 = require("../../src/platform/tenancy/tenant-context");
const context_1 = require("./context");
const shared_1 = require("./shared");
async function seedContractor(app, adminPrisma, ctx) {
    const contractorService = app.get(contractor_service_1.ContractorService);
    const prequalificationService = app.get(contractor_prequalification_service_1.ContractorPrequalificationService);
    const assignmentService = app.get(contractor_project_assignment_service_1.ContractorProjectAssignmentService);
    const workerService = app.get(contractor_worker_service_1.ContractorWorkerService);
    const evaluationService = app.get(contractor_performance_evaluation_service_1.ContractorPerformanceEvaluationService);
    const complianceService = app.get(contractor_document_compliance_service_1.ContractorDocumentComplianceService);
    const scanService = app.get(contractor_due_scan_service_1.ContractorDueScanService);
    const coordinator = (0, context_1.actor)(ctx, "HSE_OFFICER"); // proxy "Contractor Coordinator".
    const hseManager = (0, context_1.actor)(ctx, "HSE_MANAGER");
    const picInternal = (0, context_1.actors)(ctx, "WORKER_EMPLOYEE")[0];
    const run = (userId, fn) => tenant_context_1.tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);
    // 1. PT A — siklus PENUH: PQ 2-stage -> PREQUALIFIED -> assignment ACTIVE
    // (BR-04 IUJP+CSMS terpenuhi) -> 2 pekerja ACTIVE -> evaluasi GOOD.
    const contractorA = await run(coordinator.id, () => contractorService.create({
        contractorName: "PT Bangun Migas Sejahtera",
        contractorType: "CONSTRUCTION",
        businessRegistrationNo: "NIB-8801223345671",
        taxIdNpwp: "01.234.567.8-901.000",
        address: "Jl. Industri Migas No. 12",
        city: "Cepu",
        province: "Jawa Tengah",
        contactPersonName: "Agus Setiawan",
        contactPersonPhone: "081234500001",
        contactPersonEmail: "agus.setiawan@bangunmigas.demo",
        contractorCategory: "TIER_1",
        overallRiskRating: "HIGH",
    }));
    const pqA = await run(coordinator.id, () => prequalificationService.create({ contractorId: contractorA.id, prequalificationType: "NEW", scopeOfWork: "Konstruksi & perawatan fasilitas produksi" }));
    const docA1 = await run(coordinator.id, () => prequalificationService.addDocument(pqA.id, { documentType: "SIUJK", isMandatory: true }));
    const docA2 = await run(coordinator.id, () => prequalificationService.addDocument(pqA.id, { documentType: "IUJP", isMandatory: true }));
    await run(coordinator.id, () => prequalificationService.verifyDocument(docA1.id, "VERIFIED"));
    await run(coordinator.id, () => prequalificationService.verifyDocument(docA2.id, "VERIFIED"));
    const pqASubmitted = await run(coordinator.id, () => prequalificationService.submitForReview(pqA.id, { result: "PASS", technicalCapabilityScore: 88, hseCapabilityScore: 92, financialCapabilityScore: 85, overallScore: 88 }));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, pqASubmitted.workflowInstanceId);
    const assignmentA = await run(coordinator.id, () => assignmentService.create({
        contractorId: contractorA.id,
        siteId: ctx.siteIdCepu,
        contractTitle: "Perawatan Fasilitas Produksi Blok Cepu 2026",
        scopeOfWork: "Perawatan pipa & struktur penyangga",
        contractStartDate: (0, context_1.daysAgo)(20),
        contractEndDate: (0, context_1.daysFromNow)(160),
        contractValue: 4_500_000_000,
        picInternalUserId: picInternal.id,
        riskClassification: "HIGH",
        autoGenerateContractNo: true,
    }));
    await run(coordinator.id, () => complianceService.register({ contractorId: contractorA.id, documentCategory: "IUJP", expiryDate: (0, context_1.daysFromNow)(300), isMandatoryForPtk007: true }));
    await run(coordinator.id, () => complianceService.register({ contractorId: contractorA.id, documentCategory: "CSMS_CERTIFICATE", expiryDate: (0, context_1.daysFromNow)(300), isMandatoryForPtk007: true }));
    await run(coordinator.id, () => assignmentService.activate(assignmentA.id));
    // Dokumen tambahan mendekati kedaluwarsa — demo contractor-due-scan reminder.
    await run(coordinator.id, () => complianceService.register({ contractorId: contractorA.id, documentCategory: "INSURANCE_GENERAL_LIABILITY", expiryDate: (0, context_1.daysFromNow)(10), reminderDaysBefore: 30 }));
    const workerA1 = await run(coordinator.id, () => workerService.register({
        contractorId: contractorA.id,
        projectAssignmentId: assignmentA.id,
        fullName: "Bambang Sutrisno",
        workerCategory: "SKILLED",
        jobPosition: "Welder",
        isAuthorizedPermitRequester: true,
    }));
    await run(coordinator.id, () => workerService.completeSiteInduction(workerA1.id));
    const workerA2 = await run(coordinator.id, () => workerService.register({ contractorId: contractorA.id, projectAssignmentId: assignmentA.id, fullName: "Slamet Riyadi", workerCategory: "SUPERVISOR", jobPosition: "Site Supervisor" }));
    await run(coordinator.id, () => workerService.completeSiteInduction(workerA2.id));
    const evalA = await run(coordinator.id, () => evaluationService.create({
        contractorId: contractorA.id,
        projectAssignmentId: assignmentA.id,
        evaluationPeriod: "QUARTERLY",
        periodStartDate: (0, context_1.daysAgo)(90),
        periodEndDate: (0, context_1.daysAgo)(1),
        hseComplianceScore: 90,
        manHoursWorked: 4200,
        documentComplianceScore: 95,
        overallRating: "GOOD",
        recommendation: "Lanjutkan kontrak, kinerja HSE konsisten baik",
    }));
    const evalASubmitted = await run(coordinator.id, () => evaluationService.submitForReview(evalA.id));
    await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, evalASubmitted.workflowInstanceId);
    // 2. PT B — jalur cepat (updateStatus manual, tanpa siklus PQ penuh) ->
    // assignment PLANNED blm diaktivasi -> 1 pekerja msh SUSPENDED pra-induksi
    // -> 2x evaluasi UNACCEPTABLE berturut -> BR-07 notifikasi HSE Manager.
    const contractorB = await run(coordinator.id, () => contractorService.create({
        contractorName: "PT Sumber Logistik Nusantara",
        contractorType: "LOGISTICS",
        contractorCategory: "TIER_1",
        overallRiskRating: "MEDIUM",
        city: "Balikpapan",
        province: "Kalimantan Timur",
    }));
    await run(hseManager.id, () => contractorService.updateStatus(contractorB.id, "PREQUALIFIED"));
    const assignmentB = await run(coordinator.id, () => assignmentService.create({
        contractorId: contractorB.id,
        siteId: ctx.siteIdBalikpapan,
        contractTitle: "Jasa Logistik & Distribusi Material 2026",
        contractStartDate: (0, context_1.daysAgo)(5),
        picInternalUserId: picInternal.id,
        riskClassification: "MEDIUM",
    }));
    await run(coordinator.id, () => workerService.register({ contractorId: contractorB.id, projectAssignmentId: assignmentB.id, fullName: "Joko Priyono", workerCategory: "DRIVER" }));
    async function createApproveEvaluationB(start, end) {
        const evalRecord = await run(coordinator.id, () => evaluationService.create({
            contractorId: contractorB.id,
            projectAssignmentId: assignmentB.id,
            evaluationPeriod: "QUARTERLY",
            periodStartDate: start,
            periodEndDate: end,
            hseComplianceScore: 40,
            overallRating: "UNACCEPTABLE",
            recommendation: "Peringatan tertulis — pelanggaran prosedur bongkar-muat berulang",
        }));
        const submitted = await run(coordinator.id, () => evaluationService.submitForReview(evalRecord.id));
        await (0, shared_1.approveAllPendingStages)(app, adminPrisma, ctx.tenantId, submitted.workflowInstanceId);
    }
    await createApproveEvaluationB((0, context_1.daysAgo)(180), (0, context_1.daysAgo)(91));
    await createApproveEvaluationB((0, context_1.daysAgo)(90), (0, context_1.daysAgo)(1));
    // 3. PT C — BLACKLISTED (BR-06 wajib justifikasi).
    const contractorC = await run(coordinator.id, () => contractorService.create({ contractorName: "PT Katering Sehat Sentosa", contractorType: "CATERING", contractorCategory: "TIER_1", overallRiskRating: "LOW" }));
    await run(hseManager.id, () => contractorService.updateStatus(contractorC.id, "BLACKLISTED", "Ditemukan pelanggaran higiene pangan berulang & gagal audit BPOM internal"));
    // 4. PT D — REGISTERED msh awal (sub-kontraktor PT A, demo hierarki) + 1
    // dokumen kepatuhan EXPIRED -> SENGAJA dibiarkan, live demo Postman BR-02
    // (Work Permit blokir permit dgn contractorCompanyId ini).
    const contractorD = await run(coordinator.id, () => contractorService.create({
        contractorName: "PT Baja Perkasa Enjiniring",
        contractorType: "ENGINEERING_SERVICES",
        contractorCategory: "SUB_CONTRACTOR",
        parentContractorId: contractorA.id,
        overallRiskRating: "MEDIUM",
    }));
    await run(coordinator.id, () => complianceService.register({ contractorId: contractorD.id, documentCategory: "BPJS_KESEHATAN", expiryDate: (0, context_1.daysAgo)(45) }));
    await scanService.scan();
    // eslint-disable-next-line no-console
    console.log("  Contractor Management: 4 kontraktor (PT A siklus penuh PQ 2-stage->PREQUALIFIED->assignment ACTIVE BR-04+2 pekerja ACTIVE+evaluasi GOOD, PT B jalur cepat+2x evaluasi UNACCEPTABLE->BR-07 notifikasi, PT C BLACKLISTED BR-06, PT D REGISTERED+dok EXPIRED utk live demo BR-02 Work Permit), reminder H-N via scan.");
}
