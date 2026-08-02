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
exports.CapaActionPlanService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const capa_context_1 = require("./capa-context");
const capa_action_plan_rules_1 = require("./capa-action-plan-rules");
const capa_register_lifecycle_1 = require("./capa-register-lifecycle");
const capa_workflow_bootstrap_service_1 = require("./capa-workflow-bootstrap.service");
const capa_register_service_1 = require("./capa-register.service");
const capa_approval_cache_service_1 = require("./capa-approval-cache.service");
// PRD §4 poin 5 literal "entity_type=capa_action_plan" — TAPI entityId DI
// SINI adalah capa_register.id, BUKAN baris capa_action_plans manapun
// (deviasi SADAR dari konvensi "entity_type namai tabel target LANGSUNG"
// dipakai modul lain, mis. DMS document_version/Audit audit_report) —
// SATU submission mencakup SELURUH capa_action_plans milik CAPA itu
// (bisa >1 baris), TIDAK ADA satu baris tunggal yang representatif utk
// dijadikan entityId, sementara capa_register.status/workflow_instance_id
// (kolom TUNGGAL) SENDIRI yang genuinely berubah per submission — BR-08
// juga berbunyi singular "capa_register.status berpindah dari
// ACTION_PLAN_DEFINED ke PENDING_APPROVAL", bukan per-action-plan.
const CAPA_ACTION_PLAN_WORKFLOW_ENTITY_TYPE = "capa_action_plan";
/**
 * Task 4.2 (Modul 10 §4 poin 4-5, §3 "CAPA Owner/PIC | capa.action_plan.define,
 * capa.action_plan.link_action_tracking"). BELUM ada controller HTTP.
 */
let CapaActionPlanService = class CapaActionPlanService {
    prisma;
    bootstrapService;
    workflowEngineService;
    registerService;
    approvalCacheService;
    constructor(prisma, bootstrapService, workflowEngineService, registerService, approvalCacheService) {
        this.prisma = prisma;
        this.bootstrapService = bootstrapService;
        this.workflowEngineService = workflowEngineService;
        this.registerService = registerService;
        this.approvalCacheService = approvalCacheService;
    }
    async define(input) {
        const createdBy = (0, capa_context_1.requireActorUserId)();
        const tenantId = (0, capa_context_1.requireTenantId)();
        await this.markActionPlanDefined(input.capaRegisterId, createdBy);
        return this.prisma.withRls((tx) => tx.capaActionPlan.create({
            data: {
                tenantId,
                capaRegisterId: input.capaRegisterId,
                rootCauseAnalysisId: input.rootCauseAnalysisId,
                actionDescription: input.actionDescription,
                justification: input.justification,
                actionType: input.actionType,
                picUserId: input.picUserId,
                dueDate: input.dueDate,
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async markActionPlanDefined(capaRegisterId, actorId) {
        const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId } }));
        if (capa.status === "ACTION_PLAN_DEFINED")
            return;
        (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)(capa.status, "ACTION_PLAN_DEFINED");
        await this.prisma.withRls((tx) => tx.capaRegister.update({ where: { id: capaRegisterId }, data: { status: "ACTION_PLAN_DEFINED", updatedBy: actorId } }));
    }
    // Modul 24 (Action Tracking) BELUM ADA (Phase 7) — titik sinkronisasi
    // MANUAL, pola sama InspectionFindingService.linkActionTracking() (3.6).
    async setActionTrackingId(capaActionPlanId, actionTrackingId) {
        const updatedBy = (0, capa_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.capaActionPlan.update({ where: { id: capaActionPlanId }, data: { actionTrackingId, updatedBy } }));
    }
    // Modul 24 sync point utk status_cache/completed_date_cache — event-driven
    // MASA DEPAN, manual sekarang (PRD §5 "disinkronkan via event" literal,
    // TIDAK ADA event sungguhan krn Modul 24 belum ada, gap TDD §26).
    async updateStatusCache(capaActionPlanId, statusCache, completedDate) {
        const updatedBy = (0, capa_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.capaActionPlan.update({
            where: { id: capaActionPlanId },
            data: { statusCache, completedDateCache: completedDate, updatedBy },
        }));
    }
    // BR-08 gate SEBELUM submit.
    async submitForApproval(capaRegisterId) {
        const actorId = (0, capa_context_1.requireActorUserId)();
        const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId }, include: { actionPlans: true } }));
        if (capa.workflowInstanceId) {
            throw new Error("capa_register sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
        }
        (0, capa_action_plan_rules_1.assertActionTrackingIdRequired)(capa.actionPlans.map((p) => ({ id: p.id, actionTrackingId: p.actionTrackingId })));
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureActionPlanWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(CAPA_ACTION_PLAN_WORKFLOW_ENTITY_TYPE, capaRegisterId, definition.id, {});
        (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)(capa.status, "PENDING_APPROVAL");
        const updated = await this.prisma.withRls((tx) => tx.capaRegister.update({
            where: { id: capaRegisterId },
            data: { status: "PENDING_APPROVAL", workflowInstanceId: instance.id, updatedBy: actorId },
        }));
        await this.approvalCacheService.refresh(capaRegisterId, instance.id, "Action Plan Approval");
        return updated;
    }
    async getById(capaActionPlanId) {
        return this.prisma.withRls((tx) => tx.capaActionPlan.findUniqueOrThrow({ where: { id: capaActionPlanId } }));
    }
    async listByCapa(capaRegisterId) {
        return this.prisma.withRls((tx) => tx.capaActionPlan.findMany({ where: { capaRegisterId, deletedAt: null }, orderBy: { dueDate: "asc" } }));
    }
};
exports.CapaActionPlanService = CapaActionPlanService;
exports.CapaActionPlanService = CapaActionPlanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        capa_workflow_bootstrap_service_1.CapaWorkflowBootstrapService,
        workflow_engine_service_1.WorkflowEngineService,
        capa_register_service_1.CapaRegisterService,
        capa_approval_cache_service_1.CapaApprovalCacheService])
], CapaActionPlanService);
