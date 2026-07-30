import { Injectable } from "@nestjs/common";
import { CustomerComplaint, QualityComplaintCategory, QualityComplaintChannel, QualityComplaintSeverity } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { requireActorUserId, requireTenantId } from "./quality-context";
import { assertCapaRequiredForCategory, validateComplaintStatusTransition } from "./complaint-lifecycle";
import { QualityWorkflowBootstrapService } from "./quality-workflow-bootstrap.service";

const COMPLAINT_NUMBERING_MODULE_CODE = "QUALITY_COMPLAINT";
const COMPLAINT_WORKFLOW_ENTITY_TYPE = "customer_complaint";
// PRD §4.2 poin 1 "SLA respons awal (default 2x24 jam, configurable)" —
// TIDAK ADA kolom tenant-config utk override ini di skema §5 literal —
// hardcode 48 jam, gap TDD §26 (pola sama seluruh SLA invented lain).
const DEFAULT_INITIAL_RESPONSE_SLA_HOURS = 48;

export interface CreateCustomerComplaintInput {
  companyId: string;
  siteId?: string;
  customerName: string;
  customerCode?: string;
  customerContactPerson?: string;
  customerContactEmail?: string;
  customerContactPhone?: string;
  productCode?: string;
  productName?: string;
  batchLotNumber?: string;
  quantityAffected?: number;
  complaintChannel: QualityComplaintChannel;
  complaintDate: Date;
  description: string;
  complaintCategory: QualityComplaintCategory;
  severity: QualityComplaintSeverity;
}

/**
 * Task 5.1 (Modul 11 §4.2, §3 "Customer Service/Sales | quality.complaint.create",
 * "Quality Manager | quality.complaint.manage"). BELUM ada controller HTTP.
 */
@Injectable()
export class CustomerComplaintService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: NumberingService,
    private readonly bootstrapService: QualityWorkflowBootstrapService,
    private readonly workflowEngineService: WorkflowEngineService,
  ) {}

  async create(input: CreateCustomerComplaintInput): Promise<CustomerComplaint> {
    const receivedBy = requireActorUserId();
    const tenantId = requireTenantId();

    await this.bootstrapService.ensureComplaintNumberingConfig();
    const complaintNumber = await this.numberingService.generateNext(COMPLAINT_NUMBERING_MODULE_CODE, { variables: {} });
    const initialResponseDueDate = new Date(input.complaintDate.getTime() + DEFAULT_INITIAL_RESPONSE_SLA_HOURS * 60 * 60 * 1000);

    return this.prisma.withRls((tx) =>
      tx.customerComplaint.create({
        data: {
          tenantId,
          companyId: input.companyId,
          siteId: input.siteId,
          complaintNumber,
          customerName: input.customerName,
          customerCode: input.customerCode,
          customerContactPerson: input.customerContactPerson,
          customerContactEmail: input.customerContactEmail,
          customerContactPhone: input.customerContactPhone,
          productCode: input.productCode,
          productName: input.productName,
          batchLotNumber: input.batchLotNumber,
          quantityAffected: input.quantityAffected,
          complaintChannel: input.complaintChannel,
          complaintDate: input.complaintDate,
          receivedBy,
          description: input.description,
          complaintCategory: input.complaintCategory,
          severity: input.severity,
          initialResponseDueDate,
          status: "RECEIVED",
          createdBy: receivedBy,
          updatedBy: receivedBy,
        },
      }),
    );
  }

  async recordInitialResponse(complaintId: string): Promise<CustomerComplaint> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.customerComplaint.update({ where: { id: complaintId }, data: { initialResponseSentAt: new Date(), updatedBy } }),
    );
  }

  /** RECEIVED->UNDER_INVESTIGATION, opsional tautkan ncr_id (§4.2 poin 2). */
  async startInvestigation(complaintId: string, investigationSummary?: string, ncrId?: string): Promise<CustomerComplaint> {
    const updatedBy = requireActorUserId();
    const complaint = await this.prisma.withRls((tx) => tx.customerComplaint.findUniqueOrThrow({ where: { id: complaintId } }));
    validateComplaintStatusTransition(complaint.status, "UNDER_INVESTIGATION");
    return this.prisma.withRls((tx) =>
      tx.customerComplaint.update({
        where: { id: complaintId },
        data: { status: "UNDER_INVESTIGATION", investigationSummary, ncrId, updatedBy },
      }),
    );
  }

  /** Submit workflow QUALITY_COMPLAINT 3-stage (Investigasi->Review Approval->Konfirmasi Penutupan). */
  async submitForApproval(complaintId: string): Promise<CustomerComplaint> {
    const actorId = requireActorUserId();
    const complaint = await this.prisma.withRls((tx) => tx.customerComplaint.findUniqueOrThrow({ where: { id: complaintId } }));
    if (complaint.workflowInstanceId) {
      throw new Error("customer_complaints sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
    }

    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureComplaintWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(COMPLAINT_WORKFLOW_ENTITY_TYPE, complaintId, definition.id, {});

    return this.prisma.withRls((tx) =>
      tx.customerComplaint.update({ where: { id: complaintId }, data: { workflowInstanceId: instance.id, updatedBy: actorId } }),
    );
  }

  /**
   * Dipanggil CustomerComplaintWorkflowCompletionListener saat workflow
   * APPROVED — severity HIGH/CRITICAL TANPA capa_id -> CAPA_IN_PROGRESS
   * (BR-01-analog, tunggu linkCapaRegister() manual); selainnya -> RESOLVED
   * langsung (BR-01-analog terpenuhi trivially, tidak butuh CAPA).
   */
  async markInvestigationApproved(complaintId: string): Promise<CustomerComplaint> {
    const complaint = await this.prisma.withRls((tx) => tx.customerComplaint.findUniqueOrThrow({ where: { id: complaintId } }));
    const needsCapa = (complaint.severity === "HIGH" || complaint.severity === "CRITICAL") && !complaint.capaRegisterId;
    const nextStatus = needsCapa ? "CAPA_IN_PROGRESS" : "RESOLVED";
    validateComplaintStatusTransition(complaint.status, nextStatus);
    return this.prisma.withRls((tx) =>
      tx.customerComplaint.update({ where: { id: complaintId }, data: { status: nextStatus, workflowInstanceId: null } }),
    );
  }

  async returnToInvestigation(complaintId: string): Promise<CustomerComplaint> {
    return this.prisma.withRls((tx) =>
      tx.customerComplaint.update({ where: { id: complaintId }, data: { status: "UNDER_INVESTIGATION", workflowInstanceId: null } }),
    );
  }

  /** BR-01-analog — manual link, pola sama NcrRecordService.linkCapaRegister(). */
  async linkCapaRegister(complaintId: string, capaRegisterId: string): Promise<CustomerComplaint> {
    const updatedBy = requireActorUserId();
    const complaint = await this.prisma.withRls((tx) => tx.customerComplaint.findUniqueOrThrow({ where: { id: complaintId } }));
    assertCapaRequiredForCategory(complaint.severity, capaRegisterId);
    return this.prisma.withRls((tx) =>
      tx.customerComplaint.update({ where: { id: complaintId }, data: { capaRegisterId, status: "RESOLVED", updatedBy } }),
    );
  }

  async confirmCustomerSatisfaction(complaintId: string, rootCauseSummary?: string, correctiveActionSummary?: string): Promise<CustomerComplaint> {
    const updatedBy = requireActorUserId();
    const complaint = await this.prisma.withRls((tx) => tx.customerComplaint.findUniqueOrThrow({ where: { id: complaintId } }));
    validateComplaintStatusTransition(complaint.status, "CLOSED");
    assertCapaRequiredForCategory(complaint.severity, complaint.capaRegisterId);
    return this.prisma.withRls((tx) =>
      tx.customerComplaint.update({
        where: { id: complaintId },
        data: {
          status: "CLOSED",
          customerSatisfactionConfirmed: true,
          customerFeedbackDate: new Date(),
          rootCauseSummary,
          correctiveActionSummary,
          closedDate: new Date(),
          closedBy: updatedBy,
          updatedBy,
        },
      }),
    );
  }

  async reject(complaintId: string): Promise<CustomerComplaint> {
    const updatedBy = requireActorUserId();
    const complaint = await this.prisma.withRls((tx) => tx.customerComplaint.findUniqueOrThrow({ where: { id: complaintId } }));
    validateComplaintStatusTransition(complaint.status, "REJECTED_INVALID");
    return this.prisma.withRls((tx) =>
      tx.customerComplaint.update({ where: { id: complaintId }, data: { status: "REJECTED_INVALID", updatedBy } }),
    );
  }

  async getById(complaintId: string): Promise<CustomerComplaint> {
    return this.prisma.withRls((tx) => tx.customerComplaint.findUniqueOrThrow({ where: { id: complaintId } }));
  }
}
