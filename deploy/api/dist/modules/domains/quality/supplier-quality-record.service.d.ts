import { SupplierQualityRecord, QualitySupplierCategory, QualitySupplierEvaluationType, QualitySupplierRating, Prisma } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { QualityWorkflowBootstrapService } from "./quality-workflow-bootstrap.service";
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
export declare class SupplierQualityRecordService {
    private readonly prisma;
    private readonly bootstrapService;
    private readonly workflowEngineService;
    constructor(prisma: PrismaService, bootstrapService: QualityWorkflowBootstrapService, workflowEngineService: WorkflowEngineService);
    create(input: CreateSupplierQualityRecordInput): Promise<SupplierQualityRecord>;
    submitForApproval(supplierQualityRecordId: string, rating: QualitySupplierRating): Promise<SupplierQualityRecord>;
    /** Dipanggil SupplierEvalWorkflowCompletionListener saat workflow APPROVED. BR-04-analog dicek DI SINI (bukan submit) — rating final baru genuinely diketahui setelah approval. */
    markApproved(supplierQualityRecordId: string): Promise<SupplierQualityRecord>;
    returnToDraft(supplierQualityRecordId: string): Promise<SupplierQualityRecord>;
    /** §4.4 poin 3 — manual link, pola sama NcrRecordService.linkCapaRegister(). */
    linkCapaRegister(supplierQualityRecordId: string, capaRegisterId: string): Promise<SupplierQualityRecord>;
    archive(supplierQualityRecordId: string): Promise<SupplierQualityRecord>;
    getById(supplierQualityRecordId: string): Promise<SupplierQualityRecord>;
}
