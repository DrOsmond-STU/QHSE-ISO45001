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
exports.WorkPermitExtensionService = void 0;
const common_1 = require("@nestjs/common");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const work_permit_context_1 = require("./work-permit-context");
const work_permit_extension_rules_1 = require("./work-permit-extension-rules");
const work_permit_lifecycle_1 = require("./work-permit-lifecycle");
const work_permit_segregation_of_duty_1 = require("./work-permit-segregation-of-duty");
const work_permit_workflow_bootstrap_service_1 = require("./work-permit-workflow-bootstrap.service");
const WORK_PERMIT_EXTENSION_WORKFLOW_ENTITY_TYPE = "work_permit_extension";
// Task 3.4 (Modul 06 §4 poin 8/§5/§6 BR-07). BELUM ada controller HTTP —
// work_permit.extension.* sudah di-seed RBAC baseline (task 142).
let WorkPermitExtensionService = class WorkPermitExtensionService {
    prisma;
    workflowEngineService;
    bootstrapService;
    constructor(prisma, workflowEngineService, bootstrapService) {
        this.prisma = prisma;
        this.workflowEngineService = workflowEngineService;
        this.bootstrapService = bootstrapService;
    }
    /**
     * BR-07 (gate pengajuan) + PRD §4 poin 8. EMPAT transaksi TERPISAH,
     * alasan PERSIS HiraAssessmentService.submitForApproval() (3.2) —
     * gate check, create baris extension, ensure workflow definition +
     * startInstance, lalu commit workflowInstanceId + transisi
     * work_permits.status ACTIVE->EXTENSION_REQUESTED.
     */
    async request(input) {
        const createdBy = (0, work_permit_context_1.requireActorUserId)();
        const tenantId = (0, work_permit_context_1.requireTenantId)();
        await this.prisma.withRls(async (tx) => {
            const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: input.workPermitId } });
            if (permit.status !== "ACTIVE") {
                throw new common_1.BadRequestException(`work_permits berstatus ${permit.status} tidak dapat mengajukan extension (wajib ACTIVE).`);
            }
            const type = await tx.workPermitType.findUniqueOrThrow({ where: { id: permit.workPermitTypeId }, select: { maxExtensionCount: true } });
            const existingCount = await tx.workPermitExtension.count({ where: { workPermitId: input.workPermitId } });
            (0, work_permit_extension_rules_1.assertExtensionRequestAllowed)(new Date(), permit.plannedEndDatetime, existingCount, type.maxExtensionCount);
        });
        const extension = await this.prisma.withRls((tx) => tx.workPermitExtension.create({
            data: {
                tenantId,
                workPermitId: input.workPermitId,
                requestedNewEndDatetime: input.requestedNewEndDatetime,
                reason: input.reason,
                gasRetestRequired: input.gasRetestRequired,
                status: "PENDING",
                requestedBy: input.requestedBy,
                requestedAt: new Date(),
                createdBy,
                updatedBy: createdBy,
            },
        }));
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureExtensionWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(WORK_PERMIT_EXTENSION_WORKFLOW_ENTITY_TYPE, extension.id, definition.id, {
            gasRetestRequired: input.gasRetestRequired,
        });
        return this.prisma.withRls(async (tx) => {
            await tx.workPermitExtension.update({ where: { id: extension.id }, data: { workflowInstanceId: instance.id } });
            const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: input.workPermitId } });
            (0, work_permit_lifecycle_1.validateWorkPermitStatusTransition)(permit.status, "EXTENSION_REQUESTED");
            await tx.workPermit.update({ where: { id: input.workPermitId }, data: { status: "EXTENSION_REQUESTED", updatedBy: createdBy } });
            return tx.workPermitExtension.findUniqueOrThrow({ where: { id: extension.id } });
        });
    }
    /**
     * BR-09 — wrapper WAJIB, pola PERSIS WorkPermitService.actOnApprovalTask()
     * (3.3, gap TDD §26 #111) — segregation of duty berlaku SAMA utk
     * approval extension (mengacu requester PERMIT INDUK, bukan extension
     * itu sendiri yang tidak py "requester" terpisah). Sekaligus mencatat
     * decided_by/decided_at "aktor TERAKHIR bertindak" pada SETIAP aksi
     * (bukan hanya final) — work_permit_extensions HANYA py SATU kolom
     * decided_by (beda dari work_permit_approvals cache yang pisah
     * issuer/hse), jadi utk workflow 2-stage kolom ini tertimpa aktor stage
     * kedua — dibaca sbg semantik paling masuk akal utk kolom tunggal.
     */
    async actOnExtensionTask(taskId, action, comment, actingUserId) {
        const task = await this.prisma.withRls((tx) => tx.workflowTask.findUniqueOrThrow({ where: { id: taskId } }));
        const instance = await this.prisma.withRls((tx) => tx.workflowInstance.findUniqueOrThrow({ where: { id: task.instanceId } }));
        if (instance.entityType === WORK_PERMIT_EXTENSION_WORKFLOW_ENTITY_TYPE) {
            const extension = await this.prisma.withRls((tx) => tx.workPermitExtension.findUniqueOrThrow({ where: { id: instance.entityId } }));
            const permit = await this.prisma.withRls((tx) => tx.workPermit.findUniqueOrThrow({ where: { id: extension.workPermitId }, select: { requesterId: true } }));
            (0, work_permit_segregation_of_duty_1.assertRequesterNotApprover)(permit.requesterId, actingUserId);
            await this.prisma.withRls((tx) => tx.workPermitExtension.update({ where: { id: extension.id }, data: { decidedBy: actingUserId, decidedAt: new Date() } }));
        }
        return this.workflowEngineService.actOnTask(taskId, action, comment, actingUserId);
    }
    async getById(extensionId) {
        return this.prisma.withRls((tx) => tx.workPermitExtension.findUniqueOrThrow({ where: { id: extensionId } }));
    }
    async listByPermit(workPermitId) {
        return this.prisma.withRls((tx) => tx.workPermitExtension.findMany({ where: { workPermitId }, orderBy: { requestedAt: "desc" } }));
    }
};
exports.WorkPermitExtensionService = WorkPermitExtensionService;
exports.WorkPermitExtensionService = WorkPermitExtensionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        workflow_engine_service_1.WorkflowEngineService,
        work_permit_workflow_bootstrap_service_1.WorkPermitWorkflowBootstrapService])
], WorkPermitExtensionService);
