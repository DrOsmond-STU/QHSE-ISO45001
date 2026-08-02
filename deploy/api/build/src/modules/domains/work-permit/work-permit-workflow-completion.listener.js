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
var WorkPermitWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkPermitWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const notification_service_1 = require("../../../platform/notification/notification.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const work_permit_approval_cache_service_1 = require("./work-permit-approval-cache.service");
const work_permit_lifecycle_1 = require("./work-permit-lifecycle");
const WORK_PERMIT_WORKFLOW_ENTITY_TYPE = "work_permit";
/**
 * Task 3.3 — KONSUMEN KEENAM WORKFLOW_INSTANCE_COMPLETED_EVENT (pola PERSIS
 * listener HIRA/JSA/HIRADC 3.2/DMS 2.1/Compliance 2.2 — payload-only,
 * TIDAK PERNAH re-query workflow_instances/workflow_tasks, lihat banner
 * comment race-condition lengkap di DocumentWorkflowCompletionListener 2.1).
 * APPROVED (baik lewat 1 stage MAUPUN 2 stage percabangan BR-04 — listener
 * ini TIDAK PEDULI berapa stage yang dilalui) -> status=APPROVED (BUKAN
 * ACTIVE — aktivasi lapis TERPISAH via WorkPermitService.activate(), gated
 * BR-02/BR-03, PRD tidak menyebut auto-activate). REJECTED -> status=
 * REJECTED (TERMINAL — beda dari HIRA REQUIRES_REVISION/JSA-tetap-DRAFT,
 * work_permits TIDAK py status "kembali revisi" tersendiri di enum literal
 * PRD §5; teks PRD §4 poin 4 "Approve/Return ke Requester" utk Stage 1
 * genuinely bisa dibaca sbg loop-back DRAFT — interpretasi REJECTED
 * terminal dipilih supaya nilai enum itu genuinely reachable, didokumentasikan
 * ambigu di work-permit-lifecycle.ts, BUKAN disembunyikan). Me-refresh
 * work_permit_approvals (cache read-model, task 135) di KEDUA jalur.
 */
let WorkPermitWorkflowCompletionListener = WorkPermitWorkflowCompletionListener_1 = class WorkPermitWorkflowCompletionListener {
    prisma;
    notificationService;
    approvalCacheService;
    logger = new common_1.Logger(WorkPermitWorkflowCompletionListener_1.name);
    constructor(prisma, notificationService, approvalCacheService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
        this.approvalCacheService = approvalCacheService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== WORK_PERMIT_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED") {
                    await this.markApproved(payload.entityId);
                }
                else if (payload.status === "REJECTED") {
                    await this.markRejected(payload.entityId);
                }
                await this.approvalCacheService.refresh(payload.entityId);
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk work_permit=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
    async markApproved(workPermitId) {
        const { requesterId, permitNumber } = await this.prisma.withRls(async (tx) => {
            const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId } });
            (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)(permit.status, "APPROVED");
            const updated = await tx.workPermit.update({ where: { id: workPermitId }, data: { status: "APPROVED" } });
            return { requesterId: updated.requesterId, permitNumber: updated.permitNumber };
        });
        // PRD §8 "Permit disetujui penuh -> Requester -> 'Permit {permit_number}
        // disetujui, siap diaktifkan'".
        await this.notificationService.enqueue({
            eventType: "WORK_PERMIT_APPROVED",
            entityType: "WORK_PERMIT",
            entityId: workPermitId,
            recipientUserId: requesterId,
            priority: "MEDIUM",
            eventCategory: "WORK_PERMIT",
            variables: { permitNumber },
        });
    }
    async markRejected(workPermitId) {
        const { requesterId, permitNumber } = await this.prisma.withRls(async (tx) => {
            const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId } });
            (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)(permit.status, "REJECTED");
            const updated = await tx.workPermit.update({ where: { id: workPermitId }, data: { status: "REJECTED" } });
            return { requesterId: updated.requesterId, permitNumber: updated.permitNumber };
        });
        // BEYOND baris literal PRD §8 (TIDAK ADA baris "permit rejected"
        // eksplisit di tabel notifikasi) — analog WORK_PERMIT_APPROVED di atas,
        // pola PERSIS DOCUMENT_VERSION_REJECTED (2.1)/COMPLIANCE_EVALUATION_REJECTED
        // (2.2)/HIRA_REQUIRES_REVISION+JSA_REJECTED+HIRADC_REJECTED (3.2).
        await this.notificationService.enqueue({
            eventType: "WORK_PERMIT_REJECTED",
            entityType: "WORK_PERMIT",
            entityId: workPermitId,
            recipientUserId: requesterId,
            priority: "MEDIUM",
            eventCategory: "WORK_PERMIT",
            variables: { permitNumber },
        });
    }
};
exports.WorkPermitWorkflowCompletionListener = WorkPermitWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WorkPermitWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.WorkPermitWorkflowCompletionListener = WorkPermitWorkflowCompletionListener = WorkPermitWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        work_permit_approval_cache_service_1.WorkPermitApprovalCacheService])
], WorkPermitWorkflowCompletionListener);
