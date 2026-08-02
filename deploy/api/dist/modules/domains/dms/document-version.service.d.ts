import { DocumentVersion } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { DmsBootstrapService } from "./dms-bootstrap.service";
import { VersionBump } from "./document-version-lifecycle";
export interface CreateDocumentVersionInput {
    documentId: string;
    /** Attachment (0.12) yang SUDAH presign->upload->confirm dgn
     * entityType="DOCUMENT_VERSION" & entityId=id versi ini (client-proposed,
     * lihat banner comment method createVersion() di bawah). */
    attachmentId: string;
    changeSummary?: string;
    versionBump?: VersionBump;
}
export declare class DocumentVersionService {
    private readonly prisma;
    private readonly workflowEngineService;
    private readonly bootstrapService;
    constructor(prisma: PrismaService, workflowEngineService: WorkflowEngineService, bootstrapService: DmsBootstrapService);
    /**
     * Caller (nanti: controller HTTP, kalau/ketika ada) bertanggung jawab
     * men-generate documentVersionId (randomUUID()) SEBELUM memanggil
     * AttachmentService.presign()/confirm() dgn entityId=id itu — method ini
     * MEMBACA id yang sudah disepakati dari attachment.entityId (BUKAN
     * generate id baru sendiri), pola PERSIS DataImportService.createJob()
     * (1.6). Malware-scan (0.12) TIDAK diblok di sini (versi DRAFT boleh py
     * scan pending) — dicek submitForApproval() sebagai gantinya (UX lebih
     * masuk akal: upload tersimpan segera, submit menunggu hasil scan).
     */
    createVersion(input: CreateDocumentVersionInput): Promise<DocumentVersion>;
    /**
     * PRD §4.1 poin 2-3 — submit memicu workflow_instances (entity_type=
     * "document_version"). Stage 1 "Document Owner" (CONTEXT_USER, task 2.1
     * platform extension) diresolusi dari documents.owner_user_id LEWAT
     * contextData.contextUserId, BUKAN dari user yang submit (Document
     * Controller dan Document Owner biasanya orang BEDA — PRD §3 aktor
     * terpisah). workflow_definitions default tenant di-lazy-create kalau
     * belum ada (DmsBootstrapService).
     *
     * TIGA transaksi TERPISAH, SENGAJA BUKAN satu withRls() membungkus
     * semuanya — WorkflowEngineService.startInstance() (0.9) membuka
     * withRls()-nya SENDIRI, dan diverifikasi EMPIRIS (probe manual, dihapus
     * setelah dipakai) bahwa Prisma interactive $transaction yang "dinested"
     * pada client yang sama TIDAK hang (connection pool memberi koneksi
     * berbeda ke transaksi dalam) TAPI juga TIDAK benar-benar atomik (dua
     * transaksi independen, bukan SAVEPOINT) — nesting jadi kode yang
     * menyesatkan (terlihat atomik, padahal tidak) tanpa manfaat nyata.
     * Dipisah eksplisit di sini supaya batas transaksi jujur sesuai
     * kenyataannya. Konsekuensi diterima (pola sama gap 1.5 provisioning
     * "tidak atomik lintas seluruh langkah", 1.6 "job macet tertahan
     * permanen"): kegagalan tepat SETELAH startInstance() commit tapi
     * SEBELUM update status final bisa menyisakan workflow_instance yatim
     * (document_versions.status tetap DRAFT, workflowInstanceId tetap NULL)
     * — gap TDD §26, butuh reconciliation job kalau genuinely terjadi di
     * produksi.
     */
    submitForApproval(documentVersionId: string): Promise<DocumentVersion>;
}
