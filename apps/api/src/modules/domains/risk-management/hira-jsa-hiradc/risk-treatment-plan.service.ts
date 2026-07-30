import { Injectable } from "@nestjs/common";
import { Prisma, RiskTreatmentPlan, RiskTreatmentSourceType, RiskTreatmentStatus, RiskTreatmentStrategy } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "../matrix/risk-matrix-context";
import { assertAcceptRequiresTopManagementApproval } from "./risk-treatment-rules";
import { validateRiskTreatmentStatusTransition } from "./risk-treatment-lifecycle";

export interface CreateRiskTreatmentPlanInput {
  sourceType: RiskTreatmentSourceType;
  sourceId: string;
  treatmentStrategy: RiskTreatmentStrategy;
  treatmentDescription: string;
  responsibleUserId: string;
  targetDate: Date;
  actionTrackingId?: string;
  capaId?: string;
  // BR-06 — WAJIB diisi (BadRequestException lewat assertAcceptRequiresTopManagementApproval
  // kalau tidak) HANYA saat treatmentStrategy=ACCEPT pada source yang
  // requiresEscalation; caller (kelak controller+RBAC risk.corporate_risk.approve)
  // yang menjamin pengisinya genuinely Top Management.
  topManagementApprovedBy?: string;
}

// Task 3.2 (Modul 05 §4.4/§5/§6 BR-06). BELUM ada controller HTTP —
// risk.treatment.manage sudah di-seed RBAC baseline (task 114).
@Injectable()
export class RiskTreatmentPlanService {
  constructor(private readonly prisma: PrismaService) {}

  /** Polymorphic lookup requiresEscalation sesuai source_type — SATU-SATUNYA
   * titik yang tahu cara membaca ketiga tabel sumber, dipakai BR-06. */
  private async resolveSourceRequiresEscalation(
    tx: Prisma.TransactionClient,
    sourceType: RiskTreatmentSourceType,
    sourceId: string,
  ): Promise<boolean> {
    if (sourceType === "RISK_REGISTER") {
      const row = await tx.riskRegister.findUniqueOrThrow({ where: { id: sourceId }, select: { requiresEscalation: true } });
      return row.requiresEscalation;
    }
    if (sourceType === "HIRA_LINE") {
      const row = await tx.hiraHazardLine.findUniqueOrThrow({ where: { id: sourceId }, select: { requiresEscalation: true } });
      return row.requiresEscalation;
    }
    const row = await tx.hiradcLine.findUniqueOrThrow({ where: { id: sourceId }, select: { requiresEscalation: true } });
    return row.requiresEscalation;
  }

  async create(input: CreateRiskTreatmentPlanInput): Promise<RiskTreatmentPlan> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls(async (tx) => {
      const sourceRequiresEscalation = await this.resolveSourceRequiresEscalation(tx, input.sourceType, input.sourceId);
      assertAcceptRequiresTopManagementApproval(input.treatmentStrategy, sourceRequiresEscalation, input.topManagementApprovedBy ?? null);

      return tx.riskTreatmentPlan.create({
        data: {
          tenantId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          treatmentStrategy: input.treatmentStrategy,
          treatmentDescription: input.treatmentDescription,
          responsibleUserId: input.responsibleUserId,
          targetDate: input.targetDate,
          actionTrackingId: input.actionTrackingId,
          capaId: input.capaId,
          status: "PLANNED",
          topManagementApprovedBy: input.topManagementApprovedBy,
          topManagementApprovedAt: input.topManagementApprovedBy ? new Date() : undefined,
          createdBy,
          updatedBy: createdBy,
        },
      });
    });
  }

  /** PRD §5 "Jika tertaut action_tracking_id, status disinkronkan otomatis
   * dari status action terkait (bukan diedit manual ganda)" — Modul 24
   * (Action Tracking) BELUM ADA di codebase ini, sinkronisasi itu TIDAK
   * bisa terjadi; method ini SELALU jalur manual (gap TDD §26, akan perlu
   * dibatasi/diganti begitu Modul 24 genuinely ada). */
  async updateStatus(riskTreatmentId: string, status: RiskTreatmentStatus): Promise<RiskTreatmentPlan> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const plan = await tx.riskTreatmentPlan.findUniqueOrThrow({ where: { id: riskTreatmentId } });
      validateRiskTreatmentStatusTransition(plan.status, status);
      return tx.riskTreatmentPlan.update({ where: { id: riskTreatmentId }, data: { status, updatedBy } });
    });
  }

  async getById(riskTreatmentId: string): Promise<RiskTreatmentPlan> {
    return this.prisma.withRls((tx) => tx.riskTreatmentPlan.findUniqueOrThrow({ where: { id: riskTreatmentId } }));
  }

  async listBySource(sourceType: RiskTreatmentSourceType, sourceId: string): Promise<RiskTreatmentPlan[]> {
    return this.prisma.withRls((tx) =>
      tx.riskTreatmentPlan.findMany({ where: { sourceType, sourceId, deletedAt: null }, orderBy: { createdAt: "desc" } }),
    );
  }
}
