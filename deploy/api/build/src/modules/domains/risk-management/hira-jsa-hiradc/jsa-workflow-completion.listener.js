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
var JsaWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsaWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const notification_service_1 = require("../../../../platform/notification/notification.service");
const tenant_context_1 = require("../../../../platform/tenancy/tenant-context");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const workflow_engine_constants_1 = require("../../../../platform/workflow-engine/workflow-engine.constants");
const jsa_lifecycle_1 = require("./jsa-lifecycle");
const JSA_WORKFLOW_ENTITY_TYPE = "jsa_record";
/**
 * Task 3.2 — KONSUMEN KEEMPAT WORKFLOW_INSTANCE_COMPLETED_EVENT (pola
 * PERSIS listener lain modul ini/2.1/2.2). APPROVED -> DRAFT->APPROVED->ACTIVE
 * SATU TRANSAKSI (APPROVED tidak pernah persisten, sama pola HIRA/DMS).
 * REJECTED -> status TETAP DRAFT (tidak pernah "keluar" dari situ, lihat
 * banner comment jsa-lifecycle.ts) — cukup null-kan workflowInstanceId
 * (unique constraint TIDAK masalah diisi ulang instance BARU saat
 * disubmit lagi) supaya JsaRecordService.submitForApproval() bisa dipanggil
 * ulang, TIDAK ADA transisi status utk divalidasi di jalur ini.
 */
let JsaWorkflowCompletionListener = JsaWorkflowCompletionListener_1 = class JsaWorkflowCompletionListener {
    prisma;
    notificationService;
    logger = new common_1.Logger(JsaWorkflowCompletionListener_1.name);
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== JSA_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED") {
                    await this.activate(payload.entityId);
                }
                else if (payload.status === "REJECTED") {
                    await this.resetForResubmission(payload.entityId);
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk jsa_record=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
    async activate(jsaId) {
        await this.prisma.withRls(async (tx) => {
            const jsa = await tx.jsaRecord.findUniqueOrThrow({ where: { id: jsaId } });
            (0, jsa_lifecycle_1.validateJsaRecordStatusTransition)(jsa.status, "APPROVED");
            (0, jsa_lifecycle_1.validateJsaRecordStatusTransition)("APPROVED", "ACTIVE");
            await tx.jsaRecord.update({ where: { id: jsaId }, data: { status: "ACTIVE" } });
        });
    }
    async resetForResubmission(jsaId) {
        const { preparedBy, jsaNumber } = await this.prisma.withRls(async (tx) => {
            const updated = await tx.jsaRecord.update({ where: { id: jsaId }, data: { workflowInstanceId: null } });
            return { preparedBy: updated.preparedBy, jsaNumber: updated.jsaNumber };
        });
        await this.notificationService.enqueue({
            eventType: "JSA_REJECTED",
            entityType: "JSA_RECORD",
            entityId: jsaId,
            recipientUserId: preparedBy,
            priority: "MEDIUM",
            eventCategory: "RISK",
            variables: { jsaNumber },
        });
    }
};
exports.JsaWorkflowCompletionListener = JsaWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JsaWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.JsaWorkflowCompletionListener = JsaWorkflowCompletionListener = JsaWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], JsaWorkflowCompletionListener);
