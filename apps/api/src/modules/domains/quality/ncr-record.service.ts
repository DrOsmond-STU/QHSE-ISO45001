import { Injectable } from "@nestjs/common";
import { NcrRecord, QualityNcrDetectionStage, QualityNcrDisposition, QualityNcrReInspectionResult, QualityNcrSource } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { requireActorUserId, requireTenantId } from "./quality-context";
import { assertCapaRequiredBeforeClose, assertReInspectionPassedBeforeClose, resolveReInspectionRequired, validateNcrStatusTransition } from "./ncr-lifecycle";
import { QualityWorkflowBootstrapService } from "./quality-workflow-bootstrap.service";

const NCR_NUMBERING_MODULE_CODE = "QUALITY_NCR";
// entity_type=ncr_record, entityId=ncr_records.id (satu baris = satu siklus
// disposisi, beda dari CAPA action_plan yang menunjuk baris induk).
const NCR_WORKFLOW_ENTITY_TYPE = "ncr_record";

export interface CreateNcrRecordInput {
  siteId: string;
  departmentId?: string;
  ncrSource: QualityNcrSource;
  productCode?: string;
  productName?: string;
  batchLotNumber?: string;
  processArea?: string;
  title: string;
  description: string;
  detectedDate: Date;
  detectionStage: QualityNcrDetectionStage;
  severity: NcrRecord["severity"];
  defectCategory?: string;
  quantityNonconforming: number;
  unitOfMeasure: string;
  customerComplaintId?: string;
  supplierCode?: string;
  supplierName?: string;
}

export interface ProposeDispositionInput {
  disposition: QualityNcrDisposition;
  dispositionJustification?: string;
}

/**
 * Task 5.1 (Modul 11 §4.1, §3 "QC Inspector/Worker | quality.ncr.create",
 * "Quality Manager | quality.ncr.approve_disposition"). BELUM ada
 * controller HTTP. CAPA-linkage (BR-01) TETAP MANUAL (bukan auto-trigger) —
 * TASK_INSTRUCTION.md acceptance 5.1 berbunyi "NCR DAPAT memicu CAPA"
 * (frasa lebih lunak dari Modul 09 §4 "CAPA dibuat OTOMATIS"), pola sama
 * Incident 3.5's `IncidentCorrectiveActionLinkService.link()` — caller
 * wajib `CapaRegisterService.create({sourceType:"QUALITY_NCR",...})`
 * SENDIRI dulu baru `linkCapaRegister()`, gap TDD §26.
 */
@Injectable()
export class NcrRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: NumberingService,
    private readonly bootstrapService: QualityWorkflowBootstrapService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(input: CreateNcrRecordInput): Promise<NcrRecord> {
    const detectedBy = requireActorUserId();
    const tenantId = requireTenantId();

    await this.bootstrapService.ensureNcrNumberingConfig(input.siteId);
    const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true, companyId: true } }));
    const ncrNumber = await this.numberingService.generateNext(NCR_NUMBERING_MODULE_CODE, {
      scopeId: input.siteId,
      variables: { SITE_CODE: site.siteCode },
    });

    const ncr = await this.prisma.withRls((tx) =>
      tx.ncrRecord.create({
        data: {
          tenantId,
          companyId: site.companyId,
          siteId: input.siteId,
          departmentId: input.departmentId,
          ncrNumber,
          ncrSource: input.ncrSource,
          productCode: input.productCode,
          productName: input.productName,
          batchLotNumber: input.batchLotNumber,
          processArea: input.processArea,
          title: input.title,
          description: input.description,
          detectedDate: input.detectedDate,
          detectedBy,
          detectionStage: input.detectionStage,
          severity: input.severity,
          defectCategory: input.defectCategory,
          quantityNonconforming: input.quantityNonconforming,
          unitOfMeasure: input.unitOfMeasure,
          customerComplaintId: input.customerComplaintId,
          supplierCode: input.supplierCode,
          supplierName: input.supplierName,
          status: "OPEN",
          createdBy: detectedBy,
          updatedBy: detectedBy,
        },
      }),
    );

    // PRD §8 "NCR baru severity=CRITICAL | Quality Manager, HSE Manager".
    if (input.severity === "CRITICAL") {
      const recipients = await this.prisma.withRls((tx) =>
        tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: { in: ["QUALITY_MANAGER", "HSE_MANAGER"] } } } } },
          select: { id: true },
        }),
      );
      for (const recipient of recipients) {
        await this.notificationService.enqueue({
          eventType: "QUALITY_NCR_CRITICAL",
          entityType: "NCR_RECORD",
          entityId: ncr.id,
          recipientUserId: recipient.id,
          priority: "CRITICAL",
          eventCategory: "QUALITY",
          variables: { ncrNumber: ncr.ncrNumber, site: site.siteCode },
        });
      }
    }

    return ncr;
  }

  async recordContainment(ncrRecordId: string, immediateContainmentAction: string): Promise<NcrRecord> {
    const updatedBy = requireActorUserId();
    const ncr = await this.prisma.withRls((tx) => tx.ncrRecord.findUniqueOrThrow({ where: { id: ncrRecordId } }));
    validateNcrStatusTransition(ncr.status, "CONTAINMENT");
    return this.prisma.withRls((tx) =>
      tx.ncrRecord.update({ where: { id: ncrRecordId }, data: { status: "CONTAINMENT", immediateContainmentAction, updatedBy } }),
    );
  }

  /** CONTAINMENT->DISPOSITION_PENDING, submit workflow QUALITY_NCR 3-stage. */
  async proposeDisposition(ncrRecordId: string, input: ProposeDispositionInput): Promise<NcrRecord> {
    const actorId = requireActorUserId();
    const ncr = await this.prisma.withRls((tx) => tx.ncrRecord.findUniqueOrThrow({ where: { id: ncrRecordId } }));
    if (ncr.workflowInstanceId) {
      throw new Error("ncr_records sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
    }
    validateNcrStatusTransition(ncr.status, "DISPOSITION_PENDING");

    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureNcrWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(NCR_WORKFLOW_ENTITY_TYPE, ncrRecordId, definition.id, {});

    return this.prisma.withRls((tx) =>
      tx.ncrRecord.update({
        where: { id: ncrRecordId },
        data: {
          status: "DISPOSITION_PENDING",
          disposition: input.disposition,
          dispositionJustification: input.dispositionJustification,
          reInspectionRequired: resolveReInspectionRequired(input.disposition),
          workflowInstanceId: instance.id,
          updatedBy: actorId,
        },
      }),
    );
  }

  /** Dipanggil NcrWorkflowCompletionListener saat workflow APPROVED. */
  async markDispositionApproved(ncrRecordId: string): Promise<NcrRecord> {
    const ncr = await this.prisma.withRls((tx) => tx.ncrRecord.findUniqueOrThrow({ where: { id: ncrRecordId } }));
    validateNcrStatusTransition(ncr.status, "DISPOSITIONED");
    return this.prisma.withRls((tx) =>
      tx.ncrRecord.update({
        where: { id: ncrRecordId },
        data: { status: "DISPOSITIONED", dispositionApprovedAt: new Date(), workflowInstanceId: null },
      }),
    );
  }

  /** Dipanggil NcrWorkflowCompletionListener saat workflow REJECTED — kembali CONTAINMENT, disposisi diajukan ulang. */
  async returnToContainment(ncrRecordId: string): Promise<NcrRecord> {
    return this.prisma.withRls((tx) =>
      tx.ncrRecord.update({ where: { id: ncrRecordId }, data: { status: "CONTAINMENT", workflowInstanceId: null } }),
    );
  }

  async recordReInspectionResult(ncrRecordId: string, result: QualityNcrReInspectionResult): Promise<NcrRecord> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.ncrRecord.update({ where: { id: ncrRecordId }, data: { reInspectionResult: result, updatedBy } }),
    );
  }

  /** BR-01 — manual link, lihat banner comment kelas ini. */
  async linkCapaRegister(ncrRecordId: string, capaRegisterId: string): Promise<NcrRecord> {
    const updatedBy = requireActorUserId();
    const ncr = await this.prisma.withRls((tx) => tx.ncrRecord.findUniqueOrThrow({ where: { id: ncrRecordId } }));
    validateNcrStatusTransition(ncr.status, "CAPA_LINKED");
    return this.prisma.withRls((tx) =>
      tx.ncrRecord.update({ where: { id: ncrRecordId }, data: { capaRegisterId, status: "CAPA_LINKED", updatedBy } }),
    );
  }

  async close(ncrRecordId: string): Promise<NcrRecord> {
    const updatedBy = requireActorUserId();
    const ncr = await this.prisma.withRls((tx) => tx.ncrRecord.findUniqueOrThrow({ where: { id: ncrRecordId } }));
    validateNcrStatusTransition(ncr.status, "CLOSED");
    assertCapaRequiredBeforeClose(ncr.severity, ncr.capaRegisterId);
    assertReInspectionPassedBeforeClose(ncr.disposition, ncr.reInspectionResult);
    return this.prisma.withRls((tx) =>
      tx.ncrRecord.update({ where: { id: ncrRecordId }, data: { status: "CLOSED", closedDate: new Date(), closedBy: updatedBy, updatedBy } }),
    );
  }

  async cancel(ncrRecordId: string): Promise<NcrRecord> {
    const updatedBy = requireActorUserId();
    const ncr = await this.prisma.withRls((tx) => tx.ncrRecord.findUniqueOrThrow({ where: { id: ncrRecordId } }));
    validateNcrStatusTransition(ncr.status, "CANCELLED");
    return this.prisma.withRls((tx) => tx.ncrRecord.update({ where: { id: ncrRecordId }, data: { status: "CANCELLED", updatedBy } }));
  }

  async getById(ncrRecordId: string): Promise<NcrRecord> {
    return this.prisma.withRls((tx) => tx.ncrRecord.findUniqueOrThrow({ where: { id: ncrRecordId } }));
  }

  async listBySite(siteId: string): Promise<NcrRecord[]> {
    return this.prisma.withRls((tx) => tx.ncrRecord.findMany({ where: { siteId, deletedAt: null }, orderBy: { detectedDate: "desc" } }));
  }
}
