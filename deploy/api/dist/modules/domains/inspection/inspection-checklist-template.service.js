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
exports.InspectionChecklistTemplateService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const inspection_context_1 = require("./inspection-context");
// Task 3.6 (Modul 08 §3 "Tenant Admin | inspection.template.manage", §5,
// BR-07). BELUM ada controller HTTP. Item template DIKELOLA DI SINI
// (bukan service terpisah) — inspection_checklist_template_items TIDAK
// PUNYA siklus hidup independen dari template induknya.
let InspectionChecklistTemplateService = class InspectionChecklistTemplateService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const createdBy = (0, inspection_context_1.requireActorUserId)();
        const tenantId = (0, inspection_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const template = await tx.inspectionChecklistTemplate.create({
                data: {
                    tenantId,
                    inspectionTypeId: input.inspectionTypeId,
                    name: input.name,
                    version: 1,
                    scoringMethod: input.scoringMethod,
                    passingScoreThreshold: input.passingScoreThreshold,
                    effectiveDate: input.effectiveDate,
                    isActive: true,
                    createdBy,
                    updatedBy: createdBy,
                },
            });
            await this.createItems(tx, tenantId, template.id, input.items, createdBy);
            return template;
        });
    }
    /**
     * BR-07 — "perubahan versi TIDAK mengubah record historis... record
     * menyimpan referensi versi snapshot." Versi BARU = BARIS BARU
     * (version = versi aktif TERAKHIR + 1), baris LAMA TIDAK PERNAH diupdate
     * SELAIN isActive->false — pola PERSIS RiskMatrixConfigService (3.1,
     * versioned CRUD). inspection_records yang SUDAH memakai versi lama
     * TETAP menunjuk baris LAMA via FK snapshot (inspectionChecklistTemplateId),
     * genuinely tidak tersentuh operasi ini.
     */
    async createNewVersion(inspectionTypeId, input) {
        const createdBy = (0, inspection_context_1.requireActorUserId)();
        const tenantId = (0, inspection_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const previous = await tx.inspectionChecklistTemplate.findFirst({
                where: { inspectionTypeId, isActive: true },
                orderBy: { version: "desc" },
            });
            if (previous) {
                await tx.inspectionChecklistTemplate.update({ where: { id: previous.id }, data: { isActive: false, updatedBy: createdBy } });
            }
            const template = await tx.inspectionChecklistTemplate.create({
                data: {
                    tenantId,
                    inspectionTypeId,
                    name: input.name,
                    version: (previous?.version ?? 0) + 1,
                    scoringMethod: input.scoringMethod,
                    passingScoreThreshold: input.passingScoreThreshold,
                    effectiveDate: input.effectiveDate,
                    isActive: true,
                    createdBy,
                    updatedBy: createdBy,
                },
            });
            await this.createItems(tx, tenantId, template.id, input.items, createdBy);
            return template;
        });
    }
    async createItems(tx, tenantId, templateId, items, createdBy) {
        await tx.inspectionChecklistTemplateItem.createMany({
            data: items.map((item) => ({
                tenantId,
                inspectionChecklistTemplateId: templateId,
                sequenceNo: item.sequenceNo,
                itemText: item.itemText,
                category: item.category,
                responseType: item.responseType,
                weight: item.weight ?? 1,
                isMandatory: item.isMandatory ?? true,
                requiresPhotoIfFail: item.requiresPhotoIfFail ?? false,
                createdBy,
                updatedBy: createdBy,
            })),
        });
    }
    async resolveActiveTemplate(inspectionTypeId) {
        return this.prisma.withRls((tx) => tx.inspectionChecklistTemplate.findFirstOrThrow({ where: { inspectionTypeId, isActive: true }, orderBy: { version: "desc" } }));
    }
    async getById(templateId) {
        return this.prisma.withRls((tx) => tx.inspectionChecklistTemplate.findUniqueOrThrow({ where: { id: templateId }, include: { items: { orderBy: { sequenceNo: "asc" } } } }));
    }
    async listItemsByTemplate(templateId) {
        return this.prisma.withRls((tx) => tx.inspectionChecklistTemplateItem.findMany({ where: { inspectionChecklistTemplateId: templateId }, orderBy: { sequenceNo: "asc" } }));
    }
};
exports.InspectionChecklistTemplateService = InspectionChecklistTemplateService;
exports.InspectionChecklistTemplateService = InspectionChecklistTemplateService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InspectionChecklistTemplateService);
//# sourceMappingURL=inspection-checklist-template.service.js.map