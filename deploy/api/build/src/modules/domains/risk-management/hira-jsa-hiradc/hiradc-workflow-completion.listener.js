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
var HiradcWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HiradcWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const notification_service_1 = require("../../../../platform/notification/notification.service");
const tenant_context_1 = require("../../../../platform/tenancy/tenant-context");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const workflow_engine_constants_1 = require("../../../../platform/workflow-engine/workflow-engine.constants");
const hiradc_lifecycle_1 = require("./hiradc-lifecycle");
const HIRADC_WORKFLOW_ENTITY_TYPE = "hiradc_record";
/**
 * Task 3.2 — KONSUMEN KELIMA WORKFLOW_INSTANCE_COMPLETED_EVENT. Workflow
 * instance APPROVED -> hiradc_records.status = VERIFIED (BUKAN APPROVED —
 * stage tunggalnya bernama "Verifikasi Supervisor", PRD §4.3 poin 2, jalur
 * workflow ini merealisasikan VERIFIKASI, bukan approval final; VERIFIED->APPROVED
 * lapis opsional terpisah lewat HiradcRecordService.approve(), TANPA
 * workflow tambahan). REJECTED -> status TETAP DRAFT, null-kan
 * workflowInstanceId supaya bisa diajukan verifikasi ulang (pola PERSIS
 * JsaWorkflowCompletionListener).
 */
let HiradcWorkflowCompletionListener = HiradcWorkflowCompletionListener_1 = class HiradcWorkflowCompletionListener {
    prisma;
    notificationService;
    logger = new common_1.Logger(HiradcWorkflowCompletionListener_1.name);
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== HIRADC_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED") {
                    await this.markVerified(payload.entityId);
                }
                else if (payload.status === "REJECTED") {
                    await this.resetForResubmission(payload.entityId);
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk hiradc_record=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
    async markVerified(hiradcId) {
        await this.prisma.withRls(async (tx) => {
            const hiradc = await tx.hiradcRecord.findUniqueOrThrow({ where: { id: hiradcId } });
            (0, hiradc_lifecycle_1.validateHiradcRecordStatusTransition)(hiradc.status, "VERIFIED");
            await tx.hiradcRecord.update({ where: { id: hiradcId }, data: { status: "VERIFIED" } });
        });
    }
    async resetForResubmission(hiradcId) {
        const { performedBy, hiradcNumber } = await this.prisma.withRls(async (tx) => {
            const updated = await tx.hiradcRecord.update({ where: { id: hiradcId }, data: { workflowInstanceId: null } });
            return { performedBy: updated.performedBy, hiradcNumber: updated.hiradcNumber };
        });
        await this.notificationService.enqueue({
            eventType: "HIRADC_REJECTED",
            entityType: "HIRADC_RECORD",
            entityId: hiradcId,
            recipientUserId: performedBy,
            priority: "MEDIUM",
            eventCategory: "RISK",
            variables: { hiradcNumber },
        });
    }
};
exports.HiradcWorkflowCompletionListener = HiradcWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HiradcWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.HiradcWorkflowCompletionListener = HiradcWorkflowCompletionListener = HiradcWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], HiradcWorkflowCompletionListener);
