import { NcrRecord, QualityNcrDetectionStage, QualityNcrDisposition, QualityNcrReInspectionResult, QualityNcrSource } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { QualityWorkflowBootstrapService } from "./quality-workflow-bootstrap.service";
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
export declare class NcrRecordService {
    private readonly prisma;
    private readonly numberingService;
    private readonly bootstrapService;
    private readonly workflowEngineService;
    private readonly notificationService;
    constructor(prisma: PrismaService, numberingService: NumberingService, bootstrapService: QualityWorkflowBootstrapService, workflowEngineService: WorkflowEngineService, notificationService: NotificationService);
    create(input: CreateNcrRecordInput): Promise<NcrRecord>;
    recordContainment(ncrRecordId: string, immediateContainmentAction: string): Promise<NcrRecord>;
    /** CONTAINMENT->DISPOSITION_PENDING, submit workflow QUALITY_NCR 3-stage. */
    proposeDisposition(ncrRecordId: string, input: ProposeDispositionInput): Promise<NcrRecord>;
    /** Dipanggil NcrWorkflowCompletionListener saat workflow APPROVED. */
    markDispositionApproved(ncrRecordId: string): Promise<NcrRecord>;
    /** Dipanggil NcrWorkflowCompletionListener saat workflow REJECTED — kembali CONTAINMENT, disposisi diajukan ulang. */
    returnToContainment(ncrRecordId: string): Promise<NcrRecord>;
    recordReInspectionResult(ncrRecordId: string, result: QualityNcrReInspectionResult): Promise<NcrRecord>;
    /** BR-01 — manual link, lihat banner comment kelas ini. */
    linkCapaRegister(ncrRecordId: string, capaRegisterId: string): Promise<NcrRecord>;
    close(ncrRecordId: string): Promise<NcrRecord>;
    cancel(ncrRecordId: string): Promise<NcrRecord>;
    getById(ncrRecordId: string): Promise<NcrRecord>;
    listBySite(siteId: string): Promise<NcrRecord[]>;
}
