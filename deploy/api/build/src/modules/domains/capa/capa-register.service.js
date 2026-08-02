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
exports.CapaRegisterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const capa_context_1 = require("./capa-context");
const capa_workflow_bootstrap_service_1 = require("./capa-workflow-bootstrap.service");
const capa_register_lifecycle_1 = require("./capa-register-lifecycle");
const CAPA_NUMBERING_MODULE_CODE = "CAPA";
/**
 * Task 4.2 (Modul 10 §4 poin 1-2, §3 "Sistem (trigger otomatis)/User
 * manual | capa.register.create"). BELUM ada controller HTTP. BR-05 —
 * "source_type/source_id, jika diisi, wajib valid... divalidasi via
 * service call ke modul sumber saat create" — ditegakkan utk 9 dari 13
 * source_type dgn kontrak field KONKRET/tabel genuinely ada di codebase
 * ini (INCIDENT/AUDIT_FINDING/INSPECTION_FINDING sejak 4.2; QUALITY_NCR/
 * CUSTOMER_COMPLAINT ditambah task 5.1; ENVIRONMENTAL_ASPECT_IMPACT/
 * ENVIRONMENTAL_MONITORING ditambah task 5.2 — DUA nilai `CapaSourceType`
 * BARU krn enum asli task 4.2 (ditulis sebelum Modul 12 dikonsultasi) sama
 * sekali tidak menyediakan slot lingkungan, lihat banner comment blok
 * Modul 12 schema.prisma; OCCUPATIONAL_DISEASE_CASE ditambah task 5.3,
 * SATU nilai BARU lagi utk Modul 13 dgn alasan PERSIS sama — validasi ke
 * occupational_disease_cases, BUKAN ke kolom klinis di dalamnya (BR-10:
 * problemStatement CapaRegister WAJIB deskripsi sistemik non-identifiable,
 * TIDAK bisa ditegakkan dari sini — field bebas-teks, didisiplinkan proses/
 * UI, lihat banner comment schema.prisma blok Modul 13); CALIBRATION_OOT
 * ditambah task 6.2 (susulan saat dokumentasi/task 292, BUKAN saat skema
 * awal task 282 — gap TDD §26, kontrak baru ini genuinely kelihatan hanya
 * saat file ini ditinjau ulang cross-module) — validasi ke
 * out_of_tolerance_records, link caller-supplied via
 * OutOfToleranceRecordService.linkCapaRegister(), pola PERSIS
 * OCCUPATIONAL_DISEASE_CASE. COMPLIANCE/RISK/MANAGEMENT_REVIEW/OTHER TETAP
 * TIDAK divalidasi — PRD Modul 10 §7 eksplisit "kontrak integrasi resmi...
 * perlu difinalisasi saat dokumen2 tsb ditulis" (Modul 04/05), dan MESKI
 * Modul 04 (Compliance)/05 (Risk) SUDAH ada tabelnya sejak 2.2/3.1, PRD
 * Modul 10 §7 TIDAK PERNAH menyebut tabel target spesifik utk
 * source_type=COMPLIANCE/RISK (beda dari INCIDENT/AUDIT_FINDING/
 * INSPECTION_FINDING/QUALITY_NCR/ENVIRONMENTAL_* yang namanya SENDIRI
 * sudah menunjuk tabel konkret) — memvalidasi thd tabel tebakan (mis.
 * `risk_register` utk RISK) berarti MENGARANG kontrak yang PRD sendiri
 * belum tentukan, gap TDD §26 (kandidat closure lanjutan kalau PRD Modul
 * 10 §7 direvisi eksplisit).
 */
let CapaRegisterService = class CapaRegisterService {
    prisma;
    numberingService;
    bootstrapService;
    constructor(prisma, numberingService, bootstrapService) {
        this.prisma = prisma;
        this.numberingService = numberingService;
        this.bootstrapService = bootstrapService;
    }
    async create(input) {
        const initiatedBy = (0, capa_context_1.requireActorUserId)();
        const tenantId = (0, capa_context_1.requireTenantId)();
        await this.assertSourceValidIfKnownContract(input.sourceType, input.sourceId);
        await this.bootstrapService.ensureNumberingConfig(input.siteId);
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true, companyId: true, branchId: true } }));
        const capaNumber = await this.numberingService.generateNext(CAPA_NUMBERING_MODULE_CODE, {
            scopeId: input.siteId,
            variables: { SITE_CODE: site.siteCode },
        });
        return this.prisma.withRls((tx) => tx.capaRegister.create({
            data: {
                tenantId,
                capaNumber,
                sourceType: input.sourceType,
                sourceId: input.sourceId,
                sourceReferenceNumber: input.sourceReferenceNumber,
                category: input.category,
                priority: input.priority,
                title: input.title,
                problemStatement: input.problemStatement,
                companyId: site.companyId,
                branchId: site.branchId,
                siteId: input.siteId,
                departmentId: input.departmentId,
                status: "DRAFT",
                initiatedBy,
                initiatedAt: new Date(),
                targetClosureDate: input.targetClosureDate,
                createdBy: initiatedBy,
                updatedBy: initiatedBy,
            },
        }));
    }
    async assertSourceValidIfKnownContract(sourceType, sourceId) {
        if (!sourceId)
            return;
        await this.prisma.withRls(async (tx) => {
            if (sourceType === "INCIDENT") {
                await tx.incidentReport.findUniqueOrThrow({ where: { id: sourceId } });
            }
            else if (sourceType === "AUDIT_FINDING") {
                await tx.auditFinding.findUniqueOrThrow({ where: { id: sourceId } });
            }
            else if (sourceType === "INSPECTION_FINDING") {
                await tx.inspectionFinding.findUniqueOrThrow({ where: { id: sourceId } });
            }
            else if (sourceType === "QUALITY_NCR") {
                await tx.ncrRecord.findUniqueOrThrow({ where: { id: sourceId } });
            }
            else if (sourceType === "CUSTOMER_COMPLAINT") {
                await tx.customerComplaint.findUniqueOrThrow({ where: { id: sourceId } });
            }
            else if (sourceType === "ENVIRONMENTAL_ASPECT_IMPACT") {
                await tx.environmentalAspectImpact.findUniqueOrThrow({ where: { id: sourceId } });
            }
            else if (sourceType === "ENVIRONMENTAL_MONITORING") {
                await tx.environmentalMonitoringRecord.findUniqueOrThrow({ where: { id: sourceId } });
            }
            else if (sourceType === "OCCUPATIONAL_DISEASE_CASE") {
                await tx.occupationalDiseaseCase.findUniqueOrThrow({ where: { id: sourceId } });
            }
            else if (sourceType === "CALIBRATION_OOT") {
                await tx.outOfToleranceRecord.findUniqueOrThrow({ where: { id: sourceId } });
            }
            // sourceType lain — TIDAK divalidasi, lihat banner comment kelas ini.
        });
    }
    // Dipanggil CapaRootCauseAnalysisService.record() sbg side-effect.
    async markRootCauseAnalysisStarted(capaRegisterId) {
        const updatedBy = (0, capa_context_1.requireActorUserId)();
        const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId } }));
        if (capa.status === "ROOT_CAUSE_ANALYSIS")
            return capa;
        (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)(capa.status, "ROOT_CAUSE_ANALYSIS");
        return this.prisma.withRls((tx) => tx.capaRegister.update({ where: { id: capaRegisterId }, data: { status: "ROOT_CAUSE_ANALYSIS", updatedBy } }));
    }
    /**
     * Dipanggil CapaActionPlanWorkflowCompletionListener saat workflow
     * capa_action_plan APPROVED — status->IN_PROGRESS. approvedBy TIDAK
     * ADA kolom terpisah di capa_register (BEDA dari audit_programs) —
     * PRD §5 literal capa_register TIDAK py kolom approved_by/approved_at
     * sama sekali (hanya audit standar createdBy/updatedBy) — WorkflowInstanceCompletedEvent
     * tanpa field actor TETAP relevan utk konsistensi (tidak ada tempat
     * menaruhnya pun), TIDAK ditulis ke mana pun.
     *
     * workflowInstanceId WAJIB di-null-kan di sini juga (bukan hanya jalur
     * REJECTED) — kolom ini SATU pointer "current" dipakai BERGANTIAN oleh
     * DUA workflow proses (lihat banner comment blok Modul 10 schema.prisma).
     * Kalau dibiarkan non-null stale mengarah ke instance capa_action_plan
     * yang SUDAH APPROVED, CapaEffectivenessVerificationService.submitForApproval()
     * salah baca "masih ada workflow aktif" dan menolak submit — bug NYATA
     * yang baru ketahuan lewat integration test siklus penuh (task 4.2 §218),
     * TIDAK ketahuan di unit test murni krn keduanya diuji terisolasi.
     */
    async markActionPlanApproved(capaRegisterId) {
        const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId } }));
        (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)(capa.status, "IN_PROGRESS");
        return this.prisma.withRls((tx) => tx.capaRegister.update({ where: { id: capaRegisterId }, data: { status: "IN_PROGRESS", workflowInstanceId: null } }));
    }
    // Dipanggil listener saat workflow capa_action_plan REJECTED — status
    // balik ke ACTION_PLAN_DEFINED (PIC redefine), workflow_instance_id
    // di-null-kan utk resubmission.
    async returnToActionPlanDefined(capaRegisterId) {
        const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId } }));
        (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)(capa.status, "ACTION_PLAN_DEFINED");
        return this.prisma.withRls((tx) => tx.capaRegister.update({ where: { id: capaRegisterId }, data: { status: "ACTION_PLAN_DEFINED", workflowInstanceId: null } }));
    }
    /**
     * Dipanggil CapaEffectivenessVerificationWorkflowCompletionListener
     * saat workflow capa_effectiveness_verification APPROVED — status
     * final ditentukan `resolveEffectivenessOutcome(result)` (BR-01/BR-04)
     * thd `result` baris capa_effectiveness_verification yang baru saja
     * disetujui. actualClosureDate diisi HANYA kalau outcome EFFECTIVE_CLOSED.
     */
    async markEffectivenessVerificationApproved(capaRegisterId, outcome) {
        const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId } }));
        (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)(capa.status, outcome);
        return this.prisma.withRls((tx) => tx.capaRegister.update({
            where: { id: capaRegisterId },
            // workflowInstanceId di-null-kan di sini juga — lihat banner
            // comment markActionPlanApproved() soal bug stale pointer yang
            // sama; outcome NOT_EFFECTIVE_REOPENED butuh ini krn siklus BR-04
            // akan submit ulang capa_action_plan berikutnya.
            data: { status: outcome, workflowInstanceId: null, actualClosureDate: outcome === "EFFECTIVE_CLOSED" ? new Date() : undefined },
        }));
    }
    // Dipanggil listener saat workflow capa_effectiveness_verification
    // REJECTED — status balik ke IN_PROGRESS (Verifier/PIC redo), workflow_
    // instance_id di-null-kan.
    async returnToInProgress(capaRegisterId) {
        const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId } }));
        (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)(capa.status, "IN_PROGRESS");
        return this.prisma.withRls((tx) => tx.capaRegister.update({ where: { id: capaRegisterId }, data: { status: "IN_PROGRESS", workflowInstanceId: null } }));
    }
    async cancel(capaRegisterId) {
        const updatedBy = (0, capa_context_1.requireActorUserId)();
        const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId } }));
        (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)(capa.status, "CANCELLED");
        return this.prisma.withRls((tx) => tx.capaRegister.update({ where: { id: capaRegisterId }, data: { status: "CANCELLED", updatedBy } }));
    }
    // PRD §3 "HSE Manager | capa.register.reopen" — reopen MANUAL, TERPISAH
    // dari BR-04 (otomatis via resolveEffectivenessOutcome saat NOT_EFFECTIVE).
    async reopen(capaRegisterId) {
        const updatedBy = (0, capa_context_1.requireActorUserId)();
        const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId } }));
        (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)(capa.status, "NOT_EFFECTIVE_REOPENED");
        return this.prisma.withRls((tx) => tx.capaRegister.update({ where: { id: capaRegisterId }, data: { status: "NOT_EFFECTIVE_REOPENED", updatedBy } }));
    }
    async getById(capaRegisterId) {
        return this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({
            where: { id: capaRegisterId },
            include: { rootCauseAnalyses: true, actionPlans: true, effectivenessVerifications: true, approvals: true },
        }));
    }
    async listBySite(siteId) {
        return this.prisma.withRls((tx) => tx.capaRegister.findMany({ where: { siteId, deletedAt: null }, orderBy: { initiatedAt: "desc" } }));
    }
    async listBySource(sourceType, sourceId) {
        return this.prisma.withRls((tx) => tx.capaRegister.findMany({ where: { sourceType, sourceId, deletedAt: null } }));
    }
};
exports.CapaRegisterService = CapaRegisterService;
exports.CapaRegisterService = CapaRegisterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        capa_workflow_bootstrap_service_1.CapaWorkflowBootstrapService])
], CapaRegisterService);
