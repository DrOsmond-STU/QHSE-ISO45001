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
var WorkPermitExtensionWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkPermitExtensionWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const notification_service_1 = require("../../../platform/notification/notification.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const work_permit_lifecycle_1 = require("./work-permit-lifecycle");
const WORK_PERMIT_EXTENSION_WORKFLOW_ENTITY_TYPE = "work_permit_extension";
/**
 * Task 3.4 — KONSUMEN KETUJUH WORKFLOW_INSTANCE_COMPLETED_EVENT (pola
 * PERSIS listener lain modul ini/3.2/2.1/2.2 — payload-only, TIDAK PERNAH
 * re-query workflow_instances/workflow_tasks). APPROVED ->
 * work_permit_extensions.status=APPROVED, work_permits.plannedEndDatetime
 * DIPERBARUI ke requestedNewEndDatetime, status EXTENSION_REQUESTED->ACTIVE.
 * REJECTED -> work_permit_extensions.status=REJECTED, work_permits.status
 * EXTENSION_REQUESTED->ACTIVE TANPA mengubah plannedEndDatetime (extension
 * ditolak, jadwal asli tetap berlaku — permit bisa segera EXPIRED kalau
 * planned_end_datetime asli sudah/segera terlampaui, work-permit-expiry-scan
 * yang akan menangkapnya pada scan berikutnya).
 */
let WorkPermitExtensionWorkflowCompletionListener = WorkPermitExtensionWorkflowCompletionListener_1 = class WorkPermitExtensionWorkflowCompletionListener {
    prisma;
    notificationService;
    logger = new common_1.Logger(WorkPermitExtensionWorkflowCompletionListener_1.name);
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== WORK_PERMIT_EXTENSION_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED") {
                    await this.markApproved(payload.entityId);
                }
                else if (payload.status === "REJECTED") {
                    await this.markRejected(payload.entityId);
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk work_permit_extension=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
    async markApproved(extensionId) {
        const { permitNumber, requestedBy } = await this.prisma.withRls(async (tx) => {
            const extension = await tx.workPermitExtension.update({ where: { id: extensionId }, data: { status: "APPROVED" } });
            const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: extension.workPermitId } });
            (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)(permit.status, "ACTIVE");
            const updatedPermit = await tx.workPermit.update({
                where: { id: extension.workPermitId },
                data: { status: "ACTIVE", plannedEndDatetime: extension.requestedNewEndDatetime },
            });
            return { permitNumber: updatedPermit.permitNumber, requestedBy: extension.requestedBy };
        });
        await this.notificationService.enqueue({
            eventType: "WORK_PERMIT_EXTENSION_APPROVED",
            entityType: "WORK_PERMIT_EXTENSION",
            entityId: extensionId,
            recipientUserId: requestedBy,
            priority: "MEDIUM",
            eventCategory: "WORK_PERMIT",
            variables: { permitNumber },
        });
    }
    async markRejected(extensionId) {
        const { permitNumber, requestedBy } = await this.prisma.withRls(async (tx) => {
            const extension = await tx.workPermitExtension.update({ where: { id: extensionId }, data: { status: "REJECTED" } });
            const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: extension.workPermitId } });
            (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)(permit.status, "ACTIVE");
            const updatedPermit = await tx.workPermit.update({ where: { id: extension.workPermitId }, data: { status: "ACTIVE" } });
            return { permitNumber: updatedPermit.permitNumber, requestedBy: extension.requestedBy };
        });
        await this.notificationService.enqueue({
            eventType: "WORK_PERMIT_EXTENSION_REJECTED",
            entityType: "WORK_PERMIT_EXTENSION",
            entityId: extensionId,
            recipientUserId: requestedBy,
            priority: "MEDIUM",
            eventCategory: "WORK_PERMIT",
            variables: { permitNumber },
        });
    }
};
exports.WorkPermitExtensionWorkflowCompletionListener = WorkPermitExtensionWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WorkPermitExtensionWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.WorkPermitExtensionWorkflowCompletionListener = WorkPermitExtensionWorkflowCompletionListener = WorkPermitExtensionWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], WorkPermitExtensionWorkflowCompletionListener);
