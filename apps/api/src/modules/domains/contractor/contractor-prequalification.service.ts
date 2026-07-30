import { BadRequestException, Injectable } from "@nestjs/common";
import {
  ContractorPqDocumentStatus,
  ContractorPrequalification,
  ContractorPrequalificationDocument,
  ContractorPrequalificationResult,
  ContractorPrequalificationType,
  ContractorDocumentType,
} from "@prisma/client";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { ContractorWorkflowBootstrapService } from "./contractor-workflow-bootstrap.service";
import { requireActorUserId, requireTenantId } from "./contractor-context";
import { areMandatoryDocumentsVerified } from "./contractor-lifecycle";

const PREQUALIFICATION_NUMBERING_MODULE_CODE = "CONTRACTOR_PQ";
export const PREQUALIFICATION_WORKFLOW_ENTITY_TYPE = "contractor_prequalification";
// PRD §4.1 poin 5 "valid_from/valid_until (umumnya 1–2 tahun, dikonfirmasi
// kebijakan tenant)" — TIDAK ADA angka tunggal konkret, diinvent 1 tahun
// (365 hari, batas BAWAH rentang literal, paling konservatif), gap TDD §26.
const DEFAULT_VALIDITY_DAYS = 365;

export interface CreatePrequalificationInput {
  contractorId: string;
  prequalificationType: ContractorPrequalificationType;
  scopeOfWork?: string;
}

export interface AddDocumentInput {
  documentType: ContractorDocumentType;
  isMandatory?: boolean;
  documentId?: string;
}

export interface SubmitForReviewInput {
  technicalCapabilityScore?: number;
  hseCapabilityScore?: number;
  financialCapabilityScore?: number;
  overallScore?: number;
  minPassingScore?: number;
  result: ContractorPrequalificationResult;
}

@Injectable()
export class ContractorPrequalificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly workflowBootstrap: ContractorWorkflowBootstrapService,
  ) {}

  // §4.1 poin 1-2 — registrasi + record prakualifikasi DRAFT.
  async create(input: CreatePrequalificationInput): Promise<ContractorPrequalification> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    await this.workflowBootstrap.ensurePrequalificationNumberingConfig();
    const prequalificationNo = await this.numbering.generateNext(PREQUALIFICATION_NUMBERING_MODULE_CODE, {});

    return this.prisma.withRls((tx) =>
      tx.contractorPrequalification.create({
        data: {
          tenantId,
          contractorId: input.contractorId,
          prequalificationNo,
          prequalificationType: input.prequalificationType,
          scopeOfWork: input.scopeOfWork,
          result: "PENDING",
          status: "DRAFT",
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  // §4.1 poin 2 — checklist dokumen wajib.
  async addDocument(prequalificationId: string, input: AddDocumentInput): Promise<ContractorPrequalificationDocument> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.contractorPrequalificationDocument.create({
        data: {
          tenantId,
          prequalificationId,
          documentType: input.documentType,
          isMandatory: input.isMandatory ?? true,
          documentId: input.documentId,
          status: input.documentId ? "SUBMITTED" : "PENDING",
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  // §4.1 poin 3 — Contractor Coordinator memverifikasi tiap dokumen.
  async verifyDocument(pqDocumentId: string, status: ContractorPqDocumentStatus, notes?: string): Promise<ContractorPrequalificationDocument> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.contractorPrequalificationDocument.update({
        where: { id: pqDocumentId },
        data: { status, notes, verifiedBy: actorUserId, verifiedAt: new Date(), updatedBy: actorUserId },
      }),
    );
  }

  // §4.1 poin 4 — skor dihitung + hasil diajukan lewat Workflow Engine
  // SATU aksi gabungan (PRD tidak deskripsikan langkah terpisah antara
  // "skor dihitung" dan "diajukan", pola sama Calibration submitForReview()
  // 6.2). BR-05 ditegakkan DI SINI (SEBELUM workflow dimulai) HANYA jika
  // `result` diusulkan PASS/CONDITIONAL_PASS — FAIL TIDAK butuh dokumen
  // lengkap (PRD §6 BR-05 literal HANYA sebut "result=PASS/CONDITIONAL_PASS
  // hanya dapat ditetapkan jika..." — FAIL tidak disyaratkan apa pun).
  async submitForReview(id: string, input: SubmitForReviewInput): Promise<ContractorPrequalification> {
    const actorUserId = requireActorUserId();

    if (input.result === "PASS" || input.result === "CONDITIONAL_PASS") {
      const documents = await this.prisma.withRls((tx) => tx.contractorPrequalificationDocument.findMany({ where: { prequalificationId: id } }));
      if (!areMandatoryDocumentsVerified(documents)) {
        throw new BadRequestException("BR-05 — result PASS/CONDITIONAL_PASS tidak dapat ditetapkan: masih ada dokumen wajib yang belum VERIFIED.");
      }
    }

    const definition = await this.prisma.withRls((tx) => this.workflowBootstrap.ensurePrequalificationWorkflowDefinition(tx));
    const instance = await this.workflowEngine.startInstance(PREQUALIFICATION_WORKFLOW_ENTITY_TYPE, id, definition.id, { result: input.result });

    return this.prisma.withRls((tx) =>
      tx.contractorPrequalification.update({
        where: { id },
        data: {
          technicalCapabilityScore: input.technicalCapabilityScore,
          hseCapabilityScore: input.hseCapabilityScore,
          financialCapabilityScore: input.financialCapabilityScore,
          overallScore: input.overallScore,
          minPassingScore: input.minPassingScore,
          result: input.result,
          evaluatedBy: actorUserId,
          evaluationDate: new Date(),
          status: "UNDER_REVIEW",
          workflowInstanceId: instance.id,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  // Dipanggil ContractorPrequalificationCompletionListener — LISTENER-DRIVEN,
  // TIDAK ADA actor manusia di context titik ini (pola sama Calibration
  // onReviewCompleted() 6.2/Asset disposal listener 6.1) — `updatedBy`
  // memakai `evaluatedBy` row itu sendiri (evaluator manusia asli yang
  // mengajukan), BUKAN requireActorUserId(). §4.1 poin 5 — APPROVED +
  // result PASS/CONDITIONAL_PASS -> contractors.status=PREQUALIFIED +
  // valid_from/valid_until (cascade DILAKUKAN listener, BUKAN service ini,
  // dipisah biar service ini tidak circular-import ContractorService).
  async onReviewCompleted(id: string, approved: boolean): Promise<ContractorPrequalification> {
    const existing = await this.prisma.withRls((tx) => tx.contractorPrequalification.findUniqueOrThrow({ where: { id } }));
    const updatedBy = existing.evaluatedBy ?? existing.createdBy;

    if (!approved) {
      return this.prisma.withRls((tx) =>
        tx.contractorPrequalification.update({ where: { id }, data: { status: "REJECTED", workflowInstanceId: null, updatedBy } }),
      );
    }

    const validFrom = new Date();
    const validUntil = new Date(validFrom.getTime() + DEFAULT_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

    return this.prisma.withRls((tx) =>
      tx.contractorPrequalification.update({
        where: { id },
        data: { status: "APPROVED", validFrom, validUntil, workflowInstanceId: null, updatedBy },
      }),
    );
  }

  async getById(id: string): Promise<ContractorPrequalification> {
    return this.prisma.withRls((tx) => tx.contractorPrequalification.findUniqueOrThrow({ where: { id } }));
  }

  async listDocuments(prequalificationId: string): Promise<ContractorPrequalificationDocument[]> {
    return this.prisma.withRls((tx) => tx.contractorPrequalificationDocument.findMany({ where: { prequalificationId } }));
  }
}
