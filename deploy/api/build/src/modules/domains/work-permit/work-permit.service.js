"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkPermitService = void 0;
const common_1 = require("@nestjs/common");
const contractor_document_compliance_service_1 = require("../contractor/contractor-document-compliance.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const work_permit_context_1 = require("./work-permit-context");
const work_permit_activation_rules_1 = require("./work-permit-activation-rules");
const work_permit_approval_cache_service_1 = require("./work-permit-approval-cache.service");
const work_permit_hse_stage_rules_1 = require("./work-permit-hse-stage-rules");
const work_permit_lifecycle_1 = require("./work-permit-lifecycle");
const work_permit_segregation_of_duty_1 = require("./work-permit-segregation-of-duty");
const work_permit_workflow_bootstrap_service_1 = require("./work-permit-workflow-bootstrap.service");
const WORK_PERMIT_NUMBERING_MODULE_CODE = "WORK_PERMIT";
const WORK_PERMIT_WORKFLOW_ENTITY_TYPE = "work_permit";
// Task 3.3 (Modul 06 §4/§5/§6). BELUM ada controller HTTP (pola sama
// seluruh modul domain Phase 2+ sejauh ini) — work_permit.* sudah di-seed
// RBAC baseline (task 129).
let WorkPermitService = class WorkPermitService {
    prisma;
    numberingService;
    workflowEngineService;
    bootstrapService;
    approvalCacheService;
    contractorDocumentComplianceService;
    constructor(prisma, numberingService, workflowEngineService, bootstrapService, approvalCacheService, contractorDocumentComplianceService) {
        this.prisma = prisma;
        this.numberingService = numberingService;
        this.workflowEngineService = workflowEngineService;
        this.bootstrapService = bootstrapService;
        this.approvalCacheService = approvalCacheService;
        this.contractorDocumentComplianceService = contractorDocumentComplianceService;
    }
    /**
     * BR-01 analog (permit_number) via NumberingService (0.10, module_code=
     * WORK_PERMIT, scope_level=SITE — lihat banner comment
     * WorkPermitWorkflowBootstrapService.ensureNumberingConfig()) — nomor
     * DIGENERATE SAAT CREATE (bukan ditunda sampai submitForApproval()),
     * pola PERSIS HiraAssessmentService/JsaRecordService/HiradcRecordService
     * (3.2); BR-01 literal cuma mensyaratkan nomor ADA sebelum status
     * keluar dari DRAFT, kompatibel dgn "digenerate lebih awal". risk_level
     * awal = work_permit_types.default_risk_level (PRD §4 poin 2) —
     * penyesuaian dari jawaban checklist TIDAK dimodelkan (PRD tidak
     * menyediakan mekanisme/skema konkret "jawaban X menaikkan level Y",
     * gap TDD §26); koreksi manual Issuer lewat correctRiskLevel() terpisah.
     * companyId/branchId didenormalisasi dari site (site SELALU sudah py
     * keduanya sejak dibuat, task 1.1).
     */
    async create(input) {
        const createdBy = (0, work_permit_context_1.requireActorUserId)();
        const tenantId = (0, work_permit_context_1.requireTenantId)();
        // Modul 17 BR-02 (task 6.3) — permit dgn contractorCompanyId terisi
        // (proxy utk requester_type=CONTRACTOR, lihat banner comment blok
        // Modul 17 schema.prisma) TIDAK DAPAT dibuat jika kontraktor terkait
        // py minimal SATU contractor_document_compliance berstatus EXPIRED.
        // PRD §4.2 poin 3 literal "divalidasi di level aplikasi SAAT PERMIT
        // DIBUAT" — gate DI SINI (create()), bukan submitForApproval().
        if (input.contractorCompanyId) {
            const blocked = await this.contractorDocumentComplianceService.hasBlockingExpiredCompliance(input.contractorCompanyId);
            if (blocked) {
                throw new common_1.BadRequestException("BR-02 (Modul 17) — Work Permit tidak dapat diajukan: kontraktor terkait memiliki dokumen kepatuhan wajib yang sudah EXPIRED.");
            }
        }
        await this.bootstrapService.ensureNumberingConfig(input.siteId);
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true, companyId: true, branchId: true } }));
        const type = await this.prisma.withRls((tx) => tx.workPermitType.findUniqueOrThrow({ where: { id: input.workPermitTypeId }, select: { defaultRiskLevel: true } }));
        const permitNumber = await this.numberingService.generateNext(WORK_PERMIT_NUMBERING_MODULE_CODE, {
            scopeId: input.siteId,
            variables: { SITE_CODE: site.siteCode },
        });
        return this.prisma.withRls((tx) => tx.workPermit.create({
            data: {
                tenantId,
                permitNumber,
                workPermitTypeId: input.workPermitTypeId,
                companyId: site.companyId,
                branchId: site.branchId,
                siteId: input.siteId,
                departmentId: input.departmentId,
                title: input.title,
                description: input.description,
                locationDetail: input.locationDetail,
                requesterId: input.requesterId,
                contractorCompanyId: input.contractorCompanyId,
                relatedJsaId: input.relatedJsaId,
                riskLevel: type.defaultRiskLevel,
                plannedStartDatetime: input.plannedStartDatetime,
                plannedEndDatetime: input.plannedEndDatetime,
                numberOfWorkers: input.numberOfWorkers,
                status: "DRAFT",
                customFields: input.customFields ?? {},
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    /** 1:1 (unique workPermitId) — upsert menangani "isi pertama kali" DAN
     * "revisi sebelum submit" dgn satu method, pola sama beberapa checklist/
     * config 1:1 lain di codebase ini. */
    async submitHazardChecklist(workPermitId, input) {
        const actorId = (0, work_permit_context_1.requireActorUserId)();
        const tenantId = (0, work_permit_context_1.requireTenantId)();
        await this.prisma.withRls((tx) => tx.workPermitHazardChecklist.upsert({
            where: { workPermitId },
            create: {
                tenantId,
                workPermitId,
                customFields: input.customFields,
                allMandatoryItemsChecked: input.allMandatoryItemsChecked,
                completedBy: actorId,
                completedAt: new Date(),
                createdBy: actorId,
                updatedBy: actorId,
            },
            update: {
                customFields: input.customFields,
                allMandatoryItemsChecked: input.allMandatoryItemsChecked,
                completedBy: actorId,
                completedAt: new Date(),
                updatedBy: actorId,
            },
        }));
    }
    /** PRD §4 poin 2 — "risk_level... dapat dikoreksi manual oleh Issuer pada
     * tahap review dengan jejak audit." Jejak audit terpenuhi lewat
     * audit_log_trigger generik (0.13, melekat seluruh tabel) + updatedBy —
     * TIDAK ADA tabel riwayat perubahan risk_level terpisah (skema literal
     * PRD §5 tidak memintanya). */
    async correctRiskLevel(workPermitId, riskLevel) {
        const updatedBy = (0, work_permit_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.workPermit.update({ where: { id: workPermitId }, data: { riskLevel, updatedBy } }));
    }
    async getById(workPermitId) {
        return this.prisma.withRls((tx) => tx.workPermit.findUniqueOrThrow({
            where: { id: workPermitId },
            include: { hazardChecklist: true, gasTestResults: true, isolationLotoRecords: true, approvalCache: true },
        }));
    }
    /**
     * PRD §4 poin 3-4 — submit memicu workflow_instances (module_code=
     * WORK_PERMIT, entity_type=work_permit). BR-04 (hasHseStage) dihitung
     * dari work_permit_types.requires_hse_approval + work_permits.risk_level
     * SAAT INI (mencerminkan koreksi Issuer manapun via correctRiskLevel()
     * — bukan default_risk_level asli type). TIGA transaksi TERPISAH, alasan
     * PERSIS HiraAssessmentService.submitForApproval() (3.2).
     */
    async submitForApproval(workPermitId) {
        const { requiresHseApproval, riskLevel } = await this.prisma.withRls(async (tx) => {
            const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId } });
            if (permit.status !== "DRAFT") {
                throw new common_1.BadRequestException(`work_permits berstatus ${permit.status} tidak dapat diajukan (wajib DRAFT).`);
            }
            const checklist = await tx.workPermitHazardChecklist.findUnique({ where: { workPermitId } });
            if (!checklist || !checklist.allMandatoryItemsChecked) {
                throw new common_1.BadRequestException(`work_permits ${workPermitId} belum melengkapi work_permit_hazard_checklist (seluruh item wajib) — tidak dapat diajukan.`);
            }
            const type = await tx.workPermitType.findUniqueOrThrow({ where: { id: permit.workPermitTypeId }, select: { requiresHseApproval: true } });
            return { requiresHseApproval: type.requiresHseApproval, riskLevel: permit.riskLevel };
        });
        const hasHseStage = (0, work_permit_hse_stage_rules_1.computeHasHseStage)(riskLevel, requiresHseApproval);
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(WORK_PERMIT_WORKFLOW_ENTITY_TYPE, workPermitId, definition.id, { hasHseStage });
        const updated = await this.prisma.withRls((tx) => tx.workPermit.update({ where: { id: workPermitId }, data: { status: "PENDING_ISSUER_APPROVAL", workflowInstanceId: instance.id } }));
        await this.approvalCacheService.refresh(workPermitId);
        return updated;
    }
    /**
     * BR-09 — wrapper WAJIB di atas WorkflowEngineService.actOnTask() generik
     * (yang HANYA cek "task.assignedTo===actingUserId", TIDAK tahu soal
     * requester entitas) supaya segregation-of-duty genuinely ditegakkan;
     * ROLE_IN_SCOPE tenant-wide (ApproverResolutionService, 0.9) SECARA
     * TEORETIS bisa meresolusi requester sendiri sbg approver kalau dia juga
     * pemegang role Supervisor/HSE Manager (site kecil). Sekaligus me-refresh
     * work_permit_approvals (cache read-model, task 135) — satu-satunya
     * titik lain selain submitForApproval()/WorkPermitWorkflowCompletionListener
     * yang genuinely memanggil actOnTask() utk entitas modul ini.
     */
    async actOnApprovalTask(taskId, action, comment, actingUserId) {
        const task = await this.prisma.withRls((tx) => tx.workflowTask.findUniqueOrThrow({ where: { id: taskId } }));
        const instance = await this.prisma.withRls((tx) => tx.workflowInstance.findUniqueOrThrow({ where: { id: task.instanceId } }));
        if (instance.entityType === WORK_PERMIT_WORKFLOW_ENTITY_TYPE) {
            const permit = await this.prisma.withRls((tx) => tx.workPermit.findUniqueOrThrow({ where: { id: instance.entityId }, select: { requesterId: true } }));
            (0, work_permit_segregation_of_duty_1.assertRequesterNotApprover)(permit.requesterId, actingUserId);
        }
        const result = await this.workflowEngineService.actOnTask(taskId, action, comment, actingUserId);
        if (instance.entityType === WORK_PERMIT_WORKFLOW_ENTITY_TYPE) {
            await this.approvalCacheService.refresh(instance.entityId);
        }
        return result;
    }
    /**
     * PRD §4 poin 6-7 — "Verifikasi Keselamatan Pra-Aktivasi... Aktif —
     * status berpindah ke ACTIVE setelah seluruh syarat terpenuhi." BR-02/
     * BR-03 ditegakkan DI SINI (gate eksplisit, BUKAN otomatis begitu
     * APPROVED tercapai — PRD tidak menyebut auto-activate; "aktivasi"
     * dibaca sbg tindakan tersendiri, pola sama HiradcRecordService.approve()
     * 3.2 — lapis opsional lanjutan TANPA workflow tambahan).
     */
    async activate(workPermitId) {
        const updatedBy = (0, work_permit_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId } });
            (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)(permit.status, "ACTIVE");
            const type = await tx.workPermitType.findUniqueOrThrow({
                where: { id: permit.workPermitTypeId },
                select: { requiresGasTest: true, requiresLoto: true },
            });
            const gasTests = await tx.gasTestResult.findMany({ where: { workPermitId }, select: { result: true } });
            (0, work_permit_activation_rules_1.assertGasTestPassedIfRequired)(type.requiresGasTest, gasTests);
            const lotoRecords = await tx.isolationLotoRecord.findMany({ where: { workPermitId }, select: { status: true } });
            (0, work_permit_activation_rules_1.assertLotoVerifiedIfRequired)(type.requiresLoto, lotoRecords);
            return tx.workPermit.update({ where: { id: workPermitId }, data: { status: "ACTIVE", actualStartDatetime: new Date(), updatedBy } });
        });
    }
    /**
     * BR-05 (PRD §6), penyelesaian LOOP — PRD sendiri tidak eksplisit
     * mendeskripsikan jalur keluar SUSPENDED, tapi permit yang SUSPENDED
     * selamanya tanpa jalur kembali bukan desain yang masuk akal (lihat
     * banner comment work-permit-lifecycle.ts). Gate: gas_test_results
     * TERBARU wajib result=PASS (retest baru genuinely direkam SETELAH
     * suspend — GasTestResultService.record() SELALU baris baru, tidak
     * pernah update baris lama). BEDA dari activate(): TIDAK menyentuh
     * actualStartDatetime (permit tidak "mulai" lagi, cuma resume) dan
     * TIDAK mengulang gate BR-02/BR-03 penuh (SUSPENDED->ACTIVE HANYA
     * butuh retest gas baru lolos, bukan verifikasi LOTO ulang).
     */
    async resumeFromSuspension(workPermitId) {
        const updatedBy = (0, work_permit_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId } });
            (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)(permit.status, "ACTIVE");
            const latestTest = await tx.gasTestResult.findFirst({ where: { workPermitId }, orderBy: { testDatetime: "desc" } });
            if (!latestTest || latestTest.result !== "PASS") {
                throw new common_1.BadRequestException("work_permits SUSPENDED wajib memiliki gas_test_results terbaru dengan result=PASS sebelum kembali ACTIVE (BR-05).");
            }
            return tx.workPermit.update({ where: { id: workPermitId }, data: { status: "ACTIVE", updatedBy } });
        });
    }
    async cancel(workPermitId) {
        const updatedBy = (0, work_permit_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId } });
            (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)(permit.status, "CANCELLED");
            return tx.workPermit.update({ where: { id: workPermitId }, data: { status: "CANCELLED", updatedBy } });
        });
    }
};
exports.WorkPermitService = WorkPermitService;
exports.WorkPermitService = WorkPermitService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        workflow_engine_service_1.WorkflowEngineService,
        work_permit_workflow_bootstrap_service_1.WorkPermitWorkflowBootstrapService,
        work_permit_approval_cache_service_1.WorkPermitApprovalCacheService,
        contractor_document_compliance_service_1.ContractorDocumentComplianceService])
], WorkPermitService);
