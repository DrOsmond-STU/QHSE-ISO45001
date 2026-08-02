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
exports.ContractorPerformanceEvaluationService = exports.EVALUATION_WORKFLOW_ENTITY_TYPE = void 0;
const common_1 = require("@nestjs/common");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const contractor_context_1 = require("./contractor-context");
const contractor_workflow_bootstrap_service_1 = require("./contractor-workflow-bootstrap.service");
const contractor_lifecycle_1 = require("./contractor-lifecycle");
exports.EVALUATION_WORKFLOW_ENTITY_TYPE = "contractor_performance_evaluation";
let ContractorPerformanceEvaluationService = class ContractorPerformanceEvaluationService {
    prisma;
    workflowEngine;
    workflowBootstrap;
    notificationService;
    constructor(prisma, workflowEngine, workflowBootstrap, notificationService) {
        this.prisma = prisma;
        this.workflowEngine = workflowEngine;
        this.workflowBootstrap = workflowBootstrap;
        this.notificationService = notificationService;
    }
    // §4.4 poin 1 — HSE Officer/Site Supervisor membuat evaluasi per periode,
    // incident_count/near_miss_count DIHITUNG dari incident_reports terfilter
    // contractorCompanyId (Modul 07, task 3.5) — retroaktif FK task 6.3.
    async create(input) {
        const tenantId = (0, contractor_context_1.requireTenantId)();
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        const [incidentCount, nearMissCount] = await this.prisma.withRls((tx) => Promise.all([
            tx.incidentReport.count({
                where: { contractorCompanyId: input.contractorId, incidentDatetime: { gte: input.periodStartDate, lte: input.periodEndDate } },
            }),
            tx.incidentReport.count({
                where: {
                    contractorCompanyId: input.contractorId,
                    classification: "NEAR_MISS",
                    incidentDatetime: { gte: input.periodStartDate, lte: input.periodEndDate },
                },
            }),
        ]));
        return this.prisma.withRls((tx) => tx.contractorPerformanceEvaluation.create({
            data: {
                tenantId,
                contractorId: input.contractorId,
                projectAssignmentId: input.projectAssignmentId,
                evaluationPeriod: input.evaluationPeriod,
                periodStartDate: input.periodStartDate,
                periodEndDate: input.periodEndDate,
                hseComplianceScore: input.hseComplianceScore,
                incidentCount,
                nearMissCount,
                manHoursWorked: input.manHoursWorked,
                documentComplianceScore: input.documentComplianceScore,
                overallRating: input.overallRating,
                recommendation: input.recommendation,
                evaluatedBy: actorUserId,
                evaluationDate: new Date(),
                status: "DRAFT",
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    // §4.4 poin 2 — Approval HSE Manager, Workflow Engine 1-stage.
    async submitForReview(id) {
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        const evaluation = await this.prisma.withRls((tx) => tx.contractorPerformanceEvaluation.findUniqueOrThrow({ where: { id } }));
        const definition = await this.prisma.withRls((tx) => this.workflowBootstrap.ensureEvaluationWorkflowDefinition(tx));
        const instance = await this.workflowEngine.startInstance(exports.EVALUATION_WORKFLOW_ENTITY_TYPE, id, definition.id, {
            overallRating: evaluation.overallRating,
        });
        return this.prisma.withRls((tx) => tx.contractorPerformanceEvaluation.update({ where: { id }, data: { status: "SUBMITTED", workflowInstanceId: instance.id, updatedBy: actorUserId } }));
    }
    // Dipanggil ContractorEvaluationCompletionListener — LISTENER-DRIVEN,
    // pola sama ContractorPrequalificationService.onReviewCompleted() (tidak
    // requireActorUserId(), pakai evaluatedBy row itu sendiri).
    async onReviewCompleted(id, approved) {
        const existing = await this.prisma.withRls((tx) => tx.contractorPerformanceEvaluation.findUniqueOrThrow({ where: { id } }));
        const updatedBy = existing.evaluatedBy ?? existing.createdBy;
        if (!approved) {
            return this.prisma.withRls((tx) => tx.contractorPerformanceEvaluation.update({ where: { id }, data: { workflowInstanceId: null, updatedBy } }));
        }
        const approvedEvaluation = await this.prisma.withRls((tx) => tx.contractorPerformanceEvaluation.update({ where: { id }, data: { status: "APPROVED", workflowInstanceId: null, updatedBy } }));
        // BR-07 — UNACCEPTABLE 2x berturut-turut pada kontraktor yang sama.
        await this.checkAndNotifyConsecutiveUnacceptable(approvedEvaluation);
        return approvedEvaluation;
    }
    async checkAndNotifyConsecutiveUnacceptable(evaluation) {
        const tenantId = (0, contractor_context_1.requireTenantId)();
        const previous = await this.prisma.withRls((tx) => tx.contractorPerformanceEvaluation.findFirst({
            where: { contractorId: evaluation.contractorId, status: "APPROVED", id: { not: evaluation.id } },
            orderBy: { evaluationDate: "desc" },
        }));
        if (!(0, contractor_lifecycle_1.isConsecutiveUnacceptable)(evaluation.overallRating, previous?.overallRating ?? null))
            return;
        const contractor = await this.prisma.withRls((tx) => tx.contractor.findUniqueOrThrow({ where: { id: evaluation.contractorId }, select: { contractorName: true } }));
        const hseManagers = await this.prisma.withRls((tx) => tx.user.findMany({ where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } }, select: { id: true } }));
        for (const recipient of hseManagers) {
            await this.notificationService.enqueue({
                eventType: "CONTRACTOR_EVALUATION_UNACCEPTABLE_CONSECUTIVE",
                entityType: "CONTRACTOR_PERFORMANCE_EVALUATION",
                entityId: evaluation.id,
                recipientUserId: recipient.id,
                priority: "HIGH",
                eventCategory: "CONTRACTOR",
                variables: { contractorName: contractor.contractorName },
            });
        }
    }
    async getById(id) {
        return this.prisma.withRls((tx) => tx.contractorPerformanceEvaluation.findUniqueOrThrow({ where: { id } }));
    }
};
exports.ContractorPerformanceEvaluationService = ContractorPerformanceEvaluationService;
exports.ContractorPerformanceEvaluationService = ContractorPerformanceEvaluationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        workflow_engine_service_1.WorkflowEngineService,
        contractor_workflow_bootstrap_service_1.ContractorWorkflowBootstrapService,
        notification_service_1.NotificationService])
], ContractorPerformanceEvaluationService);
