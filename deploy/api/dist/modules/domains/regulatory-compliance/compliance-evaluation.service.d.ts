import { ComplianceEvaluation, ComplianceStatus, EvaluationMethod } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { RegulatoryComplianceBootstrapService } from "./regulatory-compliance-bootstrap.service";
export interface CreateComplianceEvaluationInput {
    regulatoryRegisterId?: string;
    obligationId?: string;
    siteId?: string;
    evaluationPeriodStart: Date;
    evaluationPeriodEnd: Date;
    evaluatorUserId: string;
    evaluationDate: Date;
    evaluationMethod: EvaluationMethod;
    complianceStatus: ComplianceStatus;
    findingsSummary?: string;
    linkedCapaId?: string;
}
export interface UpdateComplianceEvaluationInput {
    findingsSummary?: string;
    complianceStatus?: ComplianceStatus;
    linkedCapaId?: string;
}
export declare class ComplianceEvaluationService {
    private readonly prisma;
    private readonly numberingService;
    private readonly notificationService;
    private readonly workflowEngineService;
    private readonly bootstrapService;
    constructor(prisma: PrismaService, numberingService: NumberingService, notificationService: NotificationService, workflowEngineService: WorkflowEngineService, bootstrapService: RegulatoryComplianceBootstrapService);
    /**
     * BR-01 (PRD §5) analog utk evaluation_number, via NumberingService
     * (0.10, module_code=COMPLIANCE) — TIGA langkah TERPISAH (bukan satu
     * withRls() membungkus semua), alasan PERSIS DocumentService.createDocument()
     * (2.1): ensureNumberingConfig() maupun generateNext() membuka
     * withRls()-nya masing-masing, nesting terverifikasi tidak hang tapi
     * tidak atomik.
     */
    create(input: CreateComplianceEvaluationInput): Promise<ComplianceEvaluation>;
    update(evaluationId: string, input: UpdateComplianceEvaluationInput): Promise<ComplianceEvaluation>;
    getById(evaluationId: string): Promise<ComplianceEvaluation>;
    /**
     * PRD §4.2 poin 2 — submit memicu workflow_instances
     * (module_code=COMPLIANCE, entity_type=compliance_evaluation), 1 stage
     * ROLE_IN_SCOPE HSE Manager (TIDAK butuh CONTEXT_USER spt DMS — evaluasi
     * tidak py "pemilik" spesifik-entitas). TIGA transaksi TERPISAH, alasan
     * PERSIS DocumentVersionService.submitForApproval() (2.1) — lihat banner
     * comment method itu.
     *
     * PRD §8 baris 4 "Evaluasi non-compliant disubmit -> HSE Manager" —
     * notifikasi dikirim DI SINI (bukan scan job terjadwal), sinkron dgn
     * submit itu sendiri, SETELAH transaksi commit (pola sama
     * DocumentService.retire() — enqueue() tidak boleh dipanggil dari dalam
     * withRls() lain). Recipient HSE Manager diresolusi via role sistem
     * (BUKAN ApproverResolutionService/workflow-scope — notifikasi ini
     * ditujukan ke SEMUA HSE Manager tenant, bukan APPROVER SATU stage
     * tertentu; scope containment penuh di luar timebox, gap TDD §26).
     */
    submitForApproval(evaluationId: string): Promise<ComplianceEvaluation>;
    /**
     * PRD §4.2 poin 3/BR-03 — penutupan evaluasi SELALU tindakan eksplisit
     * (Evaluator/HSE Manager), TIDAK PERNAH otomatis begitu REVIEWED tercapai
     * — PRD tidak menyebutkan auto-close di manapun, termasuk utk
     * COMPLIANT/NOT_APPLICABLE yang sebenarnya tidak kena gate BR-03 (gap
     * TDD §26: kenapa tidak auto-close utk kasus yang tidak butuh CAPA cukup
     * masuk akal tapi di luar teks literal PRD, jadi TIDAK diasumsikan).
     * BR-06 recompute next_due_date DI SINI (bukan job terpisah) — dua field
     * denormalisasi (compliance_obligations.next_due_date DAN
     * compliance_evaluations.next_evaluation_due_date sendiri) diisi NILAI
     * SAMA dari computeNextObligationDueDate() yang SAMA, PRD §4.2 poin 4
     * ("next_evaluation_due_date dihitung otomatis dari frequency obligation
     * terkait") dibaca sbg terjadi PADA SAAT SAMA dgn BR-06 (sumber &
     * frequency yang dirujuk identik). dueReminderSentAt/overdueNotifiedAt
     * di-reset NULL di sini — next_due_date pindah ke masa depan
     * "menyelesaikan" reminder/overdue siklus sebelumnya.
     */
    close(evaluationId: string): Promise<ComplianceEvaluation>;
}
