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
var ComplianceEvaluationWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceEvaluationWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const notification_service_1 = require("../../../platform/notification/notification.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const compliance_evaluation_lifecycle_1 = require("./compliance-evaluation-lifecycle");
const COMPLIANCE_WORKFLOW_ENTITY_TYPE = "compliance_evaluation";
/**
 * Task 2.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT KEDUA (pola PERSIS
 * DocumentWorkflowCompletionListener, 2.1 — lihat banner comment file itu
 * utk rationale lengkap soal race condition emit()-sebelum-commit yang
 * SUDAH diverifikasi empiris di task 2.1, TIDAK diulang di sini). APPROVED
 * -> REVIEWED (menunggu close() eksplisit, BR-03 gate — lihat
 * ComplianceEvaluationService.close()). REJECTED -> DRAFT (BUKAN status
 * terminal terpisah — ComplianceEvaluationStatus tidak punya nilai
 * REJECTED sama sekali, beda dari DocumentVersionStatus 2.1) supaya
 * evaluator bisa revisi & submit ulang.
 */
let ComplianceEvaluationWorkflowCompletionListener = ComplianceEvaluationWorkflowCompletionListener_1 = class ComplianceEvaluationWorkflowCompletionListener {
    prisma;
    notificationService;
    logger = new common_1.Logger(ComplianceEvaluationWorkflowCompletionListener_1.name);
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== COMPLIANCE_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED") {
                    await this.markReviewed(payload.entityId);
                }
                else if (payload.status === "REJECTED") {
                    await this.revertToDraft(payload.entityId);
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk compliance_evaluation=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
    async markReviewed(evaluationId) {
        await this.prisma.withRls(async (tx) => {
            const evaluation = await tx.complianceEvaluation.findUniqueOrThrow({ where: { id: evaluationId } });
            (0, compliance_evaluation_lifecycle_1.validateComplianceEvaluationStatusTransition)(evaluation.status, "REVIEWED");
            await tx.complianceEvaluation.update({ where: { id: evaluationId }, data: { status: "REVIEWED" } });
        });
    }
    async revertToDraft(evaluationId) {
        const { evaluatorUserId, evaluationNumber } = await this.prisma.withRls(async (tx) => {
            const evaluation = await tx.complianceEvaluation.findUniqueOrThrow({ where: { id: evaluationId } });
            (0, compliance_evaluation_lifecycle_1.validateComplianceEvaluationStatusTransition)(evaluation.status, "DRAFT");
            const updated = await tx.complianceEvaluation.update({ where: { id: evaluationId }, data: { status: "DRAFT" } });
            return { evaluatorUserId: updated.evaluatorUserId, evaluationNumber: updated.evaluationNumber };
        });
        await this.notificationService.enqueue({
            eventType: "COMPLIANCE_EVALUATION_REJECTED",
            entityType: "COMPLIANCE_EVALUATION",
            entityId: evaluationId,
            recipientUserId: evaluatorUserId,
            priority: "MEDIUM",
            eventCategory: "COMPLIANCE",
            variables: { evaluationNumber },
        });
    }
};
exports.ComplianceEvaluationWorkflowCompletionListener = ComplianceEvaluationWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ComplianceEvaluationWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.ComplianceEvaluationWorkflowCompletionListener = ComplianceEvaluationWorkflowCompletionListener = ComplianceEvaluationWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], ComplianceEvaluationWorkflowCompletionListener);
//# sourceMappingURL=compliance-evaluation-workflow-completion.listener.js.map