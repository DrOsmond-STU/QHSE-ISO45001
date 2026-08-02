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
exports.RiskTreatmentPlanService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const risk_matrix_context_1 = require("../matrix/risk-matrix-context");
const risk_treatment_rules_1 = require("./risk-treatment-rules");
const risk_treatment_lifecycle_1 = require("./risk-treatment-lifecycle");
// Task 3.2 (Modul 05 §4.4/§5/§6 BR-06). BELUM ada controller HTTP —
// risk.treatment.manage sudah di-seed RBAC baseline (task 114).
let RiskTreatmentPlanService = class RiskTreatmentPlanService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /** Polymorphic lookup requiresEscalation sesuai source_type — SATU-SATUNYA
     * titik yang tahu cara membaca ketiga tabel sumber, dipakai BR-06. */
    async resolveSourceRequiresEscalation(tx, sourceType, sourceId) {
        if (sourceType === "RISK_REGISTER") {
            const row = await tx.riskRegister.findUniqueOrThrow({ where: { id: sourceId }, select: { requiresEscalation: true } });
            return row.requiresEscalation;
        }
        if (sourceType === "HIRA_LINE") {
            const row = await tx.hiraHazardLine.findUniqueOrThrow({ where: { id: sourceId }, select: { requiresEscalation: true } });
            return row.requiresEscalation;
        }
        const row = await tx.hiradcLine.findUniqueOrThrow({ where: { id: sourceId }, select: { requiresEscalation: true } });
        return row.requiresEscalation;
    }
    async create(input) {
        const createdBy = (0, risk_matrix_context_1.requireActorUserId)();
        const tenantId = (0, risk_matrix_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const sourceRequiresEscalation = await this.resolveSourceRequiresEscalation(tx, input.sourceType, input.sourceId);
            (0, risk_treatment_rules_1.assertAcceptRequiresTopManagementApproval)(input.treatmentStrategy, sourceRequiresEscalation, input.topManagementApprovedBy ?? null);
            return tx.riskTreatmentPlan.create({
                data: {
                    tenantId,
                    sourceType: input.sourceType,
                    sourceId: input.sourceId,
                    treatmentStrategy: input.treatmentStrategy,
                    treatmentDescription: input.treatmentDescription,
                    responsibleUserId: input.responsibleUserId,
                    targetDate: input.targetDate,
                    actionTrackingId: input.actionTrackingId,
                    capaId: input.capaId,
                    status: "PLANNED",
                    topManagementApprovedBy: input.topManagementApprovedBy,
                    topManagementApprovedAt: input.topManagementApprovedBy ? new Date() : undefined,
                    createdBy,
                    updatedBy: createdBy,
                },
            });
        });
    }
    /** PRD §5 "Jika tertaut action_tracking_id, status disinkronkan otomatis
     * dari status action terkait (bukan diedit manual ganda)" — Modul 24
     * (Action Tracking) BELUM ADA di codebase ini, sinkronisasi itu TIDAK
     * bisa terjadi; method ini SELALU jalur manual (gap TDD §26, akan perlu
     * dibatasi/diganti begitu Modul 24 genuinely ada). */
    async updateStatus(riskTreatmentId, status) {
        const updatedBy = (0, risk_matrix_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const plan = await tx.riskTreatmentPlan.findUniqueOrThrow({ where: { id: riskTreatmentId } });
            (0, risk_treatment_lifecycle_1.validateRiskTreatmentStatusTransition)(plan.status, status);
            return tx.riskTreatmentPlan.update({ where: { id: riskTreatmentId }, data: { status, updatedBy } });
        });
    }
    async getById(riskTreatmentId) {
        return this.prisma.withRls((tx) => tx.riskTreatmentPlan.findUniqueOrThrow({ where: { id: riskTreatmentId } }));
    }
    async listBySource(sourceType, sourceId) {
        return this.prisma.withRls((tx) => tx.riskTreatmentPlan.findMany({ where: { sourceType, sourceId, deletedAt: null }, orderBy: { createdAt: "desc" } }));
    }
};
exports.RiskTreatmentPlanService = RiskTreatmentPlanService;
exports.RiskTreatmentPlanService = RiskTreatmentPlanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RiskTreatmentPlanService);
