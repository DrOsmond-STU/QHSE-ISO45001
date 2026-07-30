import { BadRequestException, ConflictException, INestApplication } from "@nestjs/common";
import { DataImportJob, DataImportJobStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import * as ExcelJS from "exceljs";
import { AttachmentScanService } from "../../src/platform/attachment/attachment-scan.service";
import { AttachmentService } from "../../src/platform/attachment/attachment.service";
import { ObjectStorageService } from "../../src/platform/attachment/object-storage.service";
import { DataImportLifecycleError } from "../../src/modules/domains/system-administration/data-import/data-import-lifecycle";
import { DataImportProcessingService } from "../../src/modules/domains/system-administration/data-import/data-import-processing.service";
import { DataImportService } from "../../src/modules/domains/system-administration/data-import/data-import.service";
import { DATA_IMPORT_ALLOWED_MIME_TYPES, DATA_IMPORT_ENTITY_TYPE } from "../../src/modules/domains/system-administration/data-import/data-import.constants";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, createTestApp, flushTestRedis, seedTenantFixture } from "../auth/test-helpers";

const EXCEL_MIME = DATA_IMPORT_ALLOWED_MIME_TYPES[1]; // .xlsx

async function buildEmployeeWorkbookBuffer(rows: Array<Record<string, string>>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Employees");
  sheet.addRow(["full_name", "email", "employee_id", "job_title"]);
  for (const row of rows) {
    sheet.addRow([row.full_name ?? "", row.email ?? "", row.employee_id ?? "", row.job_title ?? ""]);
  }
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe("DataImportService/DataImportProcessingService — TDD §20 & BR-03 (Modul 31)", () => {
  let app: INestApplication;
  let dataImportService: DataImportService;
  let processingService: DataImportProcessingService;
  let attachmentService: AttachmentService;
  let storage: ObjectStorageService;
  let scanService: AttachmentScanService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    dataImportService = app.get(DataImportService);
    processingService = app.get(DataImportProcessingService);
    attachmentService = app.get(AttachmentService);
    storage = app.get(ObjectStorageService);
    scanService = app.get(AttachmentScanService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  /**
   * Dev environment ini TERBUKTI EMPIRIS kadang punya proses apps/worker
   * sungguhan berjalan (independen dari test ini) yang JUGA mengonsumsi
   * queue "data-import" — createJob()/confirmImport() DI BAWAH selalu
   * enqueue job SUNGGUHAN (perilaku produksi yang benar, bukan dihindari
   * di test). Memanggil processValidate()/processCommit() manual di bawah
   * TETAP dilakukan (supaya test progress bahkan TANPA worker hidup), TAPI
   * hasilnya dibaca lewat POLLING (bukan asumsi "setelah await selesai
   * SAYA pasti pemenang klaim atomik-nya", lihat
   * DataImportProcessingService.tryClaim()) — benar terlepas dari SIAPA
   * yang menang klaim (test ini sendiri, atau worker asli yang kebetulan
   * hidup).
   */
  async function waitForJobStatus(
    jobId: string,
    tenantId: string,
    userId: string,
    expected: readonly DataImportJobStatus[],
    timeoutMs = 15000,
  ): Promise<DataImportJob> {
    const deadline = Date.now() + timeoutMs;
    let last: DataImportJob | undefined;
    while (Date.now() < deadline) {
      last = await tenantContextStorage.run({ tenantId, userId }, () => dataImportService.getJob(jobId));
      if ((expected as DataImportJobStatus[]).includes(last.status)) {
        return last;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    throw new Error(
      `Timeout menunggu data_import_job ${jobId} mencapai status [${expected.join(", ")}] — status terakhir: ${last?.status}.`,
    );
  }

  /**
   * Simulasi alur presign->upload->confirm attachment (0.12) APA ADANYA,
   * lalu simulasi hasil scan malware LANGSUNG (tanpa boot proses worker
   * terpisah) — pola sama provisioning.integration-spec.ts (1.5)/precedent
   * "processScanJob() diekspor AttachmentModule khusus utk test".
   */
  async function uploadAndConfirmExcel(
    tenantId: string,
    actorUserId: string,
    entityId: string,
    buffer: Buffer,
    scanResult: "CLEAN" | "INFECTED" = "CLEAN",
  ): Promise<string> {
    return tenantContextStorage.run({ tenantId, userId: actorUserId }, async () => {
      const fileName = "employees.xlsx";
      const presigned = await attachmentService.presign({
        fileName,
        mimeType: EXCEL_MIME,
        fileSize: buffer.length,
        entityType: DATA_IMPORT_ENTITY_TYPE,
        entityId,
        allowedMimeTypes: DATA_IMPORT_ALLOWED_MIME_TYPES,
      });
      await storage.putObject(presigned.storageKey, buffer, EXCEL_MIME);
      const confirmed = await attachmentService.confirm(
        {
          attachmentId: presigned.attachmentId,
          storageKey: presigned.storageKey,
          fileName,
          entityType: DATA_IMPORT_ENTITY_TYPE,
          entityId,
        },
        actorUserId,
      );
      await scanService.processScanJob({
        tenantId,
        attachmentId: confirmed.attachmentId,
        storageKey: presigned.storageKey,
        mimeType: EXCEL_MIME,
      });
      if (scanResult === "INFECTED") {
        await adminPrisma.attachment.update({ where: { id: confirmed.attachmentId }, data: { scanStatus: "INFECTED" } });
      }
      return confirmed.attachmentId;
    });
  }

  it("alur penuh: VALIDATED (baris valid+invalid campur) -> IMPORTING -> COMPLETED_WITH_ERRORS, baris valid jadi User sungguhan", async () => {
    const fixture = await seedTenantFixture();
    const jobId = randomUUID();
    const buffer = await buildEmployeeWorkbookBuffer([
      { full_name: "Budi Santoso", email: `budi-${jobId}@qhse.local`, employee_id: "EMP-1", job_title: "HSE Officer" },
      { full_name: "", email: "" }, // baris 3 (Excel) — invalid, full_name & email kosong
      { full_name: "Ani Wijaya", email: `ani-${jobId}@qhse.local` },
    ]);
    const attachmentId = await uploadAndConfirmExcel(fixture.tenantId, fixture.userId, jobId, buffer);

    const job = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
      dataImportService.createJob({ targetModuleCode: "EMPLOYEE", attachmentId }),
    );
    expect(job.id).toBe(jobId);
    expect(job.status).toBe("UPLOADED");

    await processingService.processValidate({ tenantId: fixture.tenantId, dataImportJobId: jobId }).catch(() => undefined);
    const validated = await waitForJobStatus(jobId, fixture.tenantId, fixture.userId, ["VALIDATED"]);
    expect(validated.totalRows).toBe(3);
    expect(validated.errorRows).toBe(1);
    expect(validated.successRows).toBe(2);

    const errorsAfterValidate = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
      dataImportService.listErrorsForJob(jobId),
    );
    expect(errorsAfterValidate).toHaveLength(1);
    expect(errorsAfterValidate[0].rowNumber).toBe(3); // row 1=header, row 2=Budi (valid), row 3=baris kosong

    await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
      dataImportService.confirmImport(jobId),
    );
    await processingService.processCommit({ tenantId: fixture.tenantId, dataImportJobId: jobId }).catch(() => undefined);

    const final = await waitForJobStatus(jobId, fixture.tenantId, fixture.userId, ["COMPLETED_WITH_ERRORS"]);
    expect(final.successRows).toBe(2);
    expect(final.errorRows).toBe(1);
    expect(final.completedAt).not.toBeNull();

    const createdUsers = await adminPrisma.user.findMany({
      where: { tenantId: fixture.tenantId, email: { in: [`budi-${jobId}@qhse.local`, `ani-${jobId}@qhse.local`] } },
    });
    expect(createdUsers).toHaveLength(2);
    expect(createdUsers.find((u) => u.email === `budi-${jobId}@qhse.local`)?.employeeId).toBe("EMP-1");
  });

  it("BR-03: createRetryJob() tertaut sourceDataImportJobId, hanya berisi baris yang tadinya gagal", async () => {
    const fixture = await seedTenantFixture();
    const firstJobId = randomUUID();
    const email = `retry-${firstJobId}@qhse.local`;
    const firstBuffer = await buildEmployeeWorkbookBuffer([{ full_name: "", email: "" }]);
    const firstAttachmentId = await uploadAndConfirmExcel(fixture.tenantId, fixture.userId, firstJobId, firstBuffer);

    await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
      dataImportService.createJob({ targetModuleCode: "EMPLOYEE", attachmentId: firstAttachmentId }),
    );
    await processingService.processValidate({ tenantId: fixture.tenantId, dataImportJobId: firstJobId }).catch(() => undefined);
    await waitForJobStatus(firstJobId, fixture.tenantId, fixture.userId, ["VALIDATED"]);
    await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
      dataImportService.confirmImport(firstJobId),
    );
    await processingService.processCommit({ tenantId: fixture.tenantId, dataImportJobId: firstJobId }).catch(() => undefined);

    // Baris hanya invalid, tidak ada baris valid sama sekali -> job selesai COMPLETED_WITH_ERRORS
    // (totalRows=1, successRows=0) — TETAP terminal berbeda dari FAILED (bukan kegagalan level-file).
    await waitForJobStatus(firstJobId, fixture.tenantId, fixture.userId, ["COMPLETED_WITH_ERRORS"]);

    const retryJobId = randomUUID();
    const retryBuffer = await buildEmployeeWorkbookBuffer([{ full_name: "Retry Fixed", email }]);
    const retryAttachmentId = await uploadAndConfirmExcel(fixture.tenantId, fixture.userId, retryJobId, retryBuffer);

    const retryJob = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
      dataImportService.createRetryJob({ sourceDataImportJobId: firstJobId, attachmentId: retryAttachmentId }),
    );
    expect(retryJob.id).toBe(retryJobId);
    expect(retryJob.sourceDataImportJobId).toBe(firstJobId);
    expect(retryJob.targetModuleCode).toBe("EMPLOYEE"); // diwariskan dari job sumber

    await processingService.processValidate({ tenantId: fixture.tenantId, dataImportJobId: retryJobId }).catch(() => undefined);
    await waitForJobStatus(retryJobId, fixture.tenantId, fixture.userId, ["VALIDATED"]);
    await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
      dataImportService.confirmImport(retryJobId),
    );
    await processingService.processCommit({ tenantId: fixture.tenantId, dataImportJobId: retryJobId }).catch(() => undefined);

    const retryFinal = await waitForJobStatus(retryJobId, fixture.tenantId, fixture.userId, ["COMPLETED"]);
    expect(retryFinal.successRows).toBe(1);
    const retriedUser = await adminPrisma.user.findFirst({ where: { tenantId: fixture.tenantId, email } });
    expect(retriedUser).not.toBeNull();
  });

  it("BR-03: createRetryJob() menolak job sumber yang belum terminal-dgn-error (bukan COMPLETED_WITH_ERRORS/FAILED)", async () => {
    const fixture = await seedTenantFixture();
    const jobId = randomUUID();
    const buffer = await buildEmployeeWorkbookBuffer([{ full_name: "Sukses Total", email: `sukses-${jobId}@qhse.local` }]);
    const attachmentId = await uploadAndConfirmExcel(fixture.tenantId, fixture.userId, jobId, buffer);

    await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
      dataImportService.createJob({ targetModuleCode: "EMPLOYEE", attachmentId }),
    );
    await processingService.processValidate({ tenantId: fixture.tenantId, dataImportJobId: jobId }).catch(() => undefined);
    await waitForJobStatus(jobId, fixture.tenantId, fixture.userId, ["VALIDATED"]);
    await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
      dataImportService.confirmImport(jobId),
    );
    await processingService.processCommit({ tenantId: fixture.tenantId, dataImportJobId: jobId }).catch(() => undefined);

    await waitForJobStatus(jobId, fixture.tenantId, fixture.userId, ["COMPLETED"]); // sukses total, bukan kandidat retry

    const retryAttachmentId = await uploadAndConfirmExcel(
      fixture.tenantId,
      fixture.userId,
      randomUUID(),
      await buildEmployeeWorkbookBuffer([{ full_name: "X", email: "x@qhse.local" }]),
    );
    await expect(
      tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        dataImportService.createRetryJob({ sourceDataImportJobId: jobId, attachmentId: retryAttachmentId }),
      ),
    ).rejects.toThrow(DataImportLifecycleError);
  });

  it("createJob() menolak targetModuleCode yang belum didukung (belum ada mapper, mis. ORGANIZATION)", async () => {
    const fixture = await seedTenantFixture();
    const jobId = randomUUID();
    const attachmentId = await uploadAndConfirmExcel(
      fixture.tenantId,
      fixture.userId,
      jobId,
      await buildEmployeeWorkbookBuffer([{ full_name: "X", email: "x@qhse.local" }]),
    );

    await expect(
      tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        dataImportService.createJob({ targetModuleCode: "ORGANIZATION", attachmentId }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("createJob() menolak attachment yang sudah dipakai job import lain", async () => {
    const fixture = await seedTenantFixture();
    const jobId = randomUUID();
    const attachmentId = await uploadAndConfirmExcel(
      fixture.tenantId,
      fixture.userId,
      jobId,
      await buildEmployeeWorkbookBuffer([{ full_name: "X", email: `dup-${jobId}@qhse.local` }]),
    );

    await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, async () => {
      await dataImportService.createJob({ targetModuleCode: "EMPLOYEE", attachmentId });
      await expect(dataImportService.createJob({ targetModuleCode: "EMPLOYEE", attachmentId })).rejects.toThrow(ConflictException);
    });
  });

  it("processValidate(): attachment PENDING_SCAN -> throw (mekanisme retry BullMQ, bukan skip diam-diam)", async () => {
    const fixture = await seedTenantFixture();
    const jobId = randomUUID();
    // Presign+upload+confirm TANPA processScanJob() -> scanStatus tetap PENDING_SCAN.
    const buffer = await buildEmployeeWorkbookBuffer([{ full_name: "X", email: "x@qhse.local" }]);
    const attachmentId = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, async () => {
      const presigned = await attachmentService.presign({
        fileName: "employees.xlsx",
        mimeType: EXCEL_MIME,
        fileSize: buffer.length,
        entityType: DATA_IMPORT_ENTITY_TYPE,
        entityId: jobId,
        allowedMimeTypes: DATA_IMPORT_ALLOWED_MIME_TYPES,
      });
      await storage.putObject(presigned.storageKey, buffer, EXCEL_MIME);
      const confirmed = await attachmentService.confirm(
        {
          attachmentId: presigned.attachmentId,
          storageKey: presigned.storageKey,
          fileName: "employees.xlsx",
          entityType: DATA_IMPORT_ENTITY_TYPE,
          entityId: jobId,
        },
        fixture.userId,
      );
      return confirmed.attachmentId;
    });

    await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
      dataImportService.createJob({ targetModuleCode: "EMPLOYEE", attachmentId }),
    );

    await expect(
      processingService.processValidate({ tenantId: fixture.tenantId, dataImportJobId: jobId }),
    ).rejects.toThrow();

    const stillPending = await adminPrisma.dataImportJob.findUniqueOrThrow({ where: { id: jobId } });
    // Cek PENDING_SCAN terjadi SEBELUM klaim atomik UPLOADED->VALIDATING
    // (lihat urutan processValidate()) — job belum genuinely mulai
    // memvalidasi, jadi TIDAK ada race mungkin dgn worker lain di sini.
    expect(stillPending.status).toBe("UPLOADED");
  });

  it("processValidate(): attachment INFECTED -> job FAILED, error level-file (rowNumber=0) tercatat", async () => {
    const fixture = await seedTenantFixture();
    const jobId = randomUUID();
    const buffer = await buildEmployeeWorkbookBuffer([{ full_name: "X", email: "x@qhse.local" }]);
    const attachmentId = await uploadAndConfirmExcel(fixture.tenantId, fixture.userId, jobId, buffer, "INFECTED");

    await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
      dataImportService.createJob({ targetModuleCode: "EMPLOYEE", attachmentId }),
    );
    await processingService.processValidate({ tenantId: fixture.tenantId, dataImportJobId: jobId }).catch(() => undefined);

    await waitForJobStatus(jobId, fixture.tenantId, fixture.userId, ["FAILED"]);

    const errors = await adminPrisma.dataImportError.findMany({ where: { dataImportJobId: jobId } });
    expect(errors).toHaveLength(1);
    expect(errors[0].rowNumber).toBe(0);
    expect(errors[0].errorMessage).toMatch(/malware/);
  });
});
