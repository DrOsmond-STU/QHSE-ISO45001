import { BadRequestException, Injectable } from "@nestjs/common";
import { JsaCrewAcknowledgement, JsaJobStep, JsaRecord, JsaStepHazard, Prisma } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../../platform/numbering/numbering.service";
import { WorkflowEngineService } from "../../../../platform/workflow-engine/workflow-engine.service";
import { requireActorUserId, requireTenantId, withCleanUniqueViolation } from "../matrix/risk-matrix-context";
import { RiskWorkflowBootstrapService } from "./risk-workflow-bootstrap.service";

const JSA_NUMBERING_MODULE_CODE = "JSA";
const JSA_WORKFLOW_ENTITY_TYPE = "jsa_record";

export interface CreateJsaRecordInput {
  siteId: string;
  departmentId?: string;
  jobTitle: string;
  jobDescription?: string;
  preparedBy: string;
  assessmentDate: Date;
  validUntil?: Date;
  linkedHiraId?: string;
}

export interface AddJsaStepHazardInput {
  hazardId?: string;
  hazardDescriptionFreetext?: string;
  potentialRisk?: string;
  controlMeasures: string;
  ppeRequired?: string[];
}

// Task 3.2 (Modul 05 §4.2/§5). BELUM ada controller HTTP — risk.jsa.* sudah
// di-seed RBAC baseline (task 114).
@Injectable()
export class JsaRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: NumberingService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly bootstrapService: RiskWorkflowBootstrapService,
  ) {}

  async create(input: CreateJsaRecordInput): Promise<JsaRecord> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    await this.bootstrapService.ensureJsaNumberingConfig();
    const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
    const jsaNumber = await this.numberingService.generateNext(JSA_NUMBERING_MODULE_CODE, { variables: { SITE_CODE: site.siteCode } });

    return this.prisma.withRls((tx) =>
      tx.jsaRecord.create({
        data: {
          tenantId,
          jsaNumber,
          siteId: input.siteId,
          departmentId: input.departmentId,
          jobTitle: input.jobTitle,
          jobDescription: input.jobDescription,
          preparedBy: input.preparedBy,
          assessmentDate: input.assessmentDate,
          validUntil: input.validUntil,
          linkedHiraId: input.linkedHiraId,
          status: "DRAFT",
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async addJobStep(jsaId: string, sequenceNo: number, stepDescription: string): Promise<JsaJobStep> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.jsaJobStep.create({ data: { tenantId, jsaId, sequenceNo, stepDescription } }));
  }

  async addStepHazard(jsaStepId: string, input: AddJsaStepHazardInput): Promise<JsaStepHazard> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.jsaStepHazard.create({
        data: {
          tenantId,
          jsaStepId,
          hazardId: input.hazardId,
          hazardDescriptionFreetext: input.hazardDescriptionFreetext,
          potentialRisk: input.potentialRisk,
          controlMeasures: input.controlMeasures,
          ppeRequired: (input.ppeRequired ?? []) as Prisma.InputJsonValue,
        },
      }),
    );
  }

  async getById(jsaId: string) {
    return this.prisma.withRls((tx) =>
      tx.jsaRecord.findUniqueOrThrow({
        where: { id: jsaId },
        include: { jobSteps: { include: { stepHazards: true }, orderBy: { sequenceNo: "asc" } }, crewAcknowledgements: true },
      }),
    );
  }

  /**
   * PRD §4.2 poin 2 — submit memicu workflow_instances (module_code=RISK,
   * entity_type=jsa_record). jsa_records.status TETAP "DRAFT" sepanjang
   * proses (skema §5 literal TIDAK py status "sedang direview" terpisah,
   * lihat banner comment jsa-lifecycle.ts) — guard double-submit karena itu
   * pakai workflowInstanceId===null (bukan cek status), BUKAN
   * validateJsaRecordStatusTransition() (yang cuma menegakkan urutan 5
   * status literal, tidak cocok utk skenario "masih DRAFT tapi sudah
   * pernah/sedang disubmit").
   */
  async submitForApproval(jsaId: string): Promise<JsaRecord> {
    await this.prisma.withRls(async (tx) => {
      const jsa = await tx.jsaRecord.findUniqueOrThrow({ where: { id: jsaId } });
      if (jsa.status !== "DRAFT") {
        throw new BadRequestException(`jsa_records berstatus ${jsa.status} tidak dapat diajukan (wajib DRAFT).`);
      }
      if (jsa.workflowInstanceId !== null) {
        throw new BadRequestException(`jsa_records ${jsaId} sudah memiliki workflow approval yang sedang berjalan.`);
      }
      const stepCount = await tx.jsaJobStep.count({ where: { jsaId } });
      if (stepCount === 0) {
        throw new BadRequestException(`jsa_records ${jsaId} belum memiliki jsa_job_steps — tidak dapat diajukan.`);
      }
    });

    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureJsaWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(JSA_WORKFLOW_ENTITY_TYPE, jsaId, definition.id, {});

    return this.prisma.withRls((tx) => tx.jsaRecord.update({ where: { id: jsaId }, data: { workflowInstanceId: instance.id } }));
  }

  /**
   * PRD §4.2 poin 3 — sign-off kru sebelum bekerja tiap shift (ISO 45001
   * §5.4). Hanya JSA ACTIVE yang bisa diakui (BR-08-ADJACENT: kalau belum
   * ACTIVE, belum ada versi disetujui utk diikuti kru). Unique constraint
   * DB (jsaId,userId,workDate) menegakkan "1 per user per work_date" —
   * P2002 diterjemahkan pesan bersih via withCleanUniqueViolation().
   */
  async acknowledge(jsaId: string, userId: string, workDate: Date, signatureRef?: string): Promise<JsaCrewAcknowledgement> {
    const tenantId = requireTenantId();

    return withCleanUniqueViolation(
      () =>
        this.prisma.withRls(async (tx) => {
          const jsa = await tx.jsaRecord.findUniqueOrThrow({ where: { id: jsaId } });
          if (jsa.status !== "ACTIVE") {
            throw new BadRequestException(`jsa_records berstatus ${jsa.status} belum dapat di-acknowledge (wajib ACTIVE).`);
          }
          return tx.jsaCrewAcknowledgement.create({
            data: { tenantId, jsaId, userId, workDate, acknowledgedAt: new Date(), signatureRef },
          });
        }),
      `Anda sudah mengakui (acknowledge) JSA ini utk tanggal kerja tersebut.`,
    );
  }
}
