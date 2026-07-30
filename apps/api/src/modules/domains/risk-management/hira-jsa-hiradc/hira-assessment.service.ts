import { BadRequestException, Injectable } from "@nestjs/common";
import { ControlHierarchy, HiraAssessment, HiraAssessmentType, HiraHazardLine, HiraTeamMember } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../../platform/numbering/numbering.service";
import { WorkflowEngineService } from "../../../../platform/workflow-engine/workflow-engine.service";
import { requireActorUserId, requireTenantId } from "../matrix/risk-matrix-context";
import { resolveRiskScore } from "../matrix/risk-matrix-lookup";
import { assertAllControlsPresentIfStillHighRisk } from "./hira-hazard-line-rules";
import { anyHazardLineRequiresEscalation } from "./hira-lifecycle";
import { RiskWorkflowBootstrapService } from "./risk-workflow-bootstrap.service";

const HIRA_NUMBERING_MODULE_CODE = "HIRA";
const HIRA_WORKFLOW_ENTITY_TYPE = "hira_assessment";

export interface CreateHiraAssessmentInput {
  siteId: string;
  departmentId?: string;
  activityDescription: string;
  assessmentType: HiraAssessmentType;
  riskMatrixConfigId: string;
  assessmentDate: Date;
  // Opsional — PRD §5 literal review_due_date NULLABLE, TIDAK ada kolom
  // "review_cycle_months" utk menghitungnya otomatis (beda dari
  // documents.reviewCycleMonths 2.1) — caller (mis. wizard UI nanti)
  // mengisi eksplisit kalau tenant py kebijakan siklus tinjauan, TIDAK
  // ADA default yang dipaksakan di sini.
  reviewDueDate?: Date;
}

export interface AddHiraHazardLineInput {
  hazardId?: string;
  hazardDescriptionFreetext?: string;
  existingControls?: string;
  likelihoodBefore: number;
  severityBefore: number;
  additionalControlsRequired?: string;
  controlHierarchy?: ControlHierarchy;
  likelihoodAfter: number;
  severityAfter: number;
  responsibleUserId?: string;
  targetCompletionDate?: Date;
}

// Task 3.2 (Modul 05 §4.1/§5/§6 BR-01/02). BELUM ada controller HTTP (pola
// sama seluruh modul domain Phase 2+ sejauh ini) — risk.hira.* sudah
// di-seed RBAC baseline (task 114).
@Injectable()
export class HiraAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: NumberingService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly bootstrapService: RiskWorkflowBootstrapService,
  ) {}

  /**
   * BR-01 analog (hira_number) via NumberingService (0.10, module_code=HIRA)
   * — EMPAT langkah TERPISAH, alasan PERSIS DocumentService.createDocument()
   * (2.1)/ComplianceEvaluationService.create() (2.2): ensureNumberingConfig()
   * maupun generateNext() membuka withRls()-nya masing-masing. Pattern
   * `{SITE_CODE}` (PRD §5 disarankan literal utk hira_number, BEDA dari DMS
   * 2.1 yang menjatuhkannya krn documents.site_id NULLABLE) — hira_assessments.site_id
   * WAJIB (bukan nullable), jadi token ini AMAN dipakai, disuplai via
   * `variables` (token DISPLAY murni, BUKAN `scopeId` — counter TETAP
   * tenant-wide SATU, `scopeId` adalah konsep partisi counter yang BEDA,
   * lihat banner comment RiskWorkflowBootstrapService.ensureNumberingConfig()).
   */
  async create(input: CreateHiraAssessmentInput): Promise<HiraAssessment> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    await this.bootstrapService.ensureHiraNumberingConfig();
    const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
    const hiraNumber = await this.numberingService.generateNext(HIRA_NUMBERING_MODULE_CODE, { variables: { SITE_CODE: site.siteCode } });

    return this.prisma.withRls((tx) =>
      tx.hiraAssessment.create({
        data: {
          tenantId,
          hiraNumber,
          siteId: input.siteId,
          departmentId: input.departmentId,
          activityDescription: input.activityDescription,
          assessmentType: input.assessmentType,
          riskMatrixConfigId: input.riskMatrixConfigId,
          assessmentDate: input.assessmentDate,
          reviewDueDate: input.reviewDueDate,
          status: "DRAFT",
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async addTeamMember(hiraId: string, userId: string, roleInTeam?: string): Promise<HiraTeamMember> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.hiraTeamMember.create({ data: { tenantId, hiraId, userId, roleInTeam } }));
  }

  /**
   * BR-01 (PRD §6) — risk_score/risk_level before+after dihitung OTOMATIS
   * dari risk_matrix_cells (resolveRiskScore(), task 3.1), bukan input
   * manual. requiresEscalation TERSIMPAN diambil dari cell AFTER (dipakai
   * BR-06 nanti kalau baris ini jadi source risk_treatment_plans) — flag
   * BEFORE (dipakai percabangan workflow HIRA sendiri) dihitung TRANSIENT
   * di submitForApproval(), tidak disimpan di sini (lihat banner comment
   * hira-lifecycle.ts).
   */
  async addHazardLine(hiraId: string, input: AddHiraHazardLineInput): Promise<HiraHazardLine> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls(async (tx) => {
      const hira = await tx.hiraAssessment.findUniqueOrThrow({ where: { id: hiraId } });
      const cells = await tx.riskMatrixCell.findMany({ where: { riskMatrixConfigId: hira.riskMatrixConfigId } });

      const before = resolveRiskScore(cells, input.likelihoodBefore, input.severityBefore);
      const after = resolveRiskScore(cells, input.likelihoodAfter, input.severityAfter);

      return tx.hiraHazardLine.create({
        data: {
          tenantId,
          hiraId,
          hazardId: input.hazardId,
          hazardDescriptionFreetext: input.hazardDescriptionFreetext,
          existingControls: input.existingControls,
          likelihoodBefore: input.likelihoodBefore,
          severityBefore: input.severityBefore,
          riskScoreBefore: before.riskScore,
          riskLevelBefore: before.riskLevel,
          additionalControlsRequired: input.additionalControlsRequired,
          controlHierarchy: input.controlHierarchy,
          likelihoodAfter: input.likelihoodAfter,
          severityAfter: input.severityAfter,
          riskScoreAfter: after.riskScore,
          riskLevelAfter: after.riskLevel,
          requiresEscalation: after.requiresEscalation,
          responsibleUserId: input.responsibleUserId,
          targetCompletionDate: input.targetCompletionDate,
          createdBy,
          updatedBy: createdBy,
        },
      });
    });
  }

  async getById(hiraId: string) {
    return this.prisma.withRls((tx) =>
      tx.hiraAssessment.findUniqueOrThrow({ where: { id: hiraId }, include: { hazardLines: true, teamMembers: true } }),
    );
  }

  /**
   * PRD §4.1 poin 2/3 — submit memicu workflow_instances (module_code=RISK,
   * entity_type=hira_assessment). BR-02 ditegakkan DI SINI (SEBELUM submit,
   * bukan di listener) — assessment yang tidak lengkap tidak boleh MASUK
   * approval sama sekali. Percabangan kondisional: contextData.hasExtremeHazard
   * dihitung dari risk_level_BEFORE tiap baris (lookup FRESH ke
   * risk_matrix_cells, BUKAN baca kolom requiresEscalation tersimpan yang
   * merepresentasikan AFTER — lihat banner comment hira-lifecycle.ts) —
   * SEBELUM startInstance(), dibaca WorkflowEngineService.evaluateTransitionInTx()
   * (0.9) saat stage 2 selesai.
   *
   * TIGA transaksi TERPISAH, alasan PERSIS DocumentVersionService.submitForApproval()
   * (2.1)/ComplianceEvaluationService.submitForApproval() (2.2) — lihat
   * banner comment method itu.
   */
  async submitForApproval(hiraId: string): Promise<HiraAssessment> {
    const { hasExtremeHazard } = await this.prisma.withRls(async (tx) => {
      const hira = await tx.hiraAssessment.findUniqueOrThrow({ where: { id: hiraId } });
      if (hira.status !== "DRAFT" && hira.status !== "REQUIRES_REVISION") {
        throw new BadRequestException(`hira_assessments berstatus ${hira.status} tidak dapat diajukan (wajib DRAFT/REQUIRES_REVISION).`);
      }

      const lines = await tx.hiraHazardLine.findMany({ where: { hiraId } });
      if (lines.length === 0) {
        throw new BadRequestException(`hira_assessments ${hiraId} belum memiliki hira_hazard_lines — tidak dapat diajukan.`);
      }
      assertAllControlsPresentIfStillHighRisk(
        lines.map((l) => ({
          riskLevelAfter: l.riskLevelAfter,
          requiresEscalationAfter: l.requiresEscalation,
          additionalControlsRequired: l.additionalControlsRequired,
        })),
      );

      const cells = await tx.riskMatrixCell.findMany({ where: { riskMatrixConfigId: hira.riskMatrixConfigId } });
      const beforeFlags = lines.map((l) => ({
        requiresEscalationBefore: resolveRiskScore(cells, l.likelihoodBefore, l.severityBefore).requiresEscalation,
      }));

      return { hasExtremeHazard: anyHazardLineRequiresEscalation(beforeFlags) };
    });

    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureHiraWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(HIRA_WORKFLOW_ENTITY_TYPE, hiraId, definition.id, { hasExtremeHazard });

    return this.prisma.withRls((tx) =>
      tx.hiraAssessment.update({
        where: { id: hiraId },
        data: { status: "IN_REVIEW", workflowInstanceId: instance.id },
      }),
    );
  }
}
