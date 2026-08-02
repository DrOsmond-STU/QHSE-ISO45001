import { RiskTreatmentPlan, RiskTreatmentSourceType, RiskTreatmentStatus, RiskTreatmentStrategy } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
export interface CreateRiskTreatmentPlanInput {
    sourceType: RiskTreatmentSourceType;
    sourceId: string;
    treatmentStrategy: RiskTreatmentStrategy;
    treatmentDescription: string;
    responsibleUserId: string;
    targetDate: Date;
    actionTrackingId?: string;
    capaId?: string;
    topManagementApprovedBy?: string;
}
export declare class RiskTreatmentPlanService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    /** Polymorphic lookup requiresEscalation sesuai source_type — SATU-SATUNYA
     * titik yang tahu cara membaca ketiga tabel sumber, dipakai BR-06. */
    private resolveSourceRequiresEscalation;
    create(input: CreateRiskTreatmentPlanInput): Promise<RiskTreatmentPlan>;
    /** PRD §5 "Jika tertaut action_tracking_id, status disinkronkan otomatis
     * dari status action terkait (bukan diedit manual ganda)" — Modul 24
     * (Action Tracking) BELUM ADA di codebase ini, sinkronisasi itu TIDAK
     * bisa terjadi; method ini SELALU jalur manual (gap TDD §26, akan perlu
     * dibatasi/diganti begitu Modul 24 genuinely ada). */
    updateStatus(riskTreatmentId: string, status: RiskTreatmentStatus): Promise<RiskTreatmentPlan>;
    getById(riskTreatmentId: string): Promise<RiskTreatmentPlan>;
    listBySource(sourceType: RiskTreatmentSourceType, sourceId: string): Promise<RiskTreatmentPlan[]>;
}
