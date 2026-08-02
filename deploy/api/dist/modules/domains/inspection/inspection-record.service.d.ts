import { InspectionRecord, InspectionRecordItem } from "@prisma/client";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { InspectionNumberingBootstrapService } from "./inspection-numbering-bootstrap.service";
export interface CreateInspectionRecordInput {
    inspectionChecklistTemplateId: string;
    inspectionScheduleId?: string;
    siteId: string;
    departmentId?: string;
    plannedDate?: Date;
    inspectorId: string;
}
export interface SubmitInspectionRecordItemInput {
    templateItemId: string;
    responseValue: string;
    comment?: string;
}
export declare class InspectionRecordService {
    private readonly prisma;
    private readonly numberingService;
    private readonly numberingBootstrapService;
    constructor(prisma: PrismaService, numberingService: NumberingService, numberingBootstrapService: InspectionNumberingBootstrapService);
    /**
     * PRD §4 poin 3 "Sistem membangkitkan instance inspection_records otomatis
     * dari jadwal MENJELANG tanggal jatuh tempo, ATAU Inspector menginisiasi
     * inspeksi ad-hoc langsung dari inspection_types TANPA jadwal" —
     * inspectionScheduleId opsional (NULL = ad-hoc). BR-07 snapshot terpenuhi
     * KRN inspectionChecklistTemplateId yang caller suplai disimpan permanen
     * di baris ini, TIDAK PERNAH ikut berubah kalau template dapat versi baru.
     */
    create(input: CreateInspectionRecordInput): Promise<InspectionRecord>;
    start(inspectionRecordId: string): Promise<InspectionRecord>;
    /** Upsert-by-(record,templateItem) — Inspector boleh mengoreksi jawaban
     * sebelum status COMPLETED (TIDAK ADA guard "sekali isi terkunci" —
     * PRD tidak menyebutnya). scoreObtained dihitung LANGSUNG saat submit
     * (computeItemScore()), BUKAN ditunda ke complete(). */
    submitItemResponse(inspectionRecordId: string, input: SubmitInspectionRecordItemInput): Promise<InspectionRecordItem>;
    /**
     * BR-01 (seluruh item mandatory terjawab) + BR-02 (foto wajib utk item
     * requires_photo_if_fail=TRUE ber-response FAIL — dicek lewat query
     * `attachments` LANGSUNG, entity_type=inspection_record_item, POLA SAMA
     * precedent cross-module read-only lain di codebase ini, BUKAN inject
     * AttachmentService) ditegakkan SEBELUM tulis apa pun. BR-03 — overall_score/
     * overall_result dihitung SAAT INI (pure fn incident-scoring.ts).
     */
    complete(inspectionRecordId: string): Promise<InspectionRecord>;
    /** BR-03 "dibuka ulang (reopen) oleh HSE Manager dengan jejak audit" —
     * "siapa boleh" ditegakkan lewat RBAC (permission_code) di layer
     * pemanggil (BELUM ada controller HTTP), jejak audit lewat
     * audit_log_trigger generik + updatedBy. overallScore/overallResult
     * SENGAJA TIDAK direset (biar tetap terlihat nilai TERAKHIR sampai
     * complete() dipanggil ulang). */
    reopen(inspectionRecordId: string): Promise<InspectionRecord>;
    cancel(inspectionRecordId: string): Promise<InspectionRecord>;
    getById(inspectionRecordId: string): Promise<{
        items: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            comment: string | null;
            inspectionRecordId: string;
            templateItemId: string;
            responseValue: string;
            scoreObtained: import("@prisma/client/runtime/library").Decimal | null;
        }[];
        findings: {
            status: import("@prisma/client").$Enums.InspectionFindingStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            title: string;
            deletedAt: Date | null;
            description: string;
            identifiedBy: string;
            identifiedAt: Date;
            closedAt: Date | null;
            severity: import("@prisma/client").$Enums.InspectionFindingSeverity;
            actionTrackingId: string | null;
            inspectionRecordId: string;
            recordItemId: string | null;
            areaLocation: string | null;
            escalatedCapaRegisterId: string | null;
            targetCloseDate: Date | null;
        }[];
        scores: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            category: string;
            inspectionRecordId: string;
            scoreObtained: import("@prisma/client/runtime/library").Decimal;
            maxPossibleScore: import("@prisma/client/runtime/library").Decimal;
            percentage: import("@prisma/client/runtime/library").Decimal;
        }[];
    } & {
        status: import("@prisma/client").$Enums.InspectionRecordStatus;
        id: string;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        departmentId: string | null;
        siteId: string;
        deletedAt: Date | null;
        companyId: string | null;
        branchId: string | null;
        notes: string | null;
        customFields: import("@prisma/client/runtime/library").JsonValue;
        actualDate: Date | null;
        inspectionChecklistTemplateId: string;
        inspectionRecordNumber: string | null;
        inspectionScheduleId: string | null;
        plannedDate: Date | null;
        inspectorId: string;
        overallScore: import("@prisma/client/runtime/library").Decimal | null;
        overallResult: import("@prisma/client").$Enums.InspectionOverallResult | null;
    }>;
}
