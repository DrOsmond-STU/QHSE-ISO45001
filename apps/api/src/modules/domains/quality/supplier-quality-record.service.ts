import { Injectable } from "@nestjs/common";
import { SupplierQualityRecord, QualitySupplierCategory, QualitySupplierEvaluationType, QualitySupplierRating, Prisma } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { requireActorUserId, requireTenantId } from "./quality-context";
import { assertCapaRequiredForRating, validateSupplierRecordStatusTransition } from "./supplier-quality-rules";
import { QualityWorkflowBootstrapService } from "./quality-workflow-bootstrap.service";

const SUPPLIER_EVAL_WORKFLOW_ENTITY_TYPE = "supplier_quality_record";

export interface CreateSupplierQualityRecordInput {
  companyId: string;
  supplierCode: string;
  supplierName: string;
  supplierCategory: QualitySupplierCategory;
  evaluationType: QualitySupplierEvaluationType;
  evaluationPeriodStart: Date;
  evaluationPeriodEnd: Date;
  qualityScore?: number;
  deliveryScore?: number;
  responsivenessScore?: number;
  overallScore: number;
  scoringDetail?: Prisma.InputJsonValue;
  nextEvaluationDueDate?: Date;
}

/**
 * Task 5.1 (Modul 11 §4.4, §3 "Supplier Quality Engineer | quality.supplier_evaluation.create/submit",
 * "Quality Manager | quality.supplier_evaluation.approve"). BELUM ada
 * controller HTTP. `ncr_count_period` DIISI CALLER (query lintas
 * ncr_records ada di service, bukan trigger DB — PRD §5 tidak beri
 * mekanisme kalkulasi otomatis eksplisit).
 */
@Injectable()
export class SupplierQualityRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bootstrapService: QualityWorkflowBootstrapService,
    private readonly workflowEngineService: WorkflowEngineService,
  ) {}

  async create(input: CreateSupplierQualityRecordInput): Promise<SupplierQualityRecord> {
    const evaluatedBy = requireActorUserId();
    const tenantId = requireTenantId();

    const ncrCountPeriod = await this.prisma.withRls((tx) =>
      tx.ncrRecord.count({
        where: {
          supplierCode: input.supplierCode,
          ncrSource: "SUPPLIER",
          detectedDate: { gte: input.evaluationPeriodStart, lte: input.evaluationPeriodEnd },
          deletedAt: null,
        },
      }),
    );

    return this.prisma.withRls((tx) =>
      tx.supplierQualityRecord.create({
        data: {
          tenantId,
          companyId: input.companyId,
          supplierCode: input.supplierCode,
          supplierName: input.supplierName,
          supplierCategory: input.supplierCategory,
          evaluationType: input.evaluationType,
          evaluationPeriodStart: input.evaluationPeriodStart,
          evaluationPeriodEnd: input.evaluationPeriodEnd,
          qualityScore: input.qualityScore,
          deliveryScore: input.deliveryScore,
          responsivenessScore: input.responsivenessScore,
          overallScore: input.overallScore,
          scoringDetail: input.scoringDetail ?? undefined,
          ncrCountPeriod,
          rating: "APPROVED",
          evaluatedBy,
          evaluationDate: new Date(),
          nextEvaluationDueDate: input.nextEvaluationDueDate,
          status: "DRAFT",
          createdBy: evaluatedBy,
          updatedBy: evaluatedBy,
        },
      }),
    );
  }

  async submitForApproval(supplierQualityRecordId: string, rating: QualitySupplierRating): Promise<SupplierQualityRecord> {
    const actorId = requireActorUserId();
    const record = await this.prisma.withRls((tx) => tx.supplierQualityRecord.findUniqueOrThrow({ where: { id: supplierQualityRecordId } }));
    validateSupplierRecordStatusTransition(record.status, "SUBMITTED");
    if (record.workflowInstanceId) {
      throw new Error("supplier_quality_records sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
    }

    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureSupplierEvalWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(SUPPLIER_EVAL_WORKFLOW_ENTITY_TYPE, supplierQualityRecordId, definition.id, {});

    return this.prisma.withRls((tx) =>
      tx.supplierQualityRecord.update({
        where: { id: supplierQualityRecordId },
        data: { status: "SUBMITTED", rating, workflowInstanceId: instance.id, updatedBy: actorId },
      }),
    );
  }

  /** Dipanggil SupplierEvalWorkflowCompletionListener saat workflow APPROVED. BR-04-analog dicek DI SINI (bukan submit) — rating final baru genuinely diketahui setelah approval. */
  async markApproved(supplierQualityRecordId: string): Promise<SupplierQualityRecord> {
    const record = await this.prisma.withRls((tx) => tx.supplierQualityRecord.findUniqueOrThrow({ where: { id: supplierQualityRecordId } }));
    validateSupplierRecordStatusTransition(record.status, "APPROVED");
    const correctiveActionRequired = record.rating === "CONDITIONAL" || record.rating === "SUSPENDED";
    return this.prisma.withRls((tx) =>
      tx.supplierQualityRecord.update({
        where: { id: supplierQualityRecordId },
        data: { status: "APPROVED", correctiveActionRequired, workflowInstanceId: null },
      }),
    );
  }

  async returnToDraft(supplierQualityRecordId: string): Promise<SupplierQualityRecord> {
    return this.prisma.withRls((tx) =>
      tx.supplierQualityRecord.update({ where: { id: supplierQualityRecordId }, data: { status: "DRAFT", workflowInstanceId: null } }),
    );
  }

  /** §4.4 poin 3 — manual link, pola sama NcrRecordService.linkCapaRegister(). */
  async linkCapaRegister(supplierQualityRecordId: string, capaRegisterId: string): Promise<SupplierQualityRecord> {
    const updatedBy = requireActorUserId();
    const record = await this.prisma.withRls((tx) => tx.supplierQualityRecord.findUniqueOrThrow({ where: { id: supplierQualityRecordId } }));
    assertCapaRequiredForRating(record.rating, capaRegisterId);
    return this.prisma.withRls((tx) => tx.supplierQualityRecord.update({ where: { id: supplierQualityRecordId }, data: { capaRegisterId, updatedBy } }));
  }

  async archive(supplierQualityRecordId: string): Promise<SupplierQualityRecord> {
    const updatedBy = requireActorUserId();
    const record = await this.prisma.withRls((tx) => tx.supplierQualityRecord.findUniqueOrThrow({ where: { id: supplierQualityRecordId } }));
    validateSupplierRecordStatusTransition(record.status, "ARCHIVED");
    return this.prisma.withRls((tx) => tx.supplierQualityRecord.update({ where: { id: supplierQualityRecordId }, data: { status: "ARCHIVED", updatedBy } }));
  }

  async getById(supplierQualityRecordId: string): Promise<SupplierQualityRecord> {
    return this.prisma.withRls((tx) => tx.supplierQualityRecord.findUniqueOrThrow({ where: { id: supplierQualityRecordId } }));
  }
}
