import { RiskCategory, RiskRegister } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../../platform/numbering/numbering.service";
import { RiskWorkflowBootstrapService } from "./risk-workflow-bootstrap.service";
export interface CreateRiskRegisterInput {
    companyId?: string;
    riskCategory: RiskCategory;
    riskTitle: string;
    riskDescription: string;
    riskOwnerUserId: string;
    riskMatrixConfigId: string;
    likelihoodInherent: number;
    severityInherent: number;
    currentControls?: string;
    likelihoodResidual: number;
    severityResidual: number;
    identifiedDate: Date;
    nextReviewDate?: Date;
}
export interface UpdateRiskRegisterResidualInput {
    likelihoodResidual: number;
    severityResidual: number;
    currentControls?: string;
}
export declare class RiskRegisterService {
    private readonly prisma;
    private readonly numberingService;
    private readonly bootstrapService;
    constructor(prisma: PrismaService, numberingService: NumberingService, bootstrapService: RiskWorkflowBootstrapService);
    /**
     * BR-01 (inherent+residual dihitung otomatis dari risk_matrix_cells) +
     * risk_appetite_status DITURUNKAN dari requiresEscalation residual (TRUE
     * -> EXCEEDS_APPETITE, FALSE -> WITHIN_APPETITE) — PRD §5 tidak mengatur
     * bagaimana kolom ini diisi eksplisit, diturunkan otomatis dari flag
     * terstruktur yang SAMA dipakai BR-06 (konsisten satu sumber kebenaran,
     * bukan input manual terpisah yang bisa tidak sinkron).
     */
    create(input: CreateRiskRegisterInput): Promise<RiskRegister>;
    /** Reasesmen residual (kontrol baru berjalan) — riskScoreInherent TIDAK
     * pernah berubah (identifikasi risiko awal, historis), hanya sisi
     * residual yang direvisi. */
    updateResidual(riskRegisterId: string, input: UpdateRiskRegisterResidualInput): Promise<RiskRegister>;
    advanceStatus(riskRegisterId: string, status: RiskRegister["status"]): Promise<RiskRegister>;
    getById(riskRegisterId: string): Promise<RiskRegister>;
    /** BR-05 (PRD §6) — review berkala, reset overdueNotifiedAt (siklus
     * overdue "selesai" begitu review genuinely dilakukan), pola PERSIS
     * ComplianceEvaluationService.close() (2.2) mereset kolom due/overdue
     * sejenis. */
    recordReview(riskRegisterId: string, nextReviewDate?: Date): Promise<RiskRegister>;
}
