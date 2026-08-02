import { QualityInspection, QualityInspectionDisposition, QualityInspectionParameterResult, QualityInspectionType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { QualityWorkflowBootstrapService } from "./quality-workflow-bootstrap.service";
import { NcrRecordService } from "./ncr-record.service";
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
export declare class QualityInspectionService {
    private readonly prisma;
    private readonly numberingService;
    private readonly bootstrapService;
    private readonly workflowEngineService;
    private readonly ncrRecordService;
    private readonly notificationService;
    constructor(prisma: PrismaService, numberingService: NumberingService, bootstrapService: QualityWorkflowBootstrapService, workflowEngineService: WorkflowEngineService, ncrRecordService: NcrRecordService, notificationService: NotificationService);
    create(input: CreateQualityInspectionInput): Promise<QualityInspection>;
    recordParameterResult(parameterId: string, measuredValue: number, result: QualityInspectionParameterResult): Promise<void>;
    /**
     * DRAFT->SUBMITTED. Agregasi result_status dari parameter (ANY FAIL ->
     * FAIL, selainnya PASS — CONDITIONAL_PASS SELALU keputusan manual review(),
     * tidak pernah hasil agregasi otomatis). BR-03 dieksekusi di sini —
     * FAIL pada FINAL/PRE_SHIPMENT -> draft ncr_records otomatis.
     */
    submit(qualityInspectionId: string): Promise<QualityInspection>;
    /**
     * SUBMITTED->REVIEWED. overallDisposition=USE_AS_IS_DEVIATION memicu
     * workflow QUALITY_INSPECTION_DEVIATION 1-stage (BR-08) — status inspeksi
     * TETAP maju ke REVIEWED (bukan menunggu approval di sini), gate
     * sesungguhnya ada di close() (BR-08 baru ditegakkan sebelum CLOSED,
     * bukan sebelum REVIEWED — PRD §4.3 poin 4 hanya bilang "wajib approval
     * ... sebelum status inspeksi CLOSED", bukan sebelum REVIEWED).
     */
    review(qualityInspectionId: string, overallDisposition: QualityInspectionDisposition): Promise<QualityInspection>;
    /** BR-08 — deviationWorkflowInstanceId TIDAK di-null-kan (satu-satunya keputusan deviasi per inspeksi, bukan siklus berulang) — dicek langsung status instance-nya. */
    close(qualityInspectionId: string): Promise<QualityInspection>;
    getById(qualityInspectionId: string): Promise<{
        parameters: {
            id: string;
            result: import("@prisma/client").$Enums.QualityInspectionParameterResult;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            sequenceNo: number;
            parameterName: string;
            unitOfMeasure: string | null;
            notes: string | null;
            specificationMin: import("@prisma/client/runtime/library").Decimal | null;
            specificationMax: import("@prisma/client/runtime/library").Decimal | null;
            measuredValue: import("@prisma/client/runtime/library").Decimal | null;
            qualityInspectionId: string;
        }[];
    } & {
        status: import("@prisma/client").$Enums.QualityInspectionStatus;
        id: string;
        inspectionType: import("@prisma/client").$Enums.QualityInspectionType;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        departmentId: string | null;
        siteId: string;
        deletedAt: Date | null;
        resultStatus: import("@prisma/client").$Enums.QualityInspectionResultStatus;
        customFields: import("@prisma/client/runtime/library").JsonValue;
        productCode: string | null;
        productName: string | null;
        batchLotNumber: string | null;
        supplierCode: string | null;
        inspectionDate: Date;
        inspectorId: string;
        inspectionNumber: string;
        workOrderNumber: string | null;
        quantityInspected: import("@prisma/client/runtime/library").Decimal;
        quantitySampled: import("@prisma/client/runtime/library").Decimal | null;
        samplingMethod: string | null;
        measuringEquipmentAssetId: string | null;
        overallDisposition: import("@prisma/client").$Enums.QualityInspectionDisposition | null;
        deviationWorkflowInstanceId: string | null;
        autoGeneratedNcrId: string | null;
    }>;
    listBySite(siteId: string): Promise<QualityInspection[]>;
}
