import { Injectable } from "@nestjs/common";
import { QualityInspection, QualityInspectionDisposition, QualityInspectionParameterResult, QualityInspectionType, QualityNcrDetectionStage } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { requireActorUserId, requireTenantId } from "./quality-context";
import { assertDeviationApprovedBeforeClose, shouldAutoCreateNcr, validateInspectionStatusTransition } from "./inspection-rules";
import { QualityWorkflowBootstrapService } from "./quality-workflow-bootstrap.service";
import { NcrRecordService } from "./ncr-record.service";

const INSPECTION_NUMBERING_MODULE_CODE = "QUALITY_INSPECTION";
const INSPECTION_DEVIATION_WORKFLOW_ENTITY_TYPE = "quality_inspection_deviation";

// BR-03 — ncr_records.detection_stage TIDAK py nilai PRE_SHIPMENT (enum
// terpisah dari quality_inspections.inspection_type, PRD §5 mendefinisikan
// KEDUANYA independen) — dipetakan ke FINAL (semantik terdekat, sama-sama
// titik kendali akhir sebelum produk keluar), gap TDD §26.
function toNcrDetectionStage(inspectionType: QualityInspectionType): QualityNcrDetectionStage {
  return inspectionType === "PRE_SHIPMENT" ? "FINAL" : inspectionType;
}

export interface CreateQualityInspectionParameterInput {
  parameterName: string;
  specificationMin?: number;
  specificationMax?: number;
  unitOfMeasure?: string;
  sequenceNo: number;
}

export interface CreateQualityInspectionInput {
  siteId: string;
  departmentId?: string;
  inspectionType: QualityInspectionType;
  productCode?: string;
  productName?: string;
  batchLotNumber?: string;
  supplierCode?: string;
  workOrderNumber?: string;
  quantityInspected: number;
  quantitySampled?: number;
  samplingMethod?: string;
  inspectionDate: Date;
  measuringEquipmentAssetId?: string;
  parameters: CreateQualityInspectionParameterInput[];
}

/**
 * Task 5.1 (Modul 11 §4.3, §3 "QC Inspector | quality.inspection.create,
 * quality.inspection.submit"). BELUM ada controller HTTP. BR-03 (auto-NCR)
 * & BR-08 (deviation approval gate) diwujudkan di sini.
 */
@Injectable()
export class QualityInspectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: NumberingService,
    private readonly bootstrapService: QualityWorkflowBootstrapService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly ncrRecordService: NcrRecordService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(input: CreateQualityInspectionInput): Promise<QualityInspection> {
    const inspectorId = requireActorUserId();
    const tenantId = requireTenantId();

    await this.bootstrapService.ensureInspectionNumberingConfig(input.siteId);
    const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
    const inspectionNumber = await this.numberingService.generateNext(INSPECTION_NUMBERING_MODULE_CODE, {
      scopeId: input.siteId,
      variables: { SITE_CODE: site.siteCode },
    });

    return this.prisma.withRls((tx) =>
      tx.qualityInspection.create({
        data: {
          tenantId,
          siteId: input.siteId,
          departmentId: input.departmentId,
          inspectionNumber,
          inspectionType: input.inspectionType,
          productCode: input.productCode,
          productName: input.productName,
          batchLotNumber: input.batchLotNumber,
          supplierCode: input.supplierCode,
          workOrderNumber: input.workOrderNumber,
          quantityInspected: input.quantityInspected,
          quantitySampled: input.quantitySampled,
          samplingMethod: input.samplingMethod,
          inspectorId,
          inspectionDate: input.inspectionDate,
          measuringEquipmentAssetId: input.measuringEquipmentAssetId,
          status: "DRAFT",
          createdBy: inspectorId,
          updatedBy: inspectorId,
          parameters: {
            create: input.parameters.map((p) => ({
              tenantId,
              parameterName: p.parameterName,
              specificationMin: p.specificationMin,
              specificationMax: p.specificationMax,
              unitOfMeasure: p.unitOfMeasure,
              sequenceNo: p.sequenceNo,
              result: "NOT_MEASURED",
              createdBy: inspectorId,
              updatedBy: inspectorId,
            })),
          },
        },
      }),
    );
  }

  async recordParameterResult(
    parameterId: string,
    measuredValue: number,
    result: QualityInspectionParameterResult,
  ): Promise<void> {
    const updatedBy = requireActorUserId();
    await this.prisma.withRls((tx) =>
      tx.qualityInspectionParameter.update({ where: { id: parameterId }, data: { measuredValue, result, updatedBy } }),
    );
  }

  /**
   * DRAFT->SUBMITTED. Agregasi result_status dari parameter (ANY FAIL ->
   * FAIL, selainnya PASS — CONDITIONAL_PASS SELALU keputusan manual review(),
   * tidak pernah hasil agregasi otomatis). BR-03 dieksekusi di sini —
   * FAIL pada FINAL/PRE_SHIPMENT -> draft ncr_records otomatis.
   */
  async submit(qualityInspectionId: string): Promise<QualityInspection> {
    const updatedBy = requireActorUserId();
    const inspection = await this.prisma.withRls((tx) =>
      tx.qualityInspection.findUniqueOrThrow({ where: { id: qualityInspectionId }, include: { parameters: true } }),
    );
    validateInspectionStatusTransition(inspection.status, "SUBMITTED");

    const resultStatus = inspection.parameters.some((p) => p.result === "FAIL") ? "FAIL" : "PASS";
    let autoGeneratedNcrId: string | null = null;
    if (shouldAutoCreateNcr(resultStatus, inspection.inspectionType)) {
      const ncr = await this.ncrRecordService.create({
        siteId: inspection.siteId,
        departmentId: inspection.departmentId ?? undefined,
        ncrSource: "INTERNAL",
        productCode: inspection.productCode ?? undefined,
        productName: inspection.productName ?? undefined,
        batchLotNumber: inspection.batchLotNumber ?? undefined,
        title: `NCR otomatis dari inspeksi ${inspection.inspectionNumber} (FAIL)`,
        description: `quality_inspections ${inspection.inspectionNumber} FAIL pada tahap ${inspection.inspectionType}.`,
        detectedDate: inspection.inspectionDate,
        detectionStage: toNcrDetectionStage(inspection.inspectionType),
        severity: "MAJOR",
        quantityNonconforming: Number(inspection.quantityInspected),
        unitOfMeasure: "unit",
      });
      autoGeneratedNcrId = ncr.id;

      // PRD §8 "Inspeksi FAIL & NCR otomatis dibuat | QC Inspector, Department Head".
      const departmentHeads = await this.prisma.withRls((tx) =>
        tx.user.findMany({
          where: { status: "ACTIVE", userRoles: { some: { role: { roleCode: "DEPARTMENT_HEAD" } } } },
          select: { id: true },
        }),
      );
      for (const recipientUserId of new Set([inspection.inspectorId, ...departmentHeads.map((d) => d.id)])) {
        await this.notificationService.enqueue({
          eventType: "QUALITY_INSPECTION_FAIL_AUTO_NCR",
          entityType: "QUALITY_INSPECTION",
          entityId: qualityInspectionId,
          recipientUserId,
          priority: "HIGH",
          eventCategory: "QUALITY",
          variables: { inspectionNumber: inspection.inspectionNumber, ncrNumber: ncr.ncrNumber },
        });
      }
    }

    return this.prisma.withRls((tx) =>
      tx.qualityInspection.update({
        where: { id: qualityInspectionId },
        data: { status: "SUBMITTED", resultStatus, autoGeneratedNcrId, updatedBy },
      }),
    );
  }

  /**
   * SUBMITTED->REVIEWED. overallDisposition=USE_AS_IS_DEVIATION memicu
   * workflow QUALITY_INSPECTION_DEVIATION 1-stage (BR-08) — status inspeksi
   * TETAP maju ke REVIEWED (bukan menunggu approval di sini), gate
   * sesungguhnya ada di close() (BR-08 baru ditegakkan sebelum CLOSED,
   * bukan sebelum REVIEWED — PRD §4.3 poin 4 hanya bilang "wajib approval
   * ... sebelum status inspeksi CLOSED", bukan sebelum REVIEWED).
   */
  async review(qualityInspectionId: string, overallDisposition: QualityInspectionDisposition): Promise<QualityInspection> {
    const actorId = requireActorUserId();
    const inspection = await this.prisma.withRls((tx) => tx.qualityInspection.findUniqueOrThrow({ where: { id: qualityInspectionId } }));
    validateInspectionStatusTransition(inspection.status, "REVIEWED");

    let deviationWorkflowInstanceId: string | undefined;
    if (overallDisposition === "USE_AS_IS_DEVIATION") {
      const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureInspectionDeviationWorkflowDefinition(tx));
      const instance = await this.workflowEngineService.startInstance(
        INSPECTION_DEVIATION_WORKFLOW_ENTITY_TYPE,
        qualityInspectionId,
        definition.id,
        {},
      );
      deviationWorkflowInstanceId = instance.id;
    }

    return this.prisma.withRls((tx) =>
      tx.qualityInspection.update({
        where: { id: qualityInspectionId },
        data: { status: "REVIEWED", overallDisposition, deviationWorkflowInstanceId, updatedBy: actorId },
      }),
    );
  }

  /** BR-08 — deviationWorkflowInstanceId TIDAK di-null-kan (satu-satunya keputusan deviasi per inspeksi, bukan siklus berulang) — dicek langsung status instance-nya. */
  async close(qualityInspectionId: string): Promise<QualityInspection> {
    const updatedBy = requireActorUserId();
    const inspection = await this.prisma.withRls((tx) => tx.qualityInspection.findUniqueOrThrow({ where: { id: qualityInspectionId } }));
    validateInspectionStatusTransition(inspection.status, "CLOSED");

    let deviationApproved = false;
    if (inspection.deviationWorkflowInstanceId) {
      const instance = await this.prisma.withRls((tx) =>
        tx.workflowInstance.findUniqueOrThrow({ where: { id: inspection.deviationWorkflowInstanceId! } }),
      );
      deviationApproved = instance.status === "APPROVED";
    }
    assertDeviationApprovedBeforeClose(inspection.overallDisposition, deviationApproved);

    return this.prisma.withRls((tx) => tx.qualityInspection.update({ where: { id: qualityInspectionId }, data: { status: "CLOSED", updatedBy } }));
  }

  async getById(qualityInspectionId: string) {
    return this.prisma.withRls((tx) =>
      tx.qualityInspection.findUniqueOrThrow({ where: { id: qualityInspectionId }, include: { parameters: true } }),
    );
  }

  async listBySite(siteId: string): Promise<QualityInspection[]> {
    return this.prisma.withRls((tx) => tx.qualityInspection.findMany({ where: { siteId, deletedAt: null }, orderBy: { inspectionDate: "desc" } }));
  }
}
