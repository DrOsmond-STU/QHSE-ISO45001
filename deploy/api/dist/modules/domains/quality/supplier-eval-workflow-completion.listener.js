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
var SupplierEvalWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierEvalWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const supplier_quality_record_service_1 = require("./supplier-quality-record.service");
const SUPPLIER_EVAL_WORKFLOW_ENTITY_TYPE = "supplier_quality_record";
/**
 * Task 5.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * supplier_quality_record. APPROVED -> markApproved() (status APPROVED,
 * correctiveActionRequired dihitung dari rating) + PRD §8 "Supplier rating
 * turun ke Suspended/Disqualified | Quality Manager" (Procurement eksternal
 * via Modul 30 TIDAK diimplementasikan — belum ada modul itu). REJECTED ->
 * kembali DRAFT.
 */
let SupplierEvalWorkflowCompletionListener = SupplierEvalWorkflowCompletionListener_1 = class SupplierEvalWorkflowCompletionListener {
    prisma;
    supplierQualityRecordService;
    notificationService;
    logger = new common_1.Logger(SupplierEvalWorkflowCompletionListener_1.name);
    constructor(prisma, supplierQualityRecordService, notificationService) {
        this.prisma = prisma;
        this.supplierQualityRecordService = supplierQualityRecordService;
        this.notificationService = notificationService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== SUPPLIER_EVAL_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED") {
                    const record = await this.supplierQualityRecordService.markApproved(payload.entityId);
                    if (record.rating === "SUSPENDED" || record.rating === "DISQUALIFIED") {
                        const qualityManagers = await this.prisma.withRls((tx) => tx.user.findMany({
                            where: { tenantId: payload.tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "QUALITY_MANAGER" } } } },
                            select: { id: true },
                        }));
                        for (const qm of qualityManagers) {
                            await this.notificationService.enqueue({
                                eventType: "QUALITY_SUPPLIER_RATING_DOWNGRADED",
                                entityType: "SUPPLIER_QUALITY_RECORD",
                                entityId: record.id,
                                recipientUserId: qm.id,
                                priority: "HIGH",
                                eventCategory: "QUALITY",
                                variables: { supplierName: record.supplierName, rating: record.rating },
                            });
                        }
                    }
                }
                else if (payload.status === "REJECTED") {
                    await this.supplierQualityRecordService.returnToDraft(payload.entityId);
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk supplier_quality_record=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
};
exports.SupplierEvalWorkflowCompletionListener = SupplierEvalWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SupplierEvalWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.SupplierEvalWorkflowCompletionListener = SupplierEvalWorkflowCompletionListener = SupplierEvalWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        supplier_quality_record_service_1.SupplierQualityRecordService,
        notification_service_1.NotificationService])
], SupplierEvalWorkflowCompletionListener);
//# sourceMappingURL=supplier-eval-workflow-completion.listener.js.map