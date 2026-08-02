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
exports.EmergencyResponsePlanService = void 0;
const common_1 = require("@nestjs/common");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const emergency_response_context_1 = require("./emergency-response-context");
const emergency_response_plan_lifecycle_1 = require("./emergency-response-plan-lifecycle");
const emergency_response_workflow_bootstrap_service_1 = require("./emergency-response-workflow-bootstrap.service");
const EMERGENCY_RESPONSE_PLAN_WORKFLOW_ENTITY_TYPE = "emergency_response_plan";
// Task 3.7 (Modul 14 §4.1/§6 BR-01/BR-09). BELUM ada controller HTTP.
// plan_steps DIKELOLA DI SINI (bukan service terpisah) — pola PERSIS
// InspectionChecklistTemplateService item handling (3.6): tidak py siklus
// hidup independen dari plan induknya.
let EmergencyResponsePlanService = class EmergencyResponsePlanService {
    prisma;
    numberingService;
    workflowEngineService;
    bootstrapService;
    constructor(prisma, numberingService, workflowEngineService, bootstrapService) {
        this.prisma = prisma;
        this.numberingService = numberingService;
        this.workflowEngineService = workflowEngineService;
        this.bootstrapService = bootstrapService;
    }
    async create(input) {
        const createdBy = (0, emergency_response_context_1.requireActorUserId)();
        const tenantId = (0, emergency_response_context_1.requireTenantId)();
        await this.bootstrapService.ensurePlanNumberingConfig(input.siteId);
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
        const planNumber = await this.numberingService.generateNext("EMERGENCY_PLAN", {
            scopeId: input.siteId,
            variables: { SITE_CODE: site.siteCode },
        });
        return this.prisma.withRls(async (tx) => {
            const plan = await tx.emergencyResponsePlan.create({
                data: {
                    tenantId,
                    companyId: input.companyId,
                    branchId: input.branchId,
                    siteId: input.siteId,
                    planNumber,
                    planTitle: input.planTitle,
                    emergencyType: input.emergencyType,
                    scenarioDescription: input.scenarioDescription,
                    defaultMusterPointId: input.defaultMusterPointId,
                    relatedDocumentId: input.relatedDocumentId,
                    severityLevel: input.severityLevel,
                    reviewFrequency: input.reviewFrequency ?? "ANNUAL",
                    effectiveDate: input.effectiveDate,
                    status: "DRAFT",
                    createdBy,
                    updatedBy: createdBy,
                },
            });
            await this.createSteps(tx, tenantId, plan.id, input.steps, createdBy);
            return plan;
        });
    }
    async createSteps(tx, tenantId, planId, steps, createdBy) {
        if (steps.length === 0)
            return;
        await tx.emergencyResponsePlanStep.createMany({
            data: steps.map((step) => ({
                tenantId,
                emergencyResponsePlanId: planId,
                sequenceNo: step.sequenceNo,
                stepDescription: step.stepDescription,
                responsibleErtRole: step.responsibleErtRole,
                maxTimeTargetMinutes: step.maxTimeTargetMinutes,
                createdBy,
                updatedBy: createdBy,
            })),
        });
    }
    /**
     * PRD §4.1 poin 2 — module_code=EMERGENCY_PLAN, 2-stage kondisional
     * (KELIMA JSON Logic condition codebase ini). contextData.severityLevel
     * diisi FRESH dari baris plan itu sendiri SEBELUM startInstance() — pola
     * sama seluruh precedent conditional workflow (WorkflowEngineService
     * TIDAK PERNAH fetch data domain sendiri).
     */
    async submitForApproval(emergencyResponsePlanId) {
        const actorId = (0, emergency_response_context_1.requireActorUserId)();
        const plan = await this.prisma.withRls((tx) => tx.emergencyResponsePlan.findUniqueOrThrow({ where: { id: emergencyResponsePlanId } }));
        (0, emergency_response_plan_lifecycle_1.validateEmergencyResponsePlanStatusTransition)(plan.status, "UNDER_REVIEW");
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(EMERGENCY_RESPONSE_PLAN_WORKFLOW_ENTITY_TYPE, emergencyResponsePlanId, definition.id, { severityLevel: plan.severityLevel });
        return this.prisma.withRls((tx) => tx.emergencyResponsePlan.update({
            where: { id: emergencyResponsePlanId },
            data: { status: "UNDER_REVIEW", workflowInstanceId: instance.id, updatedBy: actorId },
        }));
    }
    /**
     * BR-01 — "next_review_due_date" dihitung SAAT PERTAMA KALI plan
     * genuinely APPROVED_ACTIVE. Dipanggil listener
     * (EmergencyResponseWorkflowCompletionListener), BUKAN caller langsung.
     *
     * `approved_by` SENGAJA DIBIARKAN NULL DI SINI — `WorkflowInstanceCompletedEvent`
     * (workflow-engine-events.ts) TIDAK membawa identitas aktor SAMA SEKALI
     * (hanya instanceId/tenantId/status/entityType/entityId), dan banner
     * comment event itu SENDIRI eksplisit MELARANG listener re-query
     * `workflow_tasks` (utk membaca `acted_by` task terakhir) krn race
     * condition pre-commit yang SAMA (event di-emit DI DALAM transaksi
     * `actOnTask()` SEBELUM commit, terverifikasi 21/30 percobaan baca STALE)
     * — memaksa isi approved_by di sini beresiko salah/stale, jadi TIDAK
     * diisi sama sekali drpd menebak. Jejak SIAPA yang approve tetap
     * terekam via `audit_log_trigger` generik pada baris `workflow_tasks`
     * itu sendiri (`acted_by` KOLOM AUDIT-nya, bukan kolom domain ini). Gap
     * TDD §26.
     */
    async markApprovedActive(emergencyResponsePlanId) {
        return this.prisma.withRls(async (tx) => {
            const plan = await tx.emergencyResponsePlan.findUniqueOrThrow({ where: { id: emergencyResponsePlanId } });
            (0, emergency_response_plan_lifecycle_1.validateEmergencyResponsePlanStatusTransition)(plan.status, "APPROVED_ACTIVE");
            const baseline = plan.effectiveDate ?? new Date();
            return tx.emergencyResponsePlan.update({
                where: { id: emergencyResponsePlanId },
                data: {
                    status: "APPROVED_ACTIVE",
                    approvedAt: new Date(),
                    lastReviewedDate: baseline,
                    nextReviewDueDate: (0, emergency_response_plan_lifecycle_1.computeNextReviewDueDate)(baseline, plan.reviewFrequency),
                },
            });
        });
    }
    /** Jalur REJECTED (listener) — enum tidak py nilai REJECTED/RETURNED,
     * plan kembali DRAFT utk direvisi+diajukan ulang, workflow_instance_id
     * di-null-kan (unique constraint izin banyak NULL, pola sama JSA 3.2).
     * `updatedBy` SENGAJA TIDAK disentuh (pola PERSIS
     * IncidentWorkflowCompletionListener.markReturned() — alasan SAMA
     * dgn banner comment markApprovedActive() di atas: tidak ada identitas
     * aktor di payload event, kolom dibiarkan pada nilai TERAKHIR yang
     * genuinely valid drpd ditimpa nilai tebakan). */
    async returnToDraft(emergencyResponsePlanId) {
        return this.prisma.withRls(async (tx) => {
            const plan = await tx.emergencyResponsePlan.findUniqueOrThrow({ where: { id: emergencyResponsePlanId } });
            (0, emergency_response_plan_lifecycle_1.validateEmergencyResponsePlanStatusTransition)(plan.status, "DRAFT");
            return tx.emergencyResponsePlan.update({
                where: { id: emergencyResponsePlanId },
                data: { status: "DRAFT", workflowInstanceId: null },
            });
        });
    }
    async supersede(emergencyResponsePlanId) {
        const updatedBy = (0, emergency_response_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const plan = await tx.emergencyResponsePlan.findUniqueOrThrow({ where: { id: emergencyResponsePlanId } });
            (0, emergency_response_plan_lifecycle_1.validateEmergencyResponsePlanStatusTransition)(plan.status, "SUPERSEDED");
            return tx.emergencyResponsePlan.update({ where: { id: emergencyResponsePlanId }, data: { status: "SUPERSEDED", updatedBy } });
        });
    }
    async archive(emergencyResponsePlanId) {
        const updatedBy = (0, emergency_response_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const plan = await tx.emergencyResponsePlan.findUniqueOrThrow({ where: { id: emergencyResponsePlanId } });
            (0, emergency_response_plan_lifecycle_1.validateEmergencyResponsePlanStatusTransition)(plan.status, "ARCHIVED");
            return tx.emergencyResponsePlan.update({ where: { id: emergencyResponsePlanId }, data: { status: "ARCHIVED", updatedBy } });
        });
    }
    async getById(emergencyResponsePlanId) {
        return this.prisma.withRls((tx) => tx.emergencyResponsePlan.findUniqueOrThrow({ where: { id: emergencyResponsePlanId }, include: { planSteps: { orderBy: { sequenceNo: "asc" } } } }));
    }
    async listActiveBySite(siteId) {
        return this.prisma.withRls((tx) => tx.emergencyResponsePlan.findMany({ where: { siteId, status: "APPROVED_ACTIVE", deletedAt: null }, orderBy: { planTitle: "asc" } }));
    }
};
exports.EmergencyResponsePlanService = EmergencyResponsePlanService;
exports.EmergencyResponsePlanService = EmergencyResponsePlanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        workflow_engine_service_1.WorkflowEngineService,
        emergency_response_workflow_bootstrap_service_1.EmergencyResponseWorkflowBootstrapService])
], EmergencyResponsePlanService);
