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
exports.DocumentReviewScheduleService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const document_service_1 = require("./document.service");
const dms_context_1 = require("./dms-context");
// Task 2.1 (Modul 03 §4.3, BR-06) — pencatatan hasil tinjauan berkala.
// Pembuatan jadwal AWAL (saat publish) ada di
// DocumentWorkflowCompletionListener; job document-review-scan (task
// terpisah) yang menandai OVERDUE + kirim reminder H-30 — service ini murni
// menangani SISI MANUAL "reviewer mencatat hasil".
let DocumentReviewScheduleService = class DocumentReviewScheduleService {
    prisma;
    documentService;
    constructor(prisma, documentService) {
        this.prisma = prisma;
        this.documentService = documentService;
    }
    async listForDocument(documentId) {
        return this.prisma.withRls((tx) => tx.documentReviewSchedule.findMany({ where: { documentId }, orderBy: { scheduledReviewDate: "desc" } }));
    }
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
    async recordOutcome(input) {
        const reviewerUserId = (0, dms_context_1.requireActorUserId)();
        const tenantId = (0, dms_context_1.requireTenantId)();
        if (input.reviewOutcome === "MINOR_REVISION" || input.reviewOutcome === "MAJOR_REVISION_TRIGGERED") {
            if (!input.resultingDocumentVersionId) {
                throw new common_1.BadRequestException(`reviewOutcome=${input.reviewOutcome} wajib menyertakan resultingDocumentVersionId.`);
            }
        }
        if (input.reviewOutcome === "RETIRE_DOCUMENT" && !input.retireReason) {
            throw new common_1.BadRequestException("reviewOutcome=RETIRE_DOCUMENT wajib menyertakan retireReason.");
        }
        const { schedule, documentId } = await this.prisma.withRls(async (tx) => {
            const existing = await tx.documentReviewSchedule.findUniqueOrThrow({ where: { id: input.reviewScheduleId } });
            const document = await tx.document.findUniqueOrThrow({ where: { id: existing.documentId } });
            const now = new Date();
            const updated = await tx.documentReviewSchedule.update({
                where: { id: input.reviewScheduleId },
                data: {
                    actualReviewDate: now,
                    reviewerUserId,
                    reviewOutcome: input.reviewOutcome,
                    resultingDocumentVersionId: input.resultingDocumentVersionId,
                    status: "COMPLETED",
                    updatedBy: reviewerUserId,
                },
            });
            if (input.reviewOutcome === "NO_CHANGE_NEEDED" && document.reviewCycleMonths) {
                const nextDate = new Date(now);
                nextDate.setUTCMonth(nextDate.getUTCMonth() + document.reviewCycleMonths);
                await tx.documentReviewSchedule.create({
                    data: {
                        tenantId,
                        documentId: document.id,
                        scheduledReviewDate: nextDate,
                        status: "SCHEDULED",
                        createdBy: reviewerUserId,
                        updatedBy: reviewerUserId,
                    },
                });
                await tx.document.update({ where: { id: document.id }, data: { nextReviewDate: nextDate } });
            }
            return { schedule: updated, documentId: document.id };
        });
        if (input.reviewOutcome === "RETIRE_DOCUMENT") {
            // DocumentService.retire() withRls()-nya SENDIRI — dipanggil SETELAH
            // transaksi di atas commit, alasan sama seluruh call site lain modul
            // ini (retire() SENDIRI juga enqueue notifikasi setelah transaksinya).
            await this.documentService.retire(documentId, input.retireReason);
        }
        return schedule;
    }
};
exports.DocumentReviewScheduleService = DocumentReviewScheduleService;
exports.DocumentReviewScheduleService = DocumentReviewScheduleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        document_service_1.DocumentService])
], DocumentReviewScheduleService);
//# sourceMappingURL=document-review-schedule.service.js.map