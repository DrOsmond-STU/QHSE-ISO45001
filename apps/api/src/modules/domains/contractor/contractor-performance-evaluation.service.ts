import { Injectable } from "@nestjs/common";
import { ContractorEvaluationPeriod, ContractorEvaluationRating, ContractorPerformanceEvaluation } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { requireActorUserId, requireTenantId } from "./contractor-context";
import { ContractorWorkflowBootstrapService } from "./contractor-workflow-bootstrap.service";
import { isConsecutiveUnacceptable } from "./contractor-lifecycle";

export const EVALUATION_WORKFLOW_ENTITY_TYPE = "contractor_performance_evaluation";

export interface CreateEvaluationInput {
  contractorId: string;
  projectAssignmentId?: string;
  evaluationPeriod: ContractorEvaluationPeriod;
  periodStartDate: Date;
  periodEndDate: Date;
  hseComplianceScore?: number;
  manHoursWorked?: number;
  documentComplianceScore?: number;
  overallRating: ContractorEvaluationRating;
  recommendation?: string;
}

@Injectable()
export class ContractorPerformanceEvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly workflowBootstrap: ContractorWorkflowBootstrapService,
    private readonly notificationService: NotificationService,
  ) {}

  // §4.4 poin 1 — HSE Officer/Site Supervisor membuat evaluasi per periode,
  // incident_count/near_miss_count DIHITUNG dari incident_reports terfilter
  // contractorCompanyId (Modul 07, task 3.5) — retroaktif FK task 6.3.
  async create(input: CreateEvaluationInput): Promise<ContractorPerformanceEvaluation> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    const [incidentCount, nearMissCount] = await this.prisma.withRls((tx) =>
      Promise.all([
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
      ]),
    );

    return this.prisma.withRls((tx) =>
      tx.contractorPerformanceEvaluation.create({
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
      }),
    );
  }

  // §4.4 poin 2 — Approval HSE Manager, Workflow Engine 1-stage.
  async submitForReview(id: string): Promise<ContractorPerformanceEvaluation> {
    const actorUserId = requireActorUserId();
    const evaluation = await this.prisma.withRls((tx) => tx.contractorPerformanceEvaluation.findUniqueOrThrow({ where: { id } }));

    const definition = await this.prisma.withRls((tx) => this.workflowBootstrap.ensureEvaluationWorkflowDefinition(tx));
    const instance = await this.workflowEngine.startInstance(EVALUATION_WORKFLOW_ENTITY_TYPE, id, definition.id, {
      overallRating: evaluation.overallRating,
    });

    return this.prisma.withRls((tx) =>
      tx.contractorPerformanceEvaluation.update({ where: { id }, data: { status: "SUBMITTED", workflowInstanceId: instance.id, updatedBy: actorUserId } }),
    );
  }

  // Dipanggil ContractorEvaluationCompletionListener — LISTENER-DRIVEN,
  // pola sama ContractorPrequalificationService.onReviewCompleted() (tidak
  // requireActorUserId(), pakai evaluatedBy row itu sendiri).
  async onReviewCompleted(id: string, approved: boolean): Promise<ContractorPerformanceEvaluation> {
    const existing = await this.prisma.withRls((tx) => tx.contractorPerformanceEvaluation.findUniqueOrThrow({ where: { id } }));
    const updatedBy = existing.evaluatedBy ?? existing.createdBy;

    if (!approved) {
      return this.prisma.withRls((tx) => tx.contractorPerformanceEvaluation.update({ where: { id }, data: { workflowInstanceId: null, updatedBy } }));
    }

    const approvedEvaluation = await this.prisma.withRls((tx) =>
      tx.contractorPerformanceEvaluation.update({ where: { id }, data: { status: "APPROVED", workflowInstanceId: null, updatedBy } }),
    );

    // BR-07 — UNACCEPTABLE 2x berturut-turut pada kontraktor yang sama.
    await this.checkAndNotifyConsecutiveUnacceptable(approvedEvaluation);

    return approvedEvaluation;
  }

  private async checkAndNotifyConsecutiveUnacceptable(evaluation: ContractorPerformanceEvaluation): Promise<void> {
    const tenantId = requireTenantId();
    const previous = await this.prisma.withRls((tx) =>
      tx.contractorPerformanceEvaluation.findFirst({
        where: { contractorId: evaluation.contractorId, status: "APPROVED", id: { not: evaluation.id } },
        orderBy: { evaluationDate: "desc" },
      }),
    );

    if (!isConsecutiveUnacceptable(evaluation.overallRating, previous?.overallRating ?? null)) return;

    const contractor = await this.prisma.withRls((tx) => tx.contractor.findUniqueOrThrow({ where: { id: evaluation.contractorId }, select: { contractorName: true } }));
    const hseManagers = await this.prisma.withRls((tx) =>
      tx.user.findMany({ where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } }, select: { id: true } }),
    );
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

  async getById(id: string): Promise<ContractorPerformanceEvaluation> {
    return this.prisma.withRls((tx) => tx.contractorPerformanceEvaluation.findUniqueOrThrow({ where: { id } }));
  }
}
