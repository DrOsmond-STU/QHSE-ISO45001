import { Injectable } from "@nestjs/common";
import { CapaEffectivenessVerification, CapaVerificationMethod } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { requireActorUserId, requireTenantId } from "./capa-context";
import { assertAllActionPlansCompleted } from "./capa-action-plan-rules";
import { assertVerifierNotPic } from "./capa-effectiveness-rules";
import { validateCapaRegisterStatusTransition } from "./capa-register-lifecycle";
import { CapaWorkflowBootstrapService } from "./capa-workflow-bootstrap.service";
import { CapaApprovalCacheService } from "./capa-approval-cache.service";

// entity_type=capa_effectiveness_verification — BEDA dari capa_action_plan
// (lihat banner comment CapaActionPlanService): entityId DI SINI adalah
// baris capa_effectiveness_verification itu SENDIRI (bukan capa_register.id)
// krn SATU siklus verifikasi = TEPAT SATU baris (beda dari action plan yang
// bisa >1 baris per submission) — pola konsisten precedent lain (entity_type
// namai baris tunggal target langsung).
const CAPA_EFFECTIVENESS_VERIFICATION_WORKFLOW_ENTITY_TYPE = "capa_effectiveness_verification";

export interface CreateCapaEffectivenessVerificationInput {
  capaRegisterId: string;
  verificationMethod: CapaVerificationMethod;
  observationPeriodDays: number;
  verificationDueDate: Date;
  verifiedBy: string;
}

export interface RecordCapaEffectivenessVerificationResultInput {
  result: "EFFECTIVE" | "NOT_EFFECTIVE";
  evidenceDescription?: string;
  notes?: string;
}

/**
 * Task 4.2 (Modul 10 §4 poin 7-9, §3 "Effectiveness Verifier | capa.effectiveness.verify").
 * BELUM ada controller HTTP. create() menjadwalkan/menugaskan verifikasi
 * (BR-02+BR-03 gate SEBELUM capa_register.status->PENDING_EFFECTIVENESS_VERIFICATION);
 * recordResult() dipanggil TERPISAH begitu Verifier genuinely
 * menyelesaikan observasi (bisa berhari-hari/berbulan setelah create(),
 * PRD §4 poin 7 "observation_period_days... 30-90 hari" — BUKAN transaksi
 * yang sama).
 */
@Injectable()
export class CapaEffectivenessVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bootstrapService: CapaWorkflowBootstrapService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly approvalCacheService: CapaApprovalCacheService,
  ) {}

  async create(input: CreateCapaEffectivenessVerificationInput): Promise<CapaEffectivenessVerification> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    const capa = await this.prisma.withRls((tx) =>
      tx.capaRegister.findUniqueOrThrow({ where: { id: input.capaRegisterId }, include: { actionPlans: true } }),
    );
    validateCapaRegisterStatusTransition(capa.status, "PENDING_EFFECTIVENESS_VERIFICATION");
    assertAllActionPlansCompleted(capa.actionPlans.map((p) => ({ statusCache: p.statusCache })));
    assertVerifierNotPic(
      input.verifiedBy,
      capa.actionPlans.map((p) => p.picUserId),
    );

    await this.prisma.withRls((tx) =>
      tx.capaRegister.update({
        where: { id: input.capaRegisterId },
        data: { status: "PENDING_EFFECTIVENESS_VERIFICATION", updatedBy: createdBy },
      }),
    );

    return this.prisma.withRls((tx) =>
      tx.capaEffectivenessVerification.create({
        data: {
          tenantId,
          capaRegisterId: input.capaRegisterId,
          verificationMethod: input.verificationMethod,
          observationPeriodDays: input.observationPeriodDays,
          verificationDueDate: input.verificationDueDate,
          verifiedBy: input.verifiedBy,
          result: "PENDING",
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async recordResult(
    effectivenessVerificationId: string,
    input: RecordCapaEffectivenessVerificationResultInput,
  ): Promise<CapaEffectivenessVerification> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.capaEffectivenessVerification.update({
        where: { id: effectivenessVerificationId },
        data: {
          result: input.result,
          evidenceDescription: input.evidenceDescription,
          notes: input.notes,
          verifiedAt: new Date(),
          updatedBy,
        },
      }),
    );
  }

  async submitForApproval(effectivenessVerificationId: string): Promise<CapaEffectivenessVerification> {
    const actorId = requireActorUserId();

    const verification = await this.prisma.withRls((tx) =>
      tx.capaEffectivenessVerification.findUniqueOrThrow({ where: { id: effectivenessVerificationId } }),
    );
    if (verification.result === "PENDING") {
      throw new Error("capa_effectiveness_verification belum py result (EFFECTIVE/NOT_EFFECTIVE) — recordResult() dulu sebelum submit approval.");
    }
    const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: verification.capaRegisterId } }));
    if (capa.workflowInstanceId) {
      throw new Error("capa_register sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
    }

    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureEffectivenessVerificationWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(
      CAPA_EFFECTIVENESS_VERIFICATION_WORKFLOW_ENTITY_TYPE,
      effectivenessVerificationId,
      definition.id,
      {},
    );

    await this.prisma.withRls((tx) =>
      tx.capaRegister.update({ where: { id: verification.capaRegisterId }, data: { workflowInstanceId: instance.id, updatedBy: actorId } }),
    );
    await this.approvalCacheService.refresh(verification.capaRegisterId, instance.id, "Effectiveness Verification Approval");
    return verification;
  }

  async getById(effectivenessVerificationId: string): Promise<CapaEffectivenessVerification> {
    return this.prisma.withRls((tx) => tx.capaEffectivenessVerification.findUniqueOrThrow({ where: { id: effectivenessVerificationId } }));
  }

  async listByCapa(capaRegisterId: string): Promise<CapaEffectivenessVerification[]> {
    return this.prisma.withRls((tx) =>
      tx.capaEffectivenessVerification.findMany({ where: { capaRegisterId, deletedAt: null }, orderBy: { verificationDueDate: "desc" } }),
    );
  }
}
