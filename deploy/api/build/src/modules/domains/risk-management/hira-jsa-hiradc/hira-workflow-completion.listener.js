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
var HiraWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HiraWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const notification_service_1 = require("../../../../platform/notification/notification.service");
const tenant_context_1 = require("../../../../platform/tenancy/tenant-context");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const workflow_engine_constants_1 = require("../../../../platform/workflow-engine/workflow-engine.constants");
const hira_lifecycle_1 = require("./hira-lifecycle");
const HIRA_WORKFLOW_ENTITY_TYPE = "hira_assessment";
/**
 * Task 3.2 — KONSUMEN KETIGA WORKFLOW_INSTANCE_COMPLETED_EVENT (pola PERSIS
 * DocumentWorkflowCompletionListener 2.1/ComplianceEvaluationWorkflowCompletionListener
 * 2.2 — lihat banner comment 2.1 utk rationale race-condition lengkap,
 * TIDAK diulang di sini; payload event sendiri yang dipakai, TIDAK PERNAH
 * re-query workflow_instances/workflow_tasks). APPROVED (baik lewat 2
 * stage MAUPUN 3 stage percabangan EXTREME — listener ini TIDAK PEDULI
 * berapa stage yang dilalui, cuma peduli status FINAL instance) ->
 * IN_REVIEW->APPROVED->ACTIVE SATU TRANSAKSI (APPROVED TIDAK PERNAH
 * ditulis persisten, pola PERSIS DocumentVersionStatus APPROVED->PUBLISHED
 * 2.1). REJECTED -> IN_REVIEW->REQUIRES_REVISION (BUKAN DRAFT literal,
 * status TERSENDIRI yang FUNGSINYA "kembali ke siklus DRAFT" — lihat
 * banner comment hira-lifecycle.ts).
 */
let HiraWorkflowCompletionListener = HiraWorkflowCompletionListener_1 = class HiraWorkflowCompletionListener {
    prisma;
    notificationService;
    logger = new common_1.Logger(HiraWorkflowCompletionListener_1.name);
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== HIRA_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED") {
                    await this.activate(payload.entityId);
                }
                else if (payload.status === "REJECTED") {
                    await this.requireRevision(payload.entityId);
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk hira_assessment=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
    async activate(hiraId) {
        await this.prisma.withRls(async (tx) => {
            const hira = await tx.hiraAssessment.findUniqueOrThrow({ where: { id: hiraId } });
            (0, hira_lifecycle_1.validateHiraAssessmentStatusTransition)(hira.status, "APPROVED");
            (0, hira_lifecycle_1.validateHiraAssessmentStatusTransition)("APPROVED", "ACTIVE");
            await tx.hiraAssessment.update({ where: { id: hiraId }, data: { status: "ACTIVE" } });
        });
    }
    async requireRevision(hiraId) {
        const { createdBy, hiraNumber } = await this.prisma.withRls(async (tx) => {
            const hira = await tx.hiraAssessment.findUniqueOrThrow({ where: { id: hiraId } });
            (0, hira_lifecycle_1.validateHiraAssessmentStatusTransition)(hira.status, "REQUIRES_REVISION");
            const updated = await tx.hiraAssessment.update({ where: { id: hiraId }, data: { status: "REQUIRES_REVISION" } });
            return { createdBy: updated.createdBy, hiraNumber: updated.hiraNumber };
        });
        await this.notificationService.enqueue({
            eventType: "HIRA_REQUIRES_REVISION",
            entityType: "HIRA_ASSESSMENT",
            entityId: hiraId,
            recipientUserId: createdBy,
            priority: "MEDIUM",
            eventCategory: "RISK",
            variables: { hiraNumber },
        });
    }
};
exports.HiraWorkflowCompletionListener = HiraWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HiraWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.HiraWorkflowCompletionListener = HiraWorkflowCompletionListener = HiraWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], HiraWorkflowCompletionListener);
