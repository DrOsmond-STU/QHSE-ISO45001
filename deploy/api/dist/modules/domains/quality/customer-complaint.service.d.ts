import { CustomerComplaint, QualityComplaintCategory, QualityComplaintChannel, QualityComplaintSeverity } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { QualityWorkflowBootstrapService } from "./quality-workflow-bootstrap.service";
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
export declare class CustomerComplaintService {
    private readonly prisma;
    private readonly numberingService;
    private readonly bootstrapService;
    private readonly workflowEngineService;
    constructor(prisma: PrismaService, numberingService: NumberingService, bootstrapService: QualityWorkflowBootstrapService, workflowEngineService: WorkflowEngineService);
    create(input: CreateCustomerComplaintInput): Promise<CustomerComplaint>;
    recordInitialResponse(complaintId: string): Promise<CustomerComplaint>;
    /** RECEIVED->UNDER_INVESTIGATION, opsional tautkan ncr_id (§4.2 poin 2). */
    startInvestigation(complaintId: string, investigationSummary?: string, ncrId?: string): Promise<CustomerComplaint>;
    /** Submit workflow QUALITY_COMPLAINT 3-stage (Investigasi->Review Approval->Konfirmasi Penutupan). */
    submitForApproval(complaintId: string): Promise<CustomerComplaint>;
    /**
     * Dipanggil CustomerComplaintWorkflowCompletionListener saat workflow
     * APPROVED — severity HIGH/CRITICAL TANPA capa_id -> CAPA_IN_PROGRESS
     * (BR-01-analog, tunggu linkCapaRegister() manual); selainnya -> RESOLVED
     * langsung (BR-01-analog terpenuhi trivially, tidak butuh CAPA).
     */
    markInvestigationApproved(complaintId: string): Promise<CustomerComplaint>;
    returnToInvestigation(complaintId: string): Promise<CustomerComplaint>;
    /** BR-01-analog — manual link, pola sama NcrRecordService.linkCapaRegister(). */
    linkCapaRegister(complaintId: string, capaRegisterId: string): Promise<CustomerComplaint>;
    confirmCustomerSatisfaction(complaintId: string, rootCauseSummary?: string, correctiveActionSummary?: string): Promise<CustomerComplaint>;
    reject(complaintId: string): Promise<CustomerComplaint>;
    getById(complaintId: string): Promise<CustomerComplaint>;
}
