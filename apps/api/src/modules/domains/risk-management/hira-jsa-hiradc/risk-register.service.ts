import { Injectable } from "@nestjs/common";
import { RiskCategory, RiskRegister } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../../platform/numbering/numbering.service";
import { requireActorUserId, requireTenantId } from "../matrix/risk-matrix-context";
import { resolveRiskScore } from "../matrix/risk-matrix-lookup";
import { validateRiskRegisterStatusTransition } from "./risk-register-lifecycle";
import { RiskWorkflowBootstrapService } from "./risk-workflow-bootstrap.service";

const RISK_CORP_NUMBERING_MODULE_CODE = "RISK_CORP";

export interface CreateRiskRegisterInput {
  companyId?: string;
  riskCategory: RiskCategory;
  riskTitle: string;
  riskDescription: string;
  riskOwnerUserId: string;
  riskMatrixConfigId: string;
  likelihoodInherent: number;
  severityInherent: number;
  currentControls?: string;
  likelihoodResidual: number;
  severityResidual: number;
  identifiedDate: Date;
  nextReviewDate?: Date;
}

export interface UpdateRiskRegisterResidualInput {
  likelihoodResidual: number;
  severityResidual: number;
  currentControls?: string;
}

// Task 3.2 (Modul 05 §4.4/§5/§6 BR-01/05). BELUM ada controller HTTP —
// risk.corporate_risk.* sudah di-seed RBAC baseline (task 114).
@Injectable()
export class RiskRegisterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: NumberingService,
    private readonly bootstrapService: RiskWorkflowBootstrapService,
  ) {}

  /**
   * BR-01 (inherent+residual dihitung otomatis dari risk_matrix_cells) +
   * risk_appetite_status DITURUNKAN dari requiresEscalation residual (TRUE
   * -> EXCEEDS_APPETITE, FALSE -> WITHIN_APPETITE) — PRD §5 tidak mengatur
   * bagaimana kolom ini diisi eksplisit, diturunkan otomatis dari flag
   * terstruktur yang SAMA dipakai BR-06 (konsisten satu sumber kebenaran,
   * bukan input manual terpisah yang bisa tidak sinkron).
   */
  async create(input: CreateRiskRegisterInput): Promise<RiskRegister> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    await this.bootstrapService.ensureRiskCorpNumberingConfig();
    const riskNumber = await this.numberingService.generateNext(RISK_CORP_NUMBERING_MODULE_CODE);

    return this.prisma.withRls(async (tx) => {
      const cells = await tx.riskMatrixCell.findMany({ where: { riskMatrixConfigId: input.riskMatrixConfigId } });
      const inherent = resolveRiskScore(cells, input.likelihoodInherent, input.severityInherent);
      const residual = resolveRiskScore(cells, input.likelihoodResidual, input.severityResidual);

      return tx.riskRegister.create({
        data: {
          tenantId,
          riskNumber,
          companyId: input.companyId,
          riskCategory: input.riskCategory,
          riskTitle: input.riskTitle,
          riskDescription: input.riskDescription,
          riskOwnerUserId: input.riskOwnerUserId,
          riskMatrixConfigId: input.riskMatrixConfigId,
          likelihoodInherent: input.likelihoodInherent,
          severityInherent: input.severityInherent,
          riskScoreInherent: inherent.riskScore,
          riskLevelInherent: inherent.riskLevel,
          currentControls: input.currentControls,
          likelihoodResidual: input.likelihoodResidual,
          severityResidual: input.severityResidual,
          riskScoreResidual: residual.riskScore,
          riskLevelResidual: residual.riskLevel,
          requiresEscalation: residual.requiresEscalation,
          riskAppetiteStatus: residual.requiresEscalation ? "EXCEEDS_APPETITE" : "WITHIN_APPETITE",
          identifiedDate: input.identifiedDate,
          nextReviewDate: input.nextReviewDate,
          status: "IDENTIFIED",
          createdBy,
          updatedBy: createdBy,
        },
      });
    });
  }

  /** Reasesmen residual (kontrol baru berjalan) — riskScoreInherent TIDAK
   * pernah berubah (identifikasi risiko awal, historis), hanya sisi
   * residual yang direvisi. */
  async updateResidual(riskRegisterId: string, input: UpdateRiskRegisterResidualInput): Promise<RiskRegister> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const risk = await tx.riskRegister.findUniqueOrThrow({ where: { id: riskRegisterId } });
      const cells = await tx.riskMatrixCell.findMany({ where: { riskMatrixConfigId: risk.riskMatrixConfigId } });
      const residual = resolveRiskScore(cells, input.likelihoodResidual, input.severityResidual);

      return tx.riskRegister.update({
        where: { id: riskRegisterId },
        data: {
          likelihoodResidual: input.likelihoodResidual,
          severityResidual: input.severityResidual,
          riskScoreResidual: residual.riskScore,
          riskLevelResidual: residual.riskLevel,
          requiresEscalation: residual.requiresEscalation,
          riskAppetiteStatus: residual.requiresEscalation ? "EXCEEDS_APPETITE" : "WITHIN_APPETITE",
          currentControls: input.currentControls,
          updatedBy,
        },
      });
    });
  }

  async advanceStatus(riskRegisterId: string, status: RiskRegister["status"]): Promise<RiskRegister> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const risk = await tx.riskRegister.findUniqueOrThrow({ where: { id: riskRegisterId } });
      validateRiskRegisterStatusTransition(risk.status, status);
      return tx.riskRegister.update({ where: { id: riskRegisterId }, data: { status, updatedBy } });
    });
  }

  async getById(riskRegisterId: string): Promise<RiskRegister> {
    return this.prisma.withRls((tx) => tx.riskRegister.findUniqueOrThrow({ where: { id: riskRegisterId } }));
  }

  /** BR-05 (PRD §6) — review berkala, reset overdueNotifiedAt (siklus
   * overdue "selesai" begitu review genuinely dilakukan), pola PERSIS
   * ComplianceEvaluationService.close() (2.2) mereset kolom due/overdue
   * sejenis. */
  async recordReview(riskRegisterId: string, nextReviewDate?: Date): Promise<RiskRegister> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.riskRegister.update({
        where: { id: riskRegisterId },
        data: { lastReviewDate: new Date(), nextReviewDate, overdueNotifiedAt: null, updatedBy },
      }),
    );
  }
}
