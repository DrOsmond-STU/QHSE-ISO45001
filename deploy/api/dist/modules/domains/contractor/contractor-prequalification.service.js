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
exports.ContractorPrequalificationService = exports.PREQUALIFICATION_WORKFLOW_ENTITY_TYPE = void 0;
const common_1 = require("@nestjs/common");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const contractor_workflow_bootstrap_service_1 = require("./contractor-workflow-bootstrap.service");
const contractor_context_1 = require("./contractor-context");
const contractor_lifecycle_1 = require("./contractor-lifecycle");
const PREQUALIFICATION_NUMBERING_MODULE_CODE = "CONTRACTOR_PQ";
exports.PREQUALIFICATION_WORKFLOW_ENTITY_TYPE = "contractor_prequalification";
// PRD §4.1 poin 5 "valid_from/valid_until (umumnya 1–2 tahun, dikonfirmasi
// kebijakan tenant)" — TIDAK ADA angka tunggal konkret, diinvent 1 tahun
// (365 hari, batas BAWAH rentang literal, paling konservatif), gap TDD §26.
const DEFAULT_VALIDITY_DAYS = 365;
let ContractorPrequalificationService = class ContractorPrequalificationService {
    prisma;
    numbering;
    workflowEngine;
    workflowBootstrap;
    constructor(prisma, numbering, workflowEngine, workflowBootstrap) {
        this.prisma = prisma;
        this.numbering = numbering;
        this.workflowEngine = workflowEngine;
        this.workflowBootstrap = workflowBootstrap;
    }
    // §4.1 poin 1-2 — registrasi + record prakualifikasi DRAFT.
    async create(input) {
        const tenantId = (0, contractor_context_1.requireTenantId)();
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        await this.workflowBootstrap.ensurePrequalificationNumberingConfig();
        const prequalificationNo = await this.numbering.generateNext(PREQUALIFICATION_NUMBERING_MODULE_CODE, {});
        return this.prisma.withRls((tx) => tx.contractorPrequalification.create({
            data: {
                tenantId,
                contractorId: input.contractorId,
                prequalificationNo,
                prequalificationType: input.prequalificationType,
                scopeOfWork: input.scopeOfWork,
                result: "PENDING",
                status: "DRAFT",
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    // §4.1 poin 2 — checklist dokumen wajib.
    async addDocument(prequalificationId, input) {
        const tenantId = (0, contractor_context_1.requireTenantId)();
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.contractorPrequalificationDocument.create({
            data: {
                tenantId,
                prequalificationId,
                documentType: input.documentType,
                isMandatory: input.isMandatory ?? true,
                documentId: input.documentId,
                status: input.documentId ? "SUBMITTED" : "PENDING",
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    // §4.1 poin 3 — Contractor Coordinator memverifikasi tiap dokumen.
    async verifyDocument(pqDocumentId, status, notes) {
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.contractorPrequalificationDocument.update({
            where: { id: pqDocumentId },
            data: { status, notes, verifiedBy: actorUserId, verifiedAt: new Date(), updatedBy: actorUserId },
        }));
    }
    // §4.1 poin 4 — skor dihitung + hasil diajukan lewat Workflow Engine
    // SATU aksi gabungan (PRD tidak deskripsikan langkah terpisah antara
    // "skor dihitung" dan "diajukan", pola sama Calibration submitForReview()
    // 6.2). BR-05 ditegakkan DI SINI (SEBELUM workflow dimulai) HANYA jika
    // `result` diusulkan PASS/CONDITIONAL_PASS — FAIL TIDAK butuh dokumen
    // lengkap (PRD §6 BR-05 literal HANYA sebut "result=PASS/CONDITIONAL_PASS
    // hanya dapat ditetapkan jika..." — FAIL tidak disyaratkan apa pun).
    async submitForReview(id, input) {
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        if (input.result === "PASS" || input.result === "CONDITIONAL_PASS") {
            const documents = await this.prisma.withRls((tx) => tx.contractorPrequalificationDocument.findMany({ where: { prequalificationId: id } }));
            if (!(0, contractor_lifecycle_1.areMandatoryDocumentsVerified)(documents)) {
                throw new common_1.BadRequestException("BR-05 — result PASS/CONDITIONAL_PASS tidak dapat ditetapkan: masih ada dokumen wajib yang belum VERIFIED.");
            }
        }
        const definition = await this.prisma.withRls((tx) => this.workflowBootstrap.ensurePrequalificationWorkflowDefinition(tx));
        const instance = await this.workflowEngine.startInstance(exports.PREQUALIFICATION_WORKFLOW_ENTITY_TYPE, id, definition.id, { result: input.result });
        return this.prisma.withRls((tx) => tx.contractorPrequalification.update({
            where: { id },
            data: {
                technicalCapabilityScore: input.technicalCapabilityScore,
                hseCapabilityScore: input.hseCapabilityScore,
                financialCapabilityScore: input.financialCapabilityScore,
                overallScore: input.overallScore,
                minPassingScore: input.minPassingScore,
                result: input.result,
                evaluatedBy: actorUserId,
                evaluationDate: new Date(),
                status: "UNDER_REVIEW",
                workflowInstanceId: instance.id,
                updatedBy: actorUserId,
            },
        }));
    }
    // Dipanggil ContractorPrequalificationCompletionListener — LISTENER-DRIVEN,
    // TIDAK ADA actor manusia di context titik ini (pola sama Calibration
    // onReviewCompleted() 6.2/Asset disposal listener 6.1) — `updatedBy`
    // memakai `evaluatedBy` row itu sendiri (evaluator manusia asli yang
    // mengajukan), BUKAN requireActorUserId(). §4.1 poin 5 — APPROVED +
    // result PASS/CONDITIONAL_PASS -> contractors.status=PREQUALIFIED +
    // valid_from/valid_until (cascade DILAKUKAN listener, BUKAN service ini,
    // dipisah biar service ini tidak circular-import ContractorService).
    async onReviewCompleted(id, approved) {
        const existing = await this.prisma.withRls((tx) => tx.contractorPrequalification.findUniqueOrThrow({ where: { id } }));
        const updatedBy = existing.evaluatedBy ?? existing.createdBy;
        if (!approved) {
            return this.prisma.withRls((tx) => tx.contractorPrequalification.update({ where: { id }, data: { status: "REJECTED", workflowInstanceId: null, updatedBy } }));
        }
        const validFrom = new Date();
        const validUntil = new Date(validFrom.getTime() + DEFAULT_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
        return this.prisma.withRls((tx) => tx.contractorPrequalification.update({
            where: { id },
            data: { status: "APPROVED", validFrom, validUntil, workflowInstanceId: null, updatedBy },
        }));
    }
    async getById(id) {
        return this.prisma.withRls((tx) => tx.contractorPrequalification.findUniqueOrThrow({ where: { id } }));
    }
    async listDocuments(prequalificationId) {
        return this.prisma.withRls((tx) => tx.contractorPrequalificationDocument.findMany({ where: { prequalificationId } }));
    }
};
exports.ContractorPrequalificationService = ContractorPrequalificationService;
exports.ContractorPrequalificationService = ContractorPrequalificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        workflow_engine_service_1.WorkflowEngineService,
        contractor_workflow_bootstrap_service_1.ContractorWorkflowBootstrapService])
], ContractorPrequalificationService);
//# sourceMappingURL=contractor-prequalification.service.js.map