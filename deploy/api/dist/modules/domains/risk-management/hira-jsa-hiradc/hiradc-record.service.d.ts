import { HiradcLine, HiradcRecord, Prisma } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../../platform/numbering/numbering.service";
import { WorkflowEngineService } from "../../../../platform/workflow-engine/workflow-engine.service";
import { RiskWorkflowBootstrapService } from "./risk-workflow-bootstrap.service";
export interface CreateHiradcRecordInput {
    siteId: string;
    departmentId?: string;
    relatedHiraId?: string;
    relatedJsaId?: string;
    workPermitId?: string;
    taskDescription: string;
    performedBy: string;
    assessmentDatetime: Date;
    validUntil: Date;
}
export interface AddHiradcLineInput {
    hazardId?: string;
    hazardDescriptionFreetext?: string;
    likelihood: number;
    severity: number;
    controlMeasures: string;
    ppeRequired?: string[];
}
export declare class HiradcRecordService {
    private readonly prisma;
    private readonly numberingService;
    private readonly workflowEngineService;
    private readonly bootstrapService;
    constructor(prisma: PrismaService, numberingService: NumberingService, workflowEngineService: WorkflowEngineService, bootstrapService: RiskWorkflowBootstrapService);
    create(input: CreateHiradcRecordInput): Promise<HiradcRecord>;
    addLine(hiradcId: string, input: AddHiradcLineInput): Promise<HiradcLine>;
    getById(hiradcId: string): Promise<{
        lines: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            likelihood: number;
            severity: number;
            hazardId: string | null;
            hazardDescriptionFreetext: string | null;
            requiresEscalation: boolean;
            riskScore: number;
            riskLevel: string;
            hiradcId: string;
            controlMeasures: string;
            ppeRequired: Prisma.JsonValue;
        }[];
    } & {
        status: import("@prisma/client").$Enums.HiradcRecordStatus;
        id: string;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        departmentId: string | null;
        siteId: string;
        deletedAt: Date | null;
        workflowInstanceId: string | null;
        workPermitId: string | null;
        relatedHiraId: string | null;
        performedBy: string;
        validUntil: Date | null;
        hiradcNumber: string;
        relatedJsaId: string | null;
        taskDescription: string;
        assessmentDatetime: Date;
    }>;
    /**
     * PRD §4.3 poin 2 — "approval RINGAN, disarankan 1 stage 'Verifikasi
     * Supervisor'... bisa dikonfigurasi TANPA approval formal (VERIFIED
     * oleh pembuat sendiri) utk pekerjaan risiko rendah rutin." useWorkflow
     * (parameter EKSPLISIT dari caller, BUKAN auto-detect risiko — keputusan
     * "pakai workflow atau self-verify" diserahkan ke KEBIJAKAN TENANT/
     * pemanggil, skema tidak py kolom utk auto-decide) menentukan jalur:
     * self-verify -> transisi LANGSUNG DRAFT->VERIFIED; via workflow ->
     * status TETAP DRAFT (pola sama JSA) sampai HiradcWorkflowCompletionListener
     * memproses APPROVED workflow -> VERIFIED (BUKAN APPROVED — stage
     * bernama "Verifikasi", `approve()` terpisah utk lapis opsional
     * berikutnya VERIFIED->APPROVED). BR-03 ditegakkan DI SINI utk KEDUA
     * jalur (bukan di listener) — record yang tidak lengkap tidak boleh
     * masuk status VERIFIED sama sekali, baik lewat self-verify maupun
     * workflow.
     */
    verify(hiradcId: string, useWorkflow: boolean): Promise<HiradcRecord>;
    /** Lapis opsional lanjutan VERIFIED->APPROVED (PRD §4.3 poin 2 tersirat,
     * "APPROVED" TETAP nilai enum sah, tidak seluruh HIRADC perlu
     * melewatinya) — transisi LANGSUNG, TANPA workflow tambahan. */
    approve(hiradcId: string): Promise<HiradcRecord>;
}
