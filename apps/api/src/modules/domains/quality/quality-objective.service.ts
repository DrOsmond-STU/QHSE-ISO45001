import { Injectable } from "@nestjs/common";
import { QualityObjective, QualityObjectiveMeasurementFrequency, QualityObjectiveProgressLog, QualityObjectiveStatus } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { requireActorUserId, requireTenantId } from "./quality-context";
import { calculateObjectiveStatus } from "./objective-status";

export interface CreateQualityObjectiveInput {
  companyId: string;
  branchId?: string;
  siteId?: string;
  departmentId?: string;
  objectiveCode: string;
  objectiveTitle: string;
  description?: string;
  isoClauseRef?: string;
  relatedPolicyDocumentId?: string;
  kpiMetricName: string;
  targetValue: number;
  targetUnit?: string;
  baselineValue?: number;
  atRiskThresholdPercentage?: number;
  measurementFrequency: QualityObjectiveMeasurementFrequency;
  ownerUserId?: string;
  periodStart: Date;
  periodEnd: Date;
}

const MANUAL_TERMINAL_STATUSES: QualityObjectiveStatus[] = ["ACHIEVED", "NOT_ACHIEVED", "DISCONTINUED"];

/**
 * Task 5.1 (Modul 11 §4.5, §3 "Quality Manager | quality.objective.manage").
 * BELUM ada controller HTTP. TIDAK memakai Workflow Engine (PRD §4.5 literal
 * "bersifat perencanaan berkala" — perubahan target_value setelah periode
 * berjalan "direkomendasikan melalui approval sederhana... opsional per
 * tenant", TIDAK diimplementasikan krn tidak ada kolom konfigurasi
 * tenant utk mengaktifkannya, gap TDD §26, pola sama Root Cause Review
 * CAPA §4 "opsional per tenant" 4.2).
 */
@Injectable()
export class QualityObjectiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(input: CreateQualityObjectiveInput): Promise<QualityObjective> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls((tx) =>
      tx.qualityObjective.create({
        data: {
          tenantId,
          companyId: input.companyId,
          branchId: input.branchId,
          siteId: input.siteId,
          departmentId: input.departmentId,
          objectiveCode: input.objectiveCode,
          objectiveTitle: input.objectiveTitle,
          description: input.description,
          isoClauseRef: input.isoClauseRef ?? "6.2",
          relatedPolicyDocumentId: input.relatedPolicyDocumentId,
          kpiMetricName: input.kpiMetricName,
          targetValue: input.targetValue,
          targetUnit: input.targetUnit,
          baselineValue: input.baselineValue,
          atRiskThresholdPercentage: input.atRiskThresholdPercentage ?? 10,
          measurementFrequency: input.measurementFrequency,
          ownerUserId: input.ownerUserId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          status: "ON_TRACK",
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  /**
   * BR-05 — catat quality_objective_progress_logs, mutakhirkan current_value
   * + status (HANYA jika status saat ini masih ON_TRACK/AT_RISK — status
   * manual-terminal ACHIEVED/NOT_ACHIEVED/DISCONTINUED dari reviewOutcome()
   * TIDAK PERNAH ditimpa kalkulasi otomatis ini).
   */
  async recordProgress(qualityObjectiveId: string, periodLabel: string, actualValue: number, notes?: string): Promise<QualityObjectiveProgressLog> {
    const recordedBy = requireActorUserId();
    const tenantId = requireTenantId();

    const objective = await this.prisma.withRls((tx) => tx.qualityObjective.findUniqueOrThrow({ where: { id: qualityObjectiveId } }));
    const log = await this.prisma.withRls((tx) =>
      tx.qualityObjectiveProgressLog.create({
        data: {
          tenantId,
          qualityObjectiveId,
          periodLabel,
          actualValue,
          recordedBy,
          recordedAt: new Date(),
          notes,
          createdBy: recordedBy,
          updatedBy: recordedBy,
        },
      }),
    );

    if (!MANUAL_TERMINAL_STATUSES.includes(objective.status)) {
      const nextStatus = calculateObjectiveStatus(actualValue, Number(objective.targetValue), Number(objective.atRiskThresholdPercentage));
      await this.prisma.withRls((tx) =>
        tx.qualityObjective.update({ where: { id: qualityObjectiveId }, data: { currentValue: actualValue, status: nextStatus, updatedBy: recordedBy } }),
      );

      // PRD §8 "Quality Objective AT_RISK/OFF_TRACK | Owner objective, Quality Manager".
      if (nextStatus === "AT_RISK") {
        const qualityManagers = await this.prisma.withRls((tx) =>
          tx.user.findMany({
            where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "QUALITY_MANAGER" } } } },
            select: { id: true },
          }),
        );
        const recipientIds = new Set([...qualityManagers.map((m) => m.id), ...(objective.ownerUserId ? [objective.ownerUserId] : [])]);
        for (const recipientUserId of recipientIds) {
          await this.notificationService.enqueue({
            eventType: "QUALITY_OBJECTIVE_AT_RISK",
            entityType: "QUALITY_OBJECTIVE",
            entityId: qualityObjectiveId,
            recipientUserId,
            priority: "MEDIUM",
            eventCategory: "QUALITY",
            variables: { objectiveTitle: objective.objectiveTitle },
          });
        }
      }
    } else {
      await this.prisma.withRls((tx) => tx.qualityObjective.update({ where: { id: qualityObjectiveId }, data: { currentValue: actualValue, updatedBy: recordedBy } }));
    }

    return log;
  }

  /** §4.5 poin 4 — hasil review Management Review, manual override terminal. */
  async reviewOutcome(qualityObjectiveId: string, status: "ACHIEVED" | "NOT_ACHIEVED" | "DISCONTINUED"): Promise<QualityObjective> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.qualityObjective.update({ where: { id: qualityObjectiveId }, data: { status, lastReviewedDate: new Date(), updatedBy } }),
    );
  }

  async getById(qualityObjectiveId: string) {
    return this.prisma.withRls((tx) =>
      tx.qualityObjective.findUniqueOrThrow({ where: { id: qualityObjectiveId }, include: { progressLogs: true } }),
    );
  }

  async listByCompany(companyId: string): Promise<QualityObjective[]> {
    return this.prisma.withRls((tx) => tx.qualityObjective.findMany({ where: { companyId, deletedAt: null }, orderBy: { periodStart: "desc" } }));
  }
}
