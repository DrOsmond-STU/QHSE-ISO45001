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
var AuditProgramWorkflowCompletionListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditProgramWorkflowCompletionListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const workflow_engine_constants_1 = require("../../../platform/workflow-engine/workflow-engine.constants");
const audit_program_service_1 = require("./audit-program.service");
// Lihat banner comment AuditWorkflowBootstrapService.ensureAuditProgramWorkflowDefinition.
const AUDIT_PROGRAM_WORKFLOW_ENTITY_TYPE = "audit_program";
/**
 * Task 4.1 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * audit_program (pola PERSIS listener modul lain — payload-only, TIDAK
 * PERNAH re-query workflow_instances/workflow_tasks, lihat banner comment
 * WorkflowInstanceCompletedEvent). APPROVED -> AuditProgramService.
 * markApprovedActive() (status->APPROVED). REJECTED -> returnToDraft()
 * (status TETAP DRAFT, workflow_instance_id di-null-kan utk resubmission).
 *
 * TIDAK enqueue notifikasi di sini — PRD §8 baris "Program audit menunggu
 * approval" hanya utk SAAT SUBMIT (AuditProgramService.submitForApproval()
 * TIDAK mengirim notifikasi krn Workflow Engine 0.9 sendiri SUDAH membuat
 * workflow_tasks utk approver, yang jadi sumber "menunggu approval Anda"
 * via mekanisme task generik, bukan notification_templates modul ini) —
 * TIDAK ADA baris §8 "program disetujui/ditolak" sama sekali, gap TDD §26
 * konsisten Emergency Response 3.7.
 */
let AuditProgramWorkflowCompletionListener = AuditProgramWorkflowCompletionListener_1 = class AuditProgramWorkflowCompletionListener {
    programService;
    logger = new common_1.Logger(AuditProgramWorkflowCompletionListener_1.name);
    constructor(programService) {
        this.programService = programService;
    }
    async onWorkflowInstanceCompleted(payload) {
        if (payload.entityType !== AUDIT_PROGRAM_WORKFLOW_ENTITY_TYPE)
            return;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                if (payload.status === "APPROVED") {
                    await this.programService.markApprovedActive(payload.entityId);
                }
                else if (payload.status === "REJECTED") {
                    await this.programService.returnToDraft(payload.entityId);
                }
            }
            catch (err) {
                this.logger.error(`Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk audit_program=${payload.entityId}: ${err instanceof Error ? err.message : err}`);
            }
        });
    }
};
exports.AuditProgramWorkflowCompletionListener = AuditProgramWorkflowCompletionListener;
__decorate([
    (0, event_emitter_1.OnEvent)(workflow_engine_constants_1.WORKFLOW_INSTANCE_COMPLETED_EVENT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditProgramWorkflowCompletionListener.prototype, "onWorkflowInstanceCompleted", null);
exports.AuditProgramWorkflowCompletionListener = AuditProgramWorkflowCompletionListener = AuditProgramWorkflowCompletionListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_program_service_1.AuditProgramService])
], AuditProgramWorkflowCompletionListener);
//# sourceMappingURL=audit-program-workflow-completion.listener.js.map