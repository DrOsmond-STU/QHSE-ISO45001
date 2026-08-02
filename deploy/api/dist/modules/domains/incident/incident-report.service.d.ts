import { IncidentClassification, IncidentReport, Prisma } from "@prisma/client";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { IncidentWorkflowBootstrapService } from "./incident-workflow-bootstrap.service";
export interface CreateIncidentReportInput {
    siteId: string;
    departmentId?: string;
    initialClassification: IncidentClassification;
    incidentDatetime: Date;
    locationDetail?: string;
    description: string;
    immediateActionTaken?: string;
    reportedBy?: string;
    isAnonymous?: boolean;
    injuredPersonId?: string;
    workPermitId?: string;
    involvesContractor?: boolean;
    contractorCompanyId?: string;
    daysLost?: number;
    estimatedCost?: number;
    customFields?: Prisma.InputJsonValue;
}
export declare class IncidentReportService {
    private readonly prisma;
    private readonly numberingService;
    private readonly bootstrapService;
    constructor(prisma: PrismaService, numberingService: NumberingService, bootstrapService: IncidentWorkflowBootstrapService);
    /**
     * PRD §4 poin 1 "siapa pun membuat incident_reports dgn informasi minimal."
     * incident_number DIGENERATE SAAT CREATE (bukan ditunda), pola PERSIS
     * WorkPermitService.create() (3.3). BR-04 — reportedBy WAJIB null kalau
     * isAnonymous=TRUE (satu-satunya titik dimana kombinasi itu ditentukan;
     * TIDAK ADA method update() yang bisa mengubahnya nanti, jadi "tidak
     * dapat diubah menjadi anonim setelah submit" terpenuhi BY CONSTRUCTION).
     * classification AWAL = initialClassification (sama persis, blm
     * difinalisasi HSE Officer — lihat classify()). severityLevel dihitung
     * dari initialClassification saat ini (computeSeverityLevel(), incident-severity.ts
     * — gap TDD §26, PRD tidak menyediakan tabel pemetaan literal).
     */
    create(input: CreateIncidentReportInput): Promise<IncidentReport>;
    /**
     * PRD §4 poin 3 "Verifikasi/triase — HSE Officer memfinalisasi
     * classification (dapat berbeda dari initial_classification, perubahan
     * tercatat di audit log)." BR-02 — jejak perubahan terpenuhi lewat
     * audit_log_trigger generik (TIDAK ada tabel riwayat classification
     * terpisah, pola sama correctRiskLevel() Work Permit 3.3). "memicu
     * perhitungan ulang incident_statistics_cache periode terkait" DIBACA
     * sbg terpenuhi PASIF oleh scan harian berikutnya (BR-06 eksplisit
     * "TIDAK dihitung on-the-fly") — TIDAK ADA panggilan recalc SINKRON di
     * sini, gap didokumentasikan TDD §26. severityLevel ikut dihitung ulang
     * dari classification BARU. status REPORTED->UNDER_VERIFICATION kalau
     * masih REPORTED (reklasifikasi di status LEBIH LANJUT tetap diizinkan
     * tanpa transisi status tambahan — BR-02 tidak membatasi kapan).
     */
    classify(incidentReportId: string, classification: IncidentClassification): Promise<IncidentReport>;
    getById(incidentReportId: string): Promise<{
        correctiveActionLinks: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            capaRegisterId: string;
            incidentReportId: string;
            incidentInvestigationId: string | null;
            capaStatusCache: string | null;
            linkedBy: string;
            linkedAt: Date;
        }[];
        investigations: {
            method: import("@prisma/client").$Enums.IncidentInvestigationMethod;
            status: import("@prisma/client").$Enums.IncidentInvestigationStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            startedAt: Date;
            completedAt: Date | null;
            workflowInstanceId: string | null;
            incidentReportId: string;
            methodOtherDetail: string | null;
            leadInvestigatorId: string;
            targetCompletionAt: Date;
            findingsSummary: string | null;
        }[];
        witnessStatements: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            recordedBy: string;
            incidentReportId: string;
            witnessUserId: string | null;
            witnessNameExternal: string | null;
            statementText: string;
            statementDatetime: Date;
        }[];
        regulatoryReports: {
            status: import("@prisma/client").$Enums.IncidentRegulatoryReportStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            notes: string | null;
            incidentReportId: string;
            regulatoryBody: import("@prisma/client").$Enums.IncidentRegulatoryBody;
            reportType: string;
            requiredByDate: Date;
            submittedDate: Date | null;
            officialReferenceNumber: string | null;
            submittedBy: string | null;
        }[];
    } & {
        status: import("@prisma/client").$Enums.IncidentReportStatus;
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
        classification: import("@prisma/client").$Enums.IncidentClassification;
        description: string;
        incidentNumber: string;
        initialClassification: import("@prisma/client").$Enums.IncidentClassification;
        severityLevel: import("@prisma/client").$Enums.IncidentSeverityLevel;
        incidentDatetime: Date;
        reportedDatetime: Date;
        locationDetail: string | null;
        immediateActionTaken: string | null;
        reportedBy: string | null;
        isAnonymous: boolean;
        injuredPersonId: string | null;
        workPermitId: string | null;
        involvesContractor: boolean;
        contractorCompanyId: string | null;
        daysLost: number | null;
        estimatedCost: Prisma.Decimal | null;
        customFields: Prisma.JsonValue;
    }>;
    /**
     * BR-01 + BR-09 gate, ditegakkan SEBELUM tulis apa pun. Status sumber
     * BOLEH UNDER_VERIFICATION (insiden ringan tanpa investigasi wajib,
     * langsung ditutup), INVESTIGATION_COMPLETED, ATAU PENDING_REGULATORY_REPORT
     * (validateIncidentReportStatusTransition menegakkan mana yang genuinely
     * valid utk baris ini).
     */
    close(incidentReportId: string): Promise<IncidentReport>;
    /** PRD §5 enum incident_reports.status "REOPENED" + ERD "bisa >1
     * incident_investigations jika REOPENED" — investigasi BARU dibuat
     * terpisah oleh IncidentInvestigationService setelah ini (REOPENED->
     * UNDER_INVESTIGATION, lihat incident-lifecycle.ts). */
    reopen(incidentReportId: string): Promise<IncidentReport>;
}
