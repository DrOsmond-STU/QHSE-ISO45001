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
exports.AuditProgramService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const audit_context_1 = require("./audit-context");
const audit_workflow_bootstrap_service_1 = require("./audit-workflow-bootstrap.service");
const audit_program_lifecycle_1 = require("./audit-program-lifecycle");
// Lihat banner comment AuditWorkflowBootstrapService.ensureAuditProgramWorkflowDefinition.
const AUDIT_PROGRAM_WORKFLOW_ENTITY_TYPE = "audit_program";
/**
 * Task 4.1 (Modul 09 §4 poin 1, §3 "Audit Program Owner/MR |
 * audit.program.create"). BELUM ada controller HTTP. audit_programs TIDAK
 * punya status bisnis "UNDER_REVIEW" terpisah (lihat banner comment
 * audit-program-lifecycle.ts) — submitForApproval() TIDAK mengubah status
 * (tetap DRAFT), hanya mengisi workflowInstanceId; AuditProgramWorkflowCompletionListener
 * (task 197) yang mengubah status jadi APPROVED saat workflow selesai.
 */
let AuditProgramService = class AuditProgramService {
    prisma;
    bootstrapService;
    workflowEngineService;
    constructor(prisma, bootstrapService, workflowEngineService) {
        this.prisma = prisma;
        this.bootstrapService = bootstrapService;
        this.workflowEngineService = workflowEngineService;
    }
    async create(input) {
        const createdBy = (0, audit_context_1.requireActorUserId)();
        const tenantId = (0, audit_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const program = await tx.auditProgram.create({
                data: {
                    tenantId,
                    companyId: input.companyId,
                    branchId: input.branchId,
                    programYear: input.programYear,
                    name: input.name,
                    objective: input.objective,
                    status: "DRAFT",
                    createdBy,
                    updatedBy: createdBy,
                },
            });
            await this.createPlanItems(tx, tenantId, program.id, input.planItems, createdBy);
            return program;
        });
    }
    async addPlanItem(auditProgramId, input) {
        const createdBy = (0, audit_context_1.requireActorUserId)();
        const tenantId = (0, audit_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.auditProgramPlanItem.create({
            data: {
                tenantId,
                auditProgramId,
                plannedMonth: input.plannedMonth,
                auditTypeId: input.auditTypeId,
                siteId: input.siteId,
                departmentId: input.departmentId,
                standardReference: input.standardReference,
                plannedLeadAuditorId: input.plannedLeadAuditorId,
                status: "PLANNED",
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async createPlanItems(tx, tenantId, auditProgramId, planItems, createdBy) {
        if (planItems.length === 0)
            return;
        await tx.auditProgramPlanItem.createMany({
            data: planItems.map((item) => ({
                tenantId,
                auditProgramId,
                plannedMonth: item.plannedMonth,
                auditTypeId: item.auditTypeId,
                siteId: item.siteId,
                departmentId: item.departmentId,
                standardReference: item.standardReference,
                plannedLeadAuditorId: item.plannedLeadAuditorId,
                status: "PLANNED",
                createdBy,
                updatedBy: createdBy,
            })),
        });
    }
    async submitForApproval(auditProgramId) {
        const actorId = (0, audit_context_1.requireActorUserId)();
        const program = await this.prisma.withRls((tx) => tx.auditProgram.findUniqueOrThrow({ where: { id: auditProgramId } }));
        if (program.status !== "DRAFT") {
            throw new Error(`audit_programs tidak dapat disubmit — status saat ini ${program.status}, harus DRAFT.`);
        }
        if (program.workflowInstanceId) {
            throw new Error("audit_programs sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
        }
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureAuditProgramWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(AUDIT_PROGRAM_WORKFLOW_ENTITY_TYPE, auditProgramId, definition.id, {});
        return this.prisma.withRls((tx) => tx.auditProgram.update({ where: { id: auditProgramId }, data: { workflowInstanceId: instance.id, updatedBy: actorId } }));
    }
    /**
     * Dipanggil AuditProgramWorkflowCompletionListener saat workflow APPROVED
     * — status->APPROVED. approvedBy SELALU NULL (WorkflowInstanceCompletedEvent
     * tidak punya field actor, re-query workflow_tasks dilarang, pola sama
     * EmergencyResponsePlan.markApprovedActive 3.7).
     */
    async markApprovedActive(auditProgramId) {
        const program = await this.prisma.withRls((tx) => tx.auditProgram.findUniqueOrThrow({ where: { id: auditProgramId } }));
        (0, audit_program_lifecycle_1.validateAuditProgramStatusTransition)(program.status, "APPROVED");
        return this.prisma.withRls((tx) => tx.auditProgram.update({
            where: { id: auditProgramId },
            data: { status: "APPROVED", approvedAt: new Date() },
        }));
    }
    /**
     * Dipanggil listener saat workflow REJECTED — status TETAP DRAFT (enum
     * tidak py nilai REJECTED, lihat banner comment audit-program-lifecycle.ts),
     * workflow_instance_id di-null-kan utk resubmission, pola sama JSA 3.2.
     */
    async returnToDraft(auditProgramId) {
        return this.prisma.withRls((tx) => tx.auditProgram.update({ where: { id: auditProgramId }, data: { workflowInstanceId: null } }));
    }
    async cancel(auditProgramId) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        const program = await this.prisma.withRls((tx) => tx.auditProgram.findUniqueOrThrow({ where: { id: auditProgramId } }));
        (0, audit_program_lifecycle_1.validateAuditProgramStatusTransition)(program.status, "CANCELLED");
        return this.prisma.withRls((tx) => tx.auditProgram.update({ where: { id: auditProgramId }, data: { status: "CANCELLED", updatedBy } }));
    }
    async getById(auditProgramId) {
        return this.prisma.withRls((tx) => tx.auditProgram.findUniqueOrThrow({ where: { id: auditProgramId }, include: { planItems: true } }));
    }
    async listByCompany(companyId) {
        return this.prisma.withRls((tx) => tx.auditProgram.findMany({ where: { companyId, deletedAt: null }, orderBy: { programYear: "desc" } }));
    }
};
exports.AuditProgramService = AuditProgramService;
exports.AuditProgramService = AuditProgramService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_workflow_bootstrap_service_1.AuditWorkflowBootstrapService,
        workflow_engine_service_1.WorkflowEngineService])
], AuditProgramService);
//# sourceMappingURL=audit-program.service.js.map