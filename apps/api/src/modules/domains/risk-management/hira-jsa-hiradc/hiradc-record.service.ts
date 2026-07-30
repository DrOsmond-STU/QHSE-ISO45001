import { BadRequestException, Injectable } from "@nestjs/common";
import { HiradcLine, HiradcRecord, Prisma } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../../platform/numbering/numbering.service";
import { WorkflowEngineService } from "../../../../platform/workflow-engine/workflow-engine.service";
import { requireActorUserId, requireTenantId } from "../matrix/risk-matrix-context";
import { resolveRiskScore } from "../matrix/risk-matrix-lookup";
import { assertHasBaselineOrStandaloneLines, validateHiradcRecordStatusTransition } from "./hiradc-lifecycle";
import { RiskWorkflowBootstrapService } from "./risk-workflow-bootstrap.service";

const HIRADC_NUMBERING_MODULE_CODE = "HIRADC";
const HIRADC_WORKFLOW_ENTITY_TYPE = "hiradc_record";

export interface CreateHiradcRecordInput {
  siteId: string;
  departmentId?: string;
  relatedHiraId?: string;
  relatedJsaId?: string;
  workPermitId?: string;
  taskDescription: string;
  performedBy: string;
  assessmentDatetime: Date;
  // BR-04 (PRD §6) — "wajib diisi utk pekerjaan non-rutin." hiradc_records
  // (BEDA dari hira_assessments) TIDAK py kolom assessment_type/is_routine
  // APAPUN di skema literal — tidak ada sinyal utk membedakan "rutin" dari
  // "non-rutin" pada baris HIRADC itu sendiri. Dibaca KONSERVATIF: WAJIB
  // diisi SELALU (bukan opsional-tergantung-tipe yang tidak bisa dicek),
  // gap TDD §26 didokumentasikan eksplisit.
  validUntil: Date;
}

export interface AddHiradcLineInput {
  hazardId?: string;
  hazardDescriptionFreetext?: string;
  likelihood: number;
  severity: number;
  controlMeasures: string;
  ppeRequired?: string[];
}

// Task 3.2 (Modul 05 §4.3/§5/§6 BR-03/BR-04). BELUM ada controller HTTP —
// risk.hiradc.* sudah di-seed RBAC baseline (task 114).
@Injectable()
export class HiradcRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: NumberingService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly bootstrapService: RiskWorkflowBootstrapService,
  ) {}

  async create(input: CreateHiradcRecordInput): Promise<HiradcRecord> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    await this.bootstrapService.ensureHiradcNumberingConfig();
    const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
    const hiradcNumber = await this.numberingService.generateNext(HIRADC_NUMBERING_MODULE_CODE, { variables: { SITE_CODE: site.siteCode } });

    return this.prisma.withRls((tx) =>
      tx.hiradcRecord.create({
        data: {
          tenantId,
          hiradcNumber,
          siteId: input.siteId,
          departmentId: input.departmentId,
          relatedHiraId: input.relatedHiraId,
          relatedJsaId: input.relatedJsaId,
          workPermitId: input.workPermitId,
          taskDescription: input.taskDescription,
          performedBy: input.performedBy,
          assessmentDatetime: input.assessmentDatetime,
          validUntil: input.validUntil,
          status: "DRAFT",
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async addLine(hiradcId: string, input: AddHiradcLineInput): Promise<HiradcLine> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls(async (tx) => {
      const hiradc = await tx.hiradcRecord.findUniqueOrThrow({ where: { id: hiradcId } });
      // BR-01 — matriks aktif scope HIRADC (fallback ke ALL kalau tidak
      // ada scope-spesifik), diresolusi via RiskMatrixConfigService LEWAT
      // query langsung di sini (bukan impor service, dalam withRls() yang
      // sama, aman krn murni query bukan cross-service call yang buka
      // transaksinya sendiri).
      const config =
        (await tx.riskMatrixConfig.findFirst({ where: { tenantId, applicableModuleScope: "HIRADC", isActive: true } })) ??
        (await tx.riskMatrixConfig.findFirst({ where: { tenantId, applicableModuleScope: "ALL", isActive: true } }));
      if (!config) {
        throw new BadRequestException("Tidak ada risk_matrix_configs aktif utk scope HIRADC maupun ALL pada tenant ini.");
      }
      const cells = await tx.riskMatrixCell.findMany({ where: { riskMatrixConfigId: config.id } });
      const resolved = resolveRiskScore(cells, input.likelihood, input.severity);

      return tx.hiradcLine.create({
        data: {
          tenantId,
          hiradcId,
          hazardId: input.hazardId,
          hazardDescriptionFreetext: input.hazardDescriptionFreetext,
          likelihood: input.likelihood,
          severity: input.severity,
          riskScore: resolved.riskScore,
          riskLevel: resolved.riskLevel,
          requiresEscalation: resolved.requiresEscalation,
          controlMeasures: input.controlMeasures,
          ppeRequired: (input.ppeRequired ?? []) as Prisma.InputJsonValue,
          createdBy,
        },
      });
    });
  }

  async getById(hiradcId: string) {
    return this.prisma.withRls((tx) => tx.hiradcRecord.findUniqueOrThrow({ where: { id: hiradcId }, include: { lines: true } }));
  }

  /**
   * PRD §4.3 poin 2 — "approval RINGAN, disarankan 1 stage 'Verifikasi
   * Supervisor'... bisa dikonfigurasi TANPA approval formal (VERIFIED
   * oleh pembuat sendiri) utk pekerjaan risiko rendah rutin." useWorkflow
   * (parameter EKSPLISIT dari caller, BUKAN auto-detect risiko — keputusan
   * "pakai workflow atau self-verify" diserahkan ke KEBIJAKAN TENANT/
   * pemanggil, skema tidak py kolom utk auto-decide) menentukan jalur:
   * self-verify -> transisi LANGSUNG DRAFT->VERIFIED; via workflow ->
   * status TETAP DRAFT (pola sama JSA) sampai HiradcWorkflowCompletionListener
   * memproses APPROVED workflow -> VERIFIED (BUKAN APPROVED — stage
   * bernama "Verifikasi", `approve()` terpisah utk lapis opsional
   * berikutnya VERIFIED->APPROVED). BR-03 ditegakkan DI SINI utk KEDUA
   * jalur (bukan di listener) — record yang tidak lengkap tidak boleh
   * masuk status VERIFIED sama sekali, baik lewat self-verify maupun
   * workflow.
   */
  async verify(hiradcId: string, useWorkflow: boolean): Promise<HiradcRecord> {
    const updatedBy = requireActorUserId();

    const { relatedHiraId, relatedJsaId, lineCount, status } = await this.prisma.withRls(async (tx) => {
      const hiradc = await tx.hiradcRecord.findUniqueOrThrow({ where: { id: hiradcId } });
      const count = await tx.hiradcLine.count({ where: { hiradcId } });
      return { relatedHiraId: hiradc.relatedHiraId, relatedJsaId: hiradc.relatedJsaId, lineCount: count, status: hiradc.status };
    });
    assertHasBaselineOrStandaloneLines({ relatedHiraId, relatedJsaId, lineCount });

    if (!useWorkflow) {
      validateHiradcRecordStatusTransition(status, "VERIFIED");
      return this.prisma.withRls((tx) => tx.hiradcRecord.update({ where: { id: hiradcId }, data: { status: "VERIFIED", updatedBy } }));
    }

    if (status !== "DRAFT") {
      throw new BadRequestException(`hiradc_records berstatus ${status} tidak dapat diajukan verifikasi ulang (wajib DRAFT).`);
    }
    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureHiradcWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(HIRADC_WORKFLOW_ENTITY_TYPE, hiradcId, definition.id, {});
    return this.prisma.withRls((tx) => tx.hiradcRecord.update({ where: { id: hiradcId }, data: { workflowInstanceId: instance.id } }));
  }

  /** Lapis opsional lanjutan VERIFIED->APPROVED (PRD §4.3 poin 2 tersirat,
   * "APPROVED" TETAP nilai enum sah, tidak seluruh HIRADC perlu
   * melewatinya) — transisi LANGSUNG, TANPA workflow tambahan. */
  async approve(hiradcId: string): Promise<HiradcRecord> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const hiradc = await tx.hiradcRecord.findUniqueOrThrow({ where: { id: hiradcId } });
      validateHiradcRecordStatusTransition(hiradc.status, "APPROVED");
      return tx.hiradcRecord.update({ where: { id: hiradcId }, data: { status: "APPROVED", updatedBy } });
    });
  }
}
