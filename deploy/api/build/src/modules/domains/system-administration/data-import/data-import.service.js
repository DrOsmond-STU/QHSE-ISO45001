"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataImportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
// Reuse leaf helper SIBLING folder ../provisioning/ — bukan duplikasi baru.
// Nama file ("system-administration-context", bukan "provisioning-context")
// sudah eksplisit berlaku utk SELURUH domain system-administration, bukan
// spesifik provisioning; data-import/branding TIDAK circular terhadapnya
// (leaf murni, tidak balik import apa pun), jadi aman direuse lintas
// subfolder sibling dalam SATU domain module yang sama — beda dari kasus
// organization<->industry-template (gap TDD §26 poin 29) yang circular
// krn saling impor DUA ARAH.
const system_administration_context_1 = require("../provisioning/system-administration-context");
const data_import_queue_service_1 = require("./data-import-queue.service");
const data_import_constants_1 = require("./data-import.constants");
const data_import_lifecycle_1 = require("./data-import-lifecycle");
const data_import_row_mapper_registry_service_1 = require("./row-mappers/data-import-row-mapper-registry.service");
let DataImportService = class DataImportService {
    prisma;
    mapperRegistry;
    queueService;
    constructor(prisma, mapperRegistry, queueService) {
        this.prisma = prisma;
        this.mapperRegistry = mapperRegistry;
        this.queueService = queueService;
    }
    /**
     * PRD §4.3 langkah 1-2. Prasyarat: caller SUDAH presign()+upload+confirm()
     * attachment (0.12) dgn entityType=DATA_IMPORT_JOB & entityId=<UUID yang
     * SAMA akan dipakai sbg id job ini> — lihat banner comment
     * schema.prisma "Task 1.6". TIDAK memeriksa scanStatus di sini (SENGAJA
     * async — lihat DataImportProcessingService.processValidate(), yang
     * retry via BullMQ backoff selama masih PENDING_SCAN).
     */
    async createJob(input) {
        const tenantId = (0, system_administration_context_1.requireTenantId)();
        const initiatedBy = (0, system_administration_context_1.requireActorUserId)();
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
    async createRetryJob(input) {
        const tenantId = (0, system_administration_context_1.requireTenantId)();
        const initiatedBy = (0, system_administration_context_1.requireActorUserId)();
        const sourceJob = await this.prisma.withRls((tx) => tx.dataImportJob.findUniqueOrThrow({ where: { id: input.sourceDataImportJobId } }));
        (0, data_import_lifecycle_1.assertDataImportJobIsRetryable)(sourceJob.status);
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
    async confirmImport(dataImportJobId) {
        const tenantId = (0, system_administration_context_1.requireTenantId)();
        const job = await this.prisma.withRls(async (tx) => {
            const current = await tx.dataImportJob.findUniqueOrThrow({ where: { id: dataImportJobId } });
            (0, data_import_lifecycle_1.validateDataImportJobStatusTransition)(current.status, "IMPORTING");
            return current;
        });
        await this.queueService.enqueueCommit({ tenantId, dataImportJobId: job.id });
        return job;
    }
    async getJob(dataImportJobId) {
        return this.prisma.withRls((tx) => tx.dataImportJob.findUniqueOrThrow({ where: { id: dataImportJobId } }));
    }
    /** "preview error per baris" (PRD §12 Import Wizard step 3). */
    async listErrorsForJob(dataImportJobId) {
        return this.prisma.withRls((tx) => tx.dataImportError.findMany({ where: { dataImportJobId }, orderBy: { rowNumber: "asc" } }));
    }
    assertModuleSupported(targetModuleCode) {
        if (!this.mapperRegistry.isSupported(targetModuleCode)) {
            throw new common_1.BadRequestException(`Modul "${targetModuleCode}" belum didukung untuk import data. Modul yang didukung: ${this.mapperRegistry
                .supportedTargetModuleCodes()
                .join(", ")}.`);
        }
    }
    async resolveUnusedAttachment(tx, attachmentId) {
        const attachment = await tx.attachment.findUnique({ where: { id: attachmentId } });
        if (!attachment) {
            throw new common_1.NotFoundException("attachmentId tidak ditemukan untuk tenant ini.");
        }
        if (attachment.entityType !== data_import_constants_1.DATA_IMPORT_ENTITY_TYPE) {
            throw new common_1.BadRequestException("attachment ini tidak dipresign untuk konteks import data.");
        }
        const existingJob = await tx.dataImportJob.findUnique({ where: { id: attachment.entityId } });
        if (existingJob) {
            throw new common_1.ConflictException("attachment ini sudah dipakai untuk job import lain.");
        }
        return attachment;
    }
};
exports.DataImportService = DataImportService;
exports.DataImportService = DataImportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        data_import_row_mapper_registry_service_1.DataImportRowMapperRegistry,
        data_import_queue_service_1.DataImportQueueService])
], DataImportService);
