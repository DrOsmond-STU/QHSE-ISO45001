import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
export declare class RiskWorkflowBootstrapService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private ensureNumberingConfig;
    ensureHiraNumberingConfig(): Promise<NumberingConfig>;
    ensureJsaNumberingConfig(): Promise<NumberingConfig>;
    ensureHiradcNumberingConfig(): Promise<NumberingConfig>;
    ensureRiskCorpNumberingConfig(): Promise<NumberingConfig>;
    private findRoleOrThrow;
    /**
     * PRD §4.1 poin 2/3 — "template default disarankan 'HIRA — Review
     * Supervisor + Approval HSE Manager' (2 stage, SLA 3 hari/stage)."
     * Percabangan kondisional (poin 3): "jika ada hira_hazard_lines.risk_level_before
     * = EXTREME, sistem menambahkan stage 'Approval Top Management/Company
     * HSE Head'." KONSUMEN PERTAMA JSON Logic condition pada workflow_transitions
     * di seluruh codebase ini (0.9-3.1 SELALU condition=null/unconditional) —
     * DUA baris workflow_transitions dari stage2 dgn triggerAction SAMA
     * (APPROVE) tapi condition+priority BEDA: priority 0 (dicek LEBIH DULU)
     * mengecek contextData.hasExtremeHazard===true -> lanjut stage3; priority
     * 1 (fallback, condition=null=selalu match) -> langsung terminal APPROVED
     * kalau priority 0 TIDAK match. contextData.hasExtremeHazard DIISI
     * HiraAssessmentService.submitForApproval() SEBELUM startInstance()
     * (dihitung dari anyHazardLineRequiresEscalation(), hira-lifecycle.ts) —
     * workflow engine (0.9) TIDAK fetch data domain sendiri (jaga batas
     * modular monolith, lihat banner comment WorkflowInstance.contextData).
     * "Company HSE Head" TIDAK py role code literal tersendiri (TIDAK ADA
     * role TOP_MANAGEMENT, gap TDD §26, konsisten dgn keputusan 2.2/3.1
     * Modul 04/05 lain) — `COMPANY_ADMIN` dipakai sbg role PALING PLAUSIBLE
     * (otoritas company-wide existing terdekat).
     */
    ensureHiraWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
    /**
     * PRD §4.2 poin 2 — "template default: 1-2 stage (Supervisor -> HSE
     * Officer/Manager, SLA 1-2 hari)." Dipilih 2-stage (bukan 1) — JSA
     * dibuat oleh HSE Officer/Supervisor sendiri (PRD §3), approval dari
     * role LAIN/lebih senior lebih masuk akal drpd self-review; HSE_MANAGER
     * (bukan HSE_OFFICER) dipakai sbg approver akhir krn HSE_OFFICER sendiri
     * PLAUSIBLE jadi pembuat JSA (approve-sendiri tidak masuk akal).
     */
    ensureJsaWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
    /**
     * PRD §4.3 poin 2 — "Approval RINGAN — disarankan 1 stage 'Verifikasi
     * Supervisor' (SLA singkat, hitungan jam)... bisa dikonfigurasi TANPA
     * approval formal (VERIFIED oleh pembuat sendiri) utk pekerjaan risiko
     * rendah rutin." Method ini HANYA mendefinisikan workflow-nya — KEPUTUSAN
     * pakai jalur workflow vs self-verify ada di HiradcRecordService.verify()
     * (task 3.2), caller yang menentukan, bukan bootstrap ini.
     */
    ensureHiradcWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
}
