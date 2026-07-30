import { BadRequestException, Injectable } from "@nestjs/common";
import { DocumentVersion } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { DmsBootstrapService } from "./dms-bootstrap.service";
import { requireActorUserId, requireTenantId } from "./dms-context";
import { computeNextVersionNumber, VersionBump } from "./document-version-lifecycle";

const DMS_ATTACHMENT_ENTITY_TYPE = "DOCUMENT_VERSION";
const DMS_WORKFLOW_ENTITY_TYPE = "document_version";

export interface CreateDocumentVersionInput {
  documentId: string;
  /** Attachment (0.12) yang SUDAH presign->upload->confirm dgn
   * entityType="DOCUMENT_VERSION" & entityId=id versi ini (client-proposed,
   * lihat banner comment method createVersion() di bawah). */
  attachmentId: string;
  changeSummary?: string;
  versionBump?: VersionBump;
}

// Task 2.1 (Modul 03 §4.1/§5) — file fisik LANGSUNG di document_versions
// (PRD §5 eksplisit, BUKAN via attachments generik) tapi internal REUSE
// pipeline presign/confirm/scan 0.12 apa adanya via teknik
// client-proposed-entityId, pola PERSIS 1.6 (data_import_jobs, gap #56).
@Injectable()
export class DocumentVersionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly bootstrapService: DmsBootstrapService,
  ) {}

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
  async createVersion(input: CreateDocumentVersionInput): Promise<DocumentVersion> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls(async (tx) => {
      const document = await tx.document.findUniqueOrThrow({ where: { id: input.documentId } });
      if (document.status === "RETIRED" || document.status === "OBSOLETE") {
        throw new BadRequestException(`Dokumen berstatus ${document.status} tidak dapat menerima versi baru.`);
      }

      const attachment = await tx.attachment.findUniqueOrThrow({ where: { id: input.attachmentId } });
      if (attachment.entityType !== DMS_ATTACHMENT_ENTITY_TYPE) {
        throw new BadRequestException(
          `Attachment ${input.attachmentId} py entityType="${attachment.entityType}", diharapkan "${DMS_ATTACHMENT_ENTITY_TYPE}".`,
        );
      }
      const documentVersionId = attachment.entityId;

      const latest = await tx.documentVersion.findFirst({
        where: { documentId: input.documentId },
        orderBy: [{ majorVersion: "desc" }, { minorVersion: "desc" }],
      });
      const nextVersion = computeNextVersionNumber(
        latest ? { majorVersion: latest.majorVersion, minorVersion: latest.minorVersion } : null,
        input.versionBump ?? "MAJOR",
      );

      return tx.documentVersion.create({
        data: {
          id: documentVersionId,
          tenantId,
          documentId: input.documentId,
          majorVersion: nextVersion.majorVersion,
          minorVersion: nextVersion.minorVersion,
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          changeSummary: input.changeSummary,
          status: "DRAFT",
          createdBy,
          updatedBy: createdBy,
        },
      });
    });
  }

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
  async submitForApproval(documentVersionId: string): Promise<DocumentVersion> {
    const { documentId, ownerUserId, hasCurrentVersion } = await this.prisma.withRls(async (tx) => {
      const version = await tx.documentVersion.findUniqueOrThrow({ where: { id: documentVersionId } });
      if (version.status !== "DRAFT") {
        throw new BadRequestException(`document_versions berstatus ${version.status} tidak dapat diajukan (wajib DRAFT).`);
      }

      const attachment = await tx.attachment.findFirst({
        where: { entityType: DMS_ATTACHMENT_ENTITY_TYPE, entityId: documentVersionId },
      });
      if (!attachment || attachment.scanStatus !== "CLEAN") {
        throw new BadRequestException(
          `File versi ${documentVersionId} belum lolos pemindaian malware (status=${attachment?.scanStatus ?? "TIDAK DITEMUKAN"}) — tunggu scan selesai sebelum submit.`,
        );
      }

      const document = await tx.document.findUniqueOrThrow({ where: { id: version.documentId } });
      return { documentId: document.id, ownerUserId: document.ownerUserId, hasCurrentVersion: document.currentVersionId !== null };
    });

    const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureWorkflowDefinition(tx));
    const instance = await this.workflowEngineService.startInstance(DMS_WORKFLOW_ENTITY_TYPE, documentVersionId, definition.id, {
      contextUserId: ownerUserId,
    });

    return this.prisma.withRls(async (tx) => {
      await tx.document.update({
        where: { id: documentId },
        // documents.status "mengikuti status current_version_id" (PRD §5) —
        // UNTUK revisi dokumen yang SUDAH PUBLISHED, dokumen lama tetap
        // berlaku (PUBLISHED) selama versi baru diproses -> UNDER_REVISION
        // (PRD enum literal). Untuk versi PERTAMA (belum py currentVersionId
        // sama sekali) -> IN_REVIEW.
        data: { status: hasCurrentVersion ? "UNDER_REVISION" : "IN_REVIEW" },
      });

      return tx.documentVersion.update({
        where: { id: documentVersionId },
        data: { status: "PENDING_APPROVAL", workflowInstanceId: instance.id },
      });
    });
  }
}
