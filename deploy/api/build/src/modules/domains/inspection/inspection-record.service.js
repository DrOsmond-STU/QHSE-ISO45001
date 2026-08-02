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
exports.InspectionRecordService = void 0;
const common_1 = require("@nestjs/common");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const inspection_context_1 = require("./inspection-context");
const inspection_lifecycle_1 = require("./inspection-lifecycle");
const inspection_mandatory_items_1 = require("./inspection-mandatory-items");
const inspection_numbering_bootstrap_service_1 = require("./inspection-numbering-bootstrap.service");
const inspection_scoring_1 = require("./inspection-scoring");
const INSPECTION_NUMBERING_MODULE_CODE = "INSPECTION";
// Task 3.6 (Modul 08 §4 poin 3-6/§6 BR-01/02/03). BELUM ada controller
// HTTP — inspection.record.* sudah di-seed RBAC baseline (task 167).
let InspectionRecordService = class InspectionRecordService {
    prisma;
    numberingService;
    numberingBootstrapService;
    constructor(prisma, numberingService, numberingBootstrapService) {
        this.prisma = prisma;
        this.numberingService = numberingService;
        this.numberingBootstrapService = numberingBootstrapService;
    }
    /**
     * PRD §4 poin 3 "Sistem membangkitkan instance inspection_records otomatis
     * dari jadwal MENJELANG tanggal jatuh tempo, ATAU Inspector menginisiasi
     * inspeksi ad-hoc langsung dari inspection_types TANPA jadwal" —
     * inspectionScheduleId opsional (NULL = ad-hoc). BR-07 snapshot terpenuhi
     * KRN inspectionChecklistTemplateId yang caller suplai disimpan permanen
     * di baris ini, TIDAK PERNAH ikut berubah kalau template dapat versi baru.
     */
    async create(input) {
        const createdBy = (0, inspection_context_1.requireActorUserId)();
        const tenantId = (0, inspection_context_1.requireTenantId)();
        await this.numberingBootstrapService.ensureNumberingConfig(input.siteId);
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true, companyId: true, branchId: true } }));
        const inspectionRecordNumber = await this.numberingService.generateNext(INSPECTION_NUMBERING_MODULE_CODE, {
            scopeId: input.siteId,
            variables: { SITE_CODE: site.siteCode },
        });
        return this.prisma.withRls((tx) => tx.inspectionRecord.create({
            data: {
                tenantId,
                inspectionRecordNumber,
                inspectionScheduleId: input.inspectionScheduleId,
                inspectionChecklistTemplateId: input.inspectionChecklistTemplateId,
                companyId: site.companyId,
                branchId: site.branchId,
                siteId: input.siteId,
                departmentId: input.departmentId,
                plannedDate: input.plannedDate,
                inspectorId: input.inspectorId,
                status: "SCHEDULED",
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async start(inspectionRecordId) {
        const updatedBy = (0, inspection_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const record = await tx.inspectionRecord.findUniqueOrThrow({ where: { id: inspectionRecordId } });
            (0, inspection_lifecycle_1.validateInspectionRecordStatusTransition)(record.status, "IN_PROGRESS");
            return tx.inspectionRecord.update({
                where: { id: inspectionRecordId },
                data: { status: "IN_PROGRESS", actualDate: record.actualDate ?? new Date(), updatedBy },
            });
        });
    }
    /** Upsert-by-(record,templateItem) — Inspector boleh mengoreksi jawaban
     * sebelum status COMPLETED (TIDAK ADA guard "sekali isi terkunci" —
     * PRD tidak menyebutnya). scoreObtained dihitung LANGSUNG saat submit
     * (computeItemScore()), BUKAN ditunda ke complete(). */
    async submitItemResponse(inspectionRecordId, input) {
        const actorId = (0, inspection_context_1.requireActorUserId)();
        const tenantId = (0, inspection_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const templateItem = await tx.inspectionChecklistTemplateItem.findUniqueOrThrow({ where: { id: input.templateItemId } });
            const scoreObtained = (0, inspection_scoring_1.computeItemScore)(templateItem.responseType, input.responseValue, Number(templateItem.weight));
            const existing = await tx.inspectionRecordItem.findUnique({
                where: { inspectionRecordId_templateItemId: { inspectionRecordId, templateItemId: input.templateItemId } },
            });
            if (existing) {
                return tx.inspectionRecordItem.update({
                    where: { id: existing.id },
                    data: { responseValue: input.responseValue, scoreObtained, comment: input.comment, updatedBy: actorId },
                });
            }
            return tx.inspectionRecordItem.create({
                data: {
                    tenantId,
                    inspectionRecordId,
                    templateItemId: input.templateItemId,
                    responseValue: input.responseValue,
                    scoreObtained,
                    comment: input.comment,
                    createdBy: actorId,
                    updatedBy: actorId,
                },
            });
        });
    }
    /**
     * BR-01 (seluruh item mandatory terjawab) + BR-02 (foto wajib utk item
     * requires_photo_if_fail=TRUE ber-response FAIL — dicek lewat query
     * `attachments` LANGSUNG, entity_type=inspection_record_item, POLA SAMA
     * precedent cross-module read-only lain di codebase ini, BUKAN inject
     * AttachmentService) ditegakkan SEBELUM tulis apa pun. BR-03 — overall_score/
     * overall_result dihitung SAAT INI (pure fn incident-scoring.ts).
     */
    async complete(inspectionRecordId) {
        const updatedBy = (0, inspection_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const record = await tx.inspectionRecord.findUniqueOrThrow({ where: { id: inspectionRecordId } });
            (0, inspection_lifecycle_1.validateInspectionRecordStatusTransition)(record.status, "COMPLETED");
            const template = await tx.inspectionChecklistTemplate.findUniqueOrThrow({ where: { id: record.inspectionChecklistTemplateId } });
            const templateItems = await tx.inspectionChecklistTemplateItem.findMany({
                where: { inspectionChecklistTemplateId: record.inspectionChecklistTemplateId },
            });
            const recordItems = await tx.inspectionRecordItem.findMany({ where: { inspectionRecordId } });
            const templateItemById = new Map(templateItems.map((t) => [t.id, t]));
            (0, inspection_mandatory_items_1.assertAllMandatoryItemsAnswered)(templateItems.map((t) => ({ id: t.id, isMandatory: t.isMandatory })), recordItems.map((r) => ({ templateItemId: r.templateItemId })));
            for (const recordItem of recordItems) {
                const templateItem = templateItemById.get(recordItem.templateItemId);
                if (templateItem?.requiresPhotoIfFail && recordItem.responseValue === "FAIL") {
                    const photoCount = await tx.attachment.count({
                        where: { entityType: "inspection_record_item", entityId: recordItem.id, scanStatus: "CLEAN" },
                    });
                    if (photoCount === 0) {
                        throw new common_1.BadRequestException(`inspection_record_items ${recordItem.id} wajib memiliki minimal 1 foto (attachments) krn response=FAIL pada item requires_photo_if_fail=TRUE (BR-02).`);
                    }
                }
            }
            const overallScore = (0, inspection_scoring_1.computeOverallScore)(recordItems.map((r) => ({
                scoreObtained: r.scoreObtained !== null ? Number(r.scoreObtained) : null,
                weight: Number(templateItemById.get(r.templateItemId)?.weight ?? 1),
            })));
            const allMandatoryPassed = (0, inspection_scoring_1.computeAllMandatoryItemsPassed)(recordItems.map((r) => {
                const templateItem = templateItemById.get(r.templateItemId);
                return { isMandatory: templateItem.isMandatory, responseType: templateItem.responseType, responseValue: r.responseValue };
            }));
            const overallResult = (0, inspection_scoring_1.computeOverallResult)(template.scoringMethod, overallScore, template.passingScoreThreshold !== null ? Number(template.passingScoreThreshold) : null, allMandatoryPassed);
            return tx.inspectionRecord.update({
                where: { id: inspectionRecordId },
                data: { status: "COMPLETED", overallScore, overallResult, actualDate: record.actualDate ?? new Date(), updatedBy },
            });
        });
    }
    /** BR-03 "dibuka ulang (reopen) oleh HSE Manager dengan jejak audit" —
     * "siapa boleh" ditegakkan lewat RBAC (permission_code) di layer
     * pemanggil (BELUM ada controller HTTP), jejak audit lewat
     * audit_log_trigger generik + updatedBy. overallScore/overallResult
     * SENGAJA TIDAK direset (biar tetap terlihat nilai TERAKHIR sampai
     * complete() dipanggil ulang). */
    async reopen(inspectionRecordId) {
        const updatedBy = (0, inspection_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const record = await tx.inspectionRecord.findUniqueOrThrow({ where: { id: inspectionRecordId } });
            (0, inspection_lifecycle_1.validateInspectionRecordStatusTransition)(record.status, "IN_PROGRESS");
            return tx.inspectionRecord.update({ where: { id: inspectionRecordId }, data: { status: "IN_PROGRESS", updatedBy } });
        });
    }
    async cancel(inspectionRecordId) {
        const updatedBy = (0, inspection_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const record = await tx.inspectionRecord.findUniqueOrThrow({ where: { id: inspectionRecordId } });
            (0, inspection_lifecycle_1.validateInspectionRecordStatusTransition)(record.status, "CANCELLED");
            return tx.inspectionRecord.update({ where: { id: inspectionRecordId }, data: { status: "CANCELLED", updatedBy } });
        });
    }
    async getById(inspectionRecordId) {
        return this.prisma.withRls((tx) => tx.inspectionRecord.findUniqueOrThrow({
            where: { id: inspectionRecordId },
            include: { items: true, findings: true, scores: true },
        }));
    }
};
exports.InspectionRecordService = InspectionRecordService;
exports.InspectionRecordService = InspectionRecordService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        inspection_numbering_bootstrap_service_1.InspectionNumberingBootstrapService])
], InspectionRecordService);
