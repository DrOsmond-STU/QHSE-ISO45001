import { CapaEffectivenessVerification, CapaVerificationMethod } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { CapaWorkflowBootstrapService } from "./capa-workflow-bootstrap.service";
import { CapaApprovalCacheService } from "./capa-approval-cache.service";
export interface CreateCapaEffectivenessVerificationInput {
    capaRegisterId: string;
    verificationMethod: CapaVerificationMethod;
    observationPeriodDays: number;
    verificationDueDate: Date;
    verifiedBy: string;
}
export interface RecordCapaEffectivenessVerificationResultInput {
    result: "EFFECTIVE" | "NOT_EFFECTIVE";
    evidenceDescription?: string;
    notes?: string;
}
/**
 * Task 4.2 (Modul 10 §4 poin 7-9, §3 "Effectiveness Verifier | capa.effectiveness.verify").
 * BELUM ada controller HTTP. create() menjadwalkan/menugaskan verifikasi
 * (BR-02+BR-03 gate SEBELUM capa_register.status->PENDING_EFFECTIVENESS_VERIFICATION);
 * recordResult() dipanggil TERPISAH begitu Verifier genuinely
 * menyelesaikan observasi (bisa berhari-hari/berbulan setelah create(),
 * PRD §4 poin 7 "observation_period_days... 30-90 hari" — BUKAN transaksi
 * yang sama).
 */
export declare class CapaEffectivenessVerificationService {
    private readonly prisma;
    private readonly bootstrapService;
    private readonly workflowEngineService;
    private readonly approvalCacheService;
    constructor(prisma: PrismaService, bootstrapService: CapaWorkflowBootstrapService, workflowEngineService: WorkflowEngineService, approvalCacheService: CapaApprovalCacheService);
    create(input: CreateCapaEffectivenessVerificationInput): Promise<CapaEffectivenessVerification>;
    recordResult(effectivenessVerificationId: string, input: RecordCapaEffectivenessVerificationResultInput): Promise<CapaEffectivenessVerification>;
    submitForApproval(effectivenessVerificationId: string): Promise<CapaEffectivenessVerification>;
    getById(effectivenessVerificationId: string): Promise<CapaEffectivenessVerification>;
    listByCapa(capaRegisterId: string): Promise<CapaEffectivenessVerification[]>;
}
