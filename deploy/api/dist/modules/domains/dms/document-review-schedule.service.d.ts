import { DocumentReviewSchedule, ReviewOutcome } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { DocumentService } from "./document.service";
export interface RecordReviewOutcomeInput {
    reviewScheduleId: string;
    reviewOutcome: ReviewOutcome;
    /** WAJIB kalau reviewOutcome MINOR_REVISION/MAJOR_REVISION_TRIGGERED (PRD
     * §4.3 poin 3) — versi baru dibuat TERPISAH lewat DocumentVersionService
     * SEBELUM memanggil method ini, id-nya dioper ke sini murni utk
     * menghubungkan (resulting_document_version_id), method ini TIDAK
     * membuat versi apa pun sendiri. */
    resultingDocumentVersionId?: string;
    /** WAJIB kalau reviewOutcome RETIRE_DOCUMENT (PRD §4.4). */
    retireReason?: string;
}
export declare class DocumentReviewScheduleService {
    private readonly prisma;
    private readonly documentService;
    constructor(prisma: PrismaService, documentService: DocumentService);
    listForDocument(documentId: string): Promise<DocumentReviewSchedule[]>;
    /**
     * PRD §4.3 poin 3-4: NO_CHANGE_NEEDED -> selesai, jadwalkan siklus
     * BERIKUTNYA otomatis (review_cycle_months lagi) — tanpa ini "tinjauan
     * berkala BERULANG" (ERD summary §5) berhenti setelah satu kali.
     * MINOR/MAJOR_REVISION_TRIGGERED -> selesai, TIDAK dijadwalkan ulang di
     * sini — siklus berikutnya datang otomatis dari publish versi hasil
     * revisi (DocumentWorkflowCompletionListener), menjadwalkan di SINI JUGA
     * akan menghasilkan 2 baris SCHEDULED duplikat. RETIRE_DOCUMENT -> alur
     * §4.4 (DocumentService.retire()).
     */
    recordOutcome(input: RecordReviewOutcomeInput): Promise<DocumentReviewSchedule>;
}
