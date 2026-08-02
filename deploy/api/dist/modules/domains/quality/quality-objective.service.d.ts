import { QualityObjective, QualityObjectiveMeasurementFrequency, QualityObjectiveProgressLog } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NotificationService } from "../../../platform/notification/notification.service";
export interface CreateQualityObjectiveInput {
    companyId: string;
    branchId?: string;
    siteId?: string;
    departmentId?: string;
    objectiveCode: string;
    objectiveTitle: string;
    description?: string;
    isoClauseRef?: string;
    relatedPolicyDocumentId?: string;
    kpiMetricName: string;
    targetValue: number;
    targetUnit?: string;
    baselineValue?: number;
    atRiskThresholdPercentage?: number;
    measurementFrequency: QualityObjectiveMeasurementFrequency;
    ownerUserId?: string;
    periodStart: Date;
    periodEnd: Date;
}
/**
 * Task 5.1 (Modul 11 §4.5, §3 "Quality Manager | quality.objective.manage").
 * BELUM ada controller HTTP. TIDAK memakai Workflow Engine (PRD §4.5 literal
 * "bersifat perencanaan berkala" — perubahan target_value setelah periode
 * berjalan "direkomendasikan melalui approval sederhana... opsional per
 * tenant", TIDAK diimplementasikan krn tidak ada kolom konfigurasi
 * tenant utk mengaktifkannya, gap TDD §26, pola sama Root Cause Review
 * CAPA §4 "opsional per tenant" 4.2).
 */
export declare class QualityObjectiveService {
    private readonly prisma;
    private readonly notificationService;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    create(input: CreateQualityObjectiveInput): Promise<QualityObjective>;
    /**
     * BR-05 — catat quality_objective_progress_logs, mutakhirkan current_value
     * + status (HANYA jika status saat ini masih ON_TRACK/AT_RISK — status
     * manual-terminal ACHIEVED/NOT_ACHIEVED/DISCONTINUED dari reviewOutcome()
     * TIDAK PERNAH ditimpa kalkulasi otomatis ini).
     */
    recordProgress(qualityObjectiveId: string, periodLabel: string, actualValue: number, notes?: string): Promise<QualityObjectiveProgressLog>;
    /** §4.5 poin 4 — hasil review Management Review, manual override terminal. */
    reviewOutcome(qualityObjectiveId: string, status: "ACHIEVED" | "NOT_ACHIEVED" | "DISCONTINUED"): Promise<QualityObjective>;
    getById(qualityObjectiveId: string): Promise<{
        progressLogs: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            notes: string | null;
            recordedBy: string;
            qualityObjectiveId: string;
            periodLabel: string;
            actualValue: import("@prisma/client/runtime/library").Decimal;
            recordedAt: Date;
        }[];
    } & {
        status: import("@prisma/client").$Enums.QualityObjectiveStatus;
        id: string;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        departmentId: string | null;
        siteId: string | null;
        deletedAt: Date | null;
        companyId: string;
        branchId: string | null;
        description: string | null;
        ownerUserId: string | null;
        lastReviewedDate: Date | null;
        objectiveCode: string;
        objectiveTitle: string;
        isoClauseRef: string;
        relatedPolicyDocumentId: string | null;
        kpiMetricName: string;
        targetValue: import("@prisma/client/runtime/library").Decimal;
        targetUnit: string | null;
        baselineValue: import("@prisma/client/runtime/library").Decimal | null;
        currentValue: import("@prisma/client/runtime/library").Decimal | null;
        atRiskThresholdPercentage: import("@prisma/client/runtime/library").Decimal;
        measurementFrequency: import("@prisma/client").$Enums.QualityObjectiveMeasurementFrequency;
        periodStart: Date;
        periodEnd: Date;
    }>;
    listByCompany(companyId: string): Promise<QualityObjective[]>;
}
