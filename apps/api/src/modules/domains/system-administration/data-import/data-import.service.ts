import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DataImportError, DataImportJob, Prisma } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
// Reuse leaf helper SIBLING folder ../provisioning/ — bukan duplikasi baru.
// Nama file ("system-administration-context", bukan "provisioning-context")
// sudah eksplisit berlaku utk SELURUH domain system-administration, bukan
// spesifik provisioning; data-import/branding TIDAK circular terhadapnya
// (leaf murni, tidak balik import apa pun), jadi aman direuse lintas
// subfolder sibling dalam SATU domain module yang sama — beda dari kasus
// organization<->industry-template (gap TDD §26 poin 29) yang circular
// krn saling impor DUA ARAH.
import { requireActorUserId, requireTenantId } from "../provisioning/system-administration-context";
import { DataImportQueueService } from "./data-import-queue.service";
import { DATA_IMPORT_ENTITY_TYPE } from "./data-import.constants";
import { assertDataImportJobIsRetryable, validateDataImportJobStatusTransition } from "./data-import-lifecycle";
import { DataImportRowMapperRegistry } from "./row-mappers/data-import-row-mapper-registry.service";

export interface CreateDataImportJobInput {
  targetModuleCode: string;
  attachmentId: string;
}

export interface CreateDataImportRetryJobInput {
  sourceDataImportJobId: string;
  attachmentId: string;
}

@Injectable()
export class DataImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapperRegistry: DataImportRowMapperRegistry,
    private readonly queueService: DataImportQueueService,
  ) {}

  /**
   * PRD §4.3 langkah 1-2. Prasyarat: caller SUDAH presign()+upload+confirm()
   * attachment (0.12) dgn entityType=DATA_IMPORT_JOB & entityId=<UUID yang
   * SAMA akan dipakai sbg id job ini> — lihat banner comment
   * schema.prisma "Task 1.6". TIDAK memeriksa scanStatus di sini (SENGAJA
   * async — lihat DataImportProcessingService.processValidate(), yang
   * retry via BullMQ backoff selama masih PENDING_SCAN).
   */
  async createJob(input: CreateDataImportJobInput): Promise<DataImportJob> {
    const tenantId = requireTenantId();
    const initiatedBy = requireActorUserId();

    this.assertModuleSupported(input.targetModuleCode);

    const job = await this.prisma.withRls(async (tx) => {
      const attachment = await this.resolveUnusedAttachment(tx, input.attachmentId);

      return tx.dataImportJob.create({
        data: {
          id: attachment.entityId,
          tenantId,
          targetModuleCode: input.targetModuleCode,
          fileUrl: attachment.fileUrl,
          status: "UPLOADED",
          initiatedBy,
        },
      });
    });

    await this.queueService.enqueueValidate({ tenantId, dataImportJobId: job.id });
    return job;
  }

  /**
   * BR-03 (PRD Modul 31 §6) / Acceptance TASK_INSTRUCTION.md 1.6 —
   * "re-upload parsial baris gagal tertaut ke data_import_job_id asal".
   * targetModuleCode DIWARISKAN dari job sumber (bukan input caller) —
   * re-upload selalu utk modul target yang SAMA dgn job aslinya.
   */
  async createRetryJob(input: CreateDataImportRetryJobInput): Promise<DataImportJob> {
    const tenantId = requireTenantId();
    const initiatedBy = requireActorUserId();

    const sourceJob = await this.prisma.withRls((tx) =>
      tx.dataImportJob.findUniqueOrThrow({ where: { id: input.sourceDataImportJobId } }),
    );
    assertDataImportJobIsRetryable(sourceJob.status);

    const job = await this.prisma.withRls(async (tx) => {
      const attachment = await this.resolveUnusedAttachment(tx, input.attachmentId);

      return tx.dataImportJob.create({
        data: {
          id: attachment.entityId,
          tenantId,
          targetModuleCode: sourceJob.targetModuleCode,
          fileUrl: attachment.fileUrl,
          status: "UPLOADED",
          initiatedBy,
          sourceDataImportJobId: sourceJob.id,
        },
      });
    });

    await this.queueService.enqueueValidate({ tenantId, dataImportJobId: job.id });
    return job;
  }

  /**
   * PRD §4.3 langkah 3 — "Konfirmasi -> job async memproses import batch".
   * HANYA validasi (throw kalau job belum VALIDATED, fail fast) + enqueue —
   * TIDAK menuliskan transisi VALIDATED->IMPORTING sendiri (job masih
   * berstatus VALIDATED sesaat setelah method ini return). Transisi
   * SUNGGUHAN terjadi atomik di dalam DataImportProcessingService.processCommit()
   * (lihat banner comment di sana) — kalau confirmImport() SENDIRI yang
   * menuliskannya, dua panggilan confirmImport() bersamaan (mis. double-click
   * UI) SAMA-SAMA lolos cek status VALIDATED lalu SAMA-SAMA enqueue commit
   * job terpisah, memindahkan race-nya ke titik yang lebih awal alih-alih
   * menghilangkannya.
   */
  async confirmImport(dataImportJobId: string): Promise<DataImportJob> {
    const tenantId = requireTenantId();

    const job = await this.prisma.withRls(async (tx) => {
      const current = await tx.dataImportJob.findUniqueOrThrow({ where: { id: dataImportJobId } });
      validateDataImportJobStatusTransition(current.status, "IMPORTING");
      return current;
    });

    await this.queueService.enqueueCommit({ tenantId, dataImportJobId: job.id });
    return job;
  }

  async getJob(dataImportJobId: string): Promise<DataImportJob> {
    return this.prisma.withRls((tx) => tx.dataImportJob.findUniqueOrThrow({ where: { id: dataImportJobId } }));
  }

  /** "preview error per baris" (PRD §12 Import Wizard step 3). */
  async listErrorsForJob(dataImportJobId: string): Promise<DataImportError[]> {
    return this.prisma.withRls((tx) =>
      tx.dataImportError.findMany({ where: { dataImportJobId }, orderBy: { rowNumber: "asc" } }),
    );
  }

  private assertModuleSupported(targetModuleCode: string): void {
    if (!this.mapperRegistry.isSupported(targetModuleCode)) {
      throw new BadRequestException(
        `Modul "${targetModuleCode}" belum didukung untuk import data. Modul yang didukung: ${this.mapperRegistry
          .supportedTargetModuleCodes()
          .join(", ")}.`,
      );
    }
  }

  private async resolveUnusedAttachment(tx: Prisma.TransactionClient, attachmentId: string) {
    const attachment = await tx.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) {
      throw new NotFoundException("attachmentId tidak ditemukan untuk tenant ini.");
    }
    if (attachment.entityType !== DATA_IMPORT_ENTITY_TYPE) {
      throw new BadRequestException("attachment ini tidak dipresign untuk konteks import data.");
    }
    const existingJob = await tx.dataImportJob.findUnique({ where: { id: attachment.entityId } });
    if (existingJob) {
      throw new ConflictException("attachment ini sudah dipakai untuk job import lain.");
    }
    return attachment;
  }
}
