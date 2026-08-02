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
exports.RiskRegisterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const numbering_service_1 = require("../../../../platform/numbering/numbering.service");
const risk_matrix_context_1 = require("../matrix/risk-matrix-context");
const risk_matrix_lookup_1 = require("../matrix/risk-matrix-lookup");
const risk_register_lifecycle_1 = require("./risk-register-lifecycle");
const risk_workflow_bootstrap_service_1 = require("./risk-workflow-bootstrap.service");
const RISK_CORP_NUMBERING_MODULE_CODE = "RISK_CORP";
// Task 3.2 (Modul 05 §4.4/§5/§6 BR-01/05). BELUM ada controller HTTP —
// risk.corporate_risk.* sudah di-seed RBAC baseline (task 114).
let RiskRegisterService = class RiskRegisterService {
    prisma;
    numberingService;
    bootstrapService;
    constructor(prisma, numberingService, bootstrapService) {
        this.prisma = prisma;
        this.numberingService = numberingService;
        this.bootstrapService = bootstrapService;
    }
    /**
     * BR-01 (inherent+residual dihitung otomatis dari risk_matrix_cells) +
     * risk_appetite_status DITURUNKAN dari requiresEscalation residual (TRUE
     * -> EXCEEDS_APPETITE, FALSE -> WITHIN_APPETITE) — PRD §5 tidak mengatur
     * bagaimana kolom ini diisi eksplisit, diturunkan otomatis dari flag
     * terstruktur yang SAMA dipakai BR-06 (konsisten satu sumber kebenaran,
     * bukan input manual terpisah yang bisa tidak sinkron).
     */
    async create(input) {
        const createdBy = (0, risk_matrix_context_1.requireActorUserId)();
        const tenantId = (0, risk_matrix_context_1.requireTenantId)();
        await this.bootstrapService.ensureRiskCorpNumberingConfig();
        const riskNumber = await this.numberingService.generateNext(RISK_CORP_NUMBERING_MODULE_CODE);
        return this.prisma.withRls(async (tx) => {
            const cells = await tx.riskMatrixCell.findMany({ where: { riskMatrixConfigId: input.riskMatrixConfigId } });
            const inherent = (0, risk_matrix_lookup_1.resolveRiskScore)(cells, input.likelihoodInherent, input.severityInherent);
            const residual = (0, risk_matrix_lookup_1.resolveRiskScore)(cells, input.likelihoodResidual, input.severityResidual);
            return tx.riskRegister.create({
                data: {
                    tenantId,
                    riskNumber,
                    companyId: input.companyId,
                    riskCategory: input.riskCategory,
                    riskTitle: input.riskTitle,
                    riskDescription: input.riskDescription,
                    riskOwnerUserId: input.riskOwnerUserId,
                    riskMatrixConfigId: input.riskMatrixConfigId,
                    likelihoodInherent: input.likelihoodInherent,
                    severityInherent: input.severityInherent,
                    riskScoreInherent: inherent.riskScore,
                    riskLevelInherent: inherent.riskLevel,
                    currentControls: input.currentControls,
                    likelihoodResidual: input.likelihoodResidual,
                    severityResidual: input.severityResidual,
                    riskScoreResidual: residual.riskScore,
                    riskLevelResidual: residual.riskLevel,
                    requiresEscalation: residual.requiresEscalation,
                    riskAppetiteStatus: residual.requiresEscalation ? "EXCEEDS_APPETITE" : "WITHIN_APPETITE",
                    identifiedDate: input.identifiedDate,
                    nextReviewDate: input.nextReviewDate,
                    status: "IDENTIFIED",
                    createdBy,
                    updatedBy: createdBy,
                },
            });
        });
    }
    /** Reasesmen residual (kontrol baru berjalan) — riskScoreInherent TIDAK
     * pernah berubah (identifikasi risiko awal, historis), hanya sisi
     * residual yang direvisi. */
    async updateResidual(riskRegisterId, input) {
        const updatedBy = (0, risk_matrix_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const risk = await tx.riskRegister.findUniqueOrThrow({ where: { id: riskRegisterId } });
            const cells = await tx.riskMatrixCell.findMany({ where: { riskMatrixConfigId: risk.riskMatrixConfigId } });
            const residual = (0, risk_matrix_lookup_1.resolveRiskScore)(cells, input.likelihoodResidual, input.severityResidual);
            return tx.riskRegister.update({
                where: { id: riskRegisterId },
                data: {
                    likelihoodResidual: input.likelihoodResidual,
                    severityResidual: input.severityResidual,
                    riskScoreResidual: residual.riskScore,
                    riskLevelResidual: residual.riskLevel,
                    requiresEscalation: residual.requiresEscalation,
                    riskAppetiteStatus: residual.requiresEscalation ? "EXCEEDS_APPETITE" : "WITHIN_APPETITE",
                    currentControls: input.currentControls,
                    updatedBy,
                },
            });
        });
    }
    async advanceStatus(riskRegisterId, status) {
        const updatedBy = (0, risk_matrix_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const risk = await tx.riskRegister.findUniqueOrThrow({ where: { id: riskRegisterId } });
            (0, risk_register_lifecycle_1.validateRiskRegisterStatusTransition)(risk.status, status);
            return tx.riskRegister.update({ where: { id: riskRegisterId }, data: { status, updatedBy } });
        });
    }
    async getById(riskRegisterId) {
        return this.prisma.withRls((tx) => tx.riskRegister.findUniqueOrThrow({ where: { id: riskRegisterId } }));
    }
    /** BR-05 (PRD §6) — review berkala, reset overdueNotifiedAt (siklus
     * overdue "selesai" begitu review genuinely dilakukan), pola PERSIS
     * ComplianceEvaluationService.close() (2.2) mereset kolom due/overdue
     * sejenis. */
    async recordReview(riskRegisterId, nextReviewDate) {
        const updatedBy = (0, risk_matrix_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.riskRegister.update({
            where: { id: riskRegisterId },
            data: { lastReviewDate: new Date(), nextReviewDate, overdueNotifiedAt: null, updatedBy },
        }));
    }
};
exports.RiskRegisterService = RiskRegisterService;
exports.RiskRegisterService = RiskRegisterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        risk_workflow_bootstrap_service_1.RiskWorkflowBootstrapService])
], RiskRegisterService);
//# sourceMappingURL=risk-register.service.js.map