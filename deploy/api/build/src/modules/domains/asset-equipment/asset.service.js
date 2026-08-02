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
exports.AssetService = void 0;
const common_1 = require("@nestjs/common");
const notification_service_1 = require("../../../platform/notification/notification.service");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const asset_equipment_context_1 = require("./asset-equipment-context");
const asset_lifecycle_1 = require("./asset-lifecycle");
const ASSET_NUMBERING_MODULE_CODE = "ASSET";
const ASSET_NUMBERING_PATTERN = "AST/{SITE_CODE}/{YYYY}/{SEQ:4}";
let AssetService = class AssetService {
    prisma;
    numbering;
    notificationService;
    constructor(prisma, numbering, notificationService) {
        this.prisma = prisma;
        this.numbering = numbering;
        this.notificationService = notificationService;
    }
    async ensureNumberingConfig(siteId) {
        const tenantId = (0, asset_equipment_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const existing = await tx.numberingConfig.findFirst({ where: { tenantId, moduleCode: ASSET_NUMBERING_MODULE_CODE, scopeId: siteId } });
            if (existing)
                return existing;
            return tx.numberingConfig.create({
                data: { tenantId, moduleCode: ASSET_NUMBERING_MODULE_CODE, pattern: ASSET_NUMBERING_PATTERN, prefix: "AST", resetPeriod: "YEARLY", scopeLevel: "SITE", scopeId: siteId },
            });
        });
    }
    async create(input) {
        const tenantId = (0, asset_equipment_context_1.requireTenantId)();
        const actorUserId = (0, asset_equipment_context_1.requireActorUserId)();
        await this.ensureNumberingConfig(input.siteId);
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
        const assetCode = await this.numbering.generateNext(ASSET_NUMBERING_MODULE_CODE, {
            scopeId: input.siteId,
            variables: { SITE_CODE: site.siteCode },
        });
        const category = await this.prisma.withRls((tx) => tx.assetCategory.findUniqueOrThrow({ where: { id: input.assetCategoryId } }));
        const isSafetyCritical = input.isSafetyCritical ?? category.defaultIsSafetyCritical;
        const asset = await this.prisma.withRls((tx) => tx.asset.create({
            data: {
                tenantId,
                siteId: input.siteId,
                departmentId: input.departmentId,
                assetCategoryId: input.assetCategoryId,
                assetCode,
                assetName: input.assetName,
                manufacturer: input.manufacturer,
                modelNumber: input.modelNumber,
                serialNumber: input.serialNumber,
                purchaseDate: input.purchaseDate,
                isSafetyCritical,
                customFields: input.customFields ?? undefined,
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
        // BR-02 — is_safety_critical SUDAH true SEJAK create() (bukan transisi
        // false->true) TIDAK memicu notifikasi (PRD §6 literal "perubahan ...
        // dari false menjadi true", create() bukan "perubahan").
        return asset;
    }
    async update(id, input) {
        const actorUserId = (0, asset_equipment_context_1.requireActorUserId)();
        const existing = await this.prisma.withRls((tx) => tx.asset.findUniqueOrThrow({ where: { id } }));
        const asset = await this.prisma.withRls((tx) => tx.asset.update({
            where: { id },
            data: {
                departmentId: input.departmentId,
                assetName: input.assetName,
                manufacturer: input.manufacturer,
                modelNumber: input.modelNumber,
                serialNumber: input.serialNumber,
                isSafetyCritical: input.isSafetyCritical,
                conditionStatus: input.conditionStatus,
                customFields: input.customFields ?? undefined,
                updatedBy: actorUserId,
            },
        }));
        if (input.isSafetyCritical !== undefined && (0, asset_lifecycle_1.isSafetyCriticalNewlyFlagged)(existing.isSafetyCritical, input.isSafetyCritical)) {
            await this.notifyHseManagers(asset, "ASSET_EQUIPMENT_SAFETY_CRITICAL_FLAGGED");
        }
        // BR-04 — PRD §6 tidak membatasi jalur "condition_status=OUT_OF_SERVICE"
        // hanya lewat MaintenanceRecordService; update() manual JUGA menulis
        // condition_status langsung (UpdateAssetInput), jadi wajib alert sama
        // seperti MaintenanceRecordService.create() (unconditional per write,
        // bukan transition-check — lihat isSafetyCriticalOutOfServiceAlertRequired).
        if (input.conditionStatus !== undefined) {
            await this.alertIfOutOfServiceSafetyCritical(asset);
        }
        return asset;
    }
    // BR-01 — dipanggil AssetTransferService.retire()/dispose() (task 6.1
    // lanjutan) SETELAH lifecycle_status benar-benar berubah (bukan di sini —
    // AssetService.update() SENGAJA TIDAK mengekspos lifecycle_status sama
    // sekali, lihat komentar UpdateAssetInput: perubahan lifecycle WAJIB lewat
    // AssetTransferService supaya BR-03 [disposal via Workflow Engine] tidak
    // bisa dilewati caller yang keliru memakai method generik ini).
    async deactivateSchedulesIfTerminal(assetId, newStatus) {
        if (!(0, asset_lifecycle_1.shouldDeactivateSchedulesOnLifecycleChange)(newStatus))
            return;
        const tenantId = (0, asset_equipment_context_1.requireTenantId)();
        await this.prisma.withRls((tx) => tx.maintenanceSchedule.updateMany({ where: { tenantId, assetId, isActive: true }, data: { isActive: false } }));
    }
    assertDisposalAllowedDirectly(categoryRequiresDisposalApproval, newStatus) {
        if ((0, asset_lifecycle_1.requiresDisposalWorkflow)(newStatus, categoryRequiresDisposalApproval)) {
            throw new common_1.BadRequestException("Disposal aset kategori ini wajib melalui alur persetujuan (BR-03) — panggil AssetTransferService.requestDisposal(), bukan update status langsung.");
        }
    }
    // BR-04 — condition_status=OUT_OF_SERVICE pada aset safety-critical wajib
    // alert prioritas tinggi. Dipanggil MaintenanceRecordService setelah
    // menulis result_condition (satu-satunya jalur condition_status berubah
    // selain update() manual di atas, yang JUGA memanggil ini).
    async alertIfOutOfServiceSafetyCritical(asset) {
        if (!(0, asset_lifecycle_1.isSafetyCriticalOutOfServiceAlertRequired)(asset.isSafetyCritical, asset.conditionStatus))
            return;
        await this.notifyHseManagers(asset, "ASSET_EQUIPMENT_SAFETY_CRITICAL_OUT_OF_SERVICE");
    }
    async notifyHseManagers(asset, eventType) {
        const tenantId = (0, asset_equipment_context_1.requireTenantId)();
        const recipients = await this.prisma.withRls((tx) => tx.user.findMany({
            where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
            select: { id: true },
        }));
        for (const recipient of recipients) {
            await this.notificationService.enqueue({
                eventType,
                entityType: "ASSET",
                entityId: asset.id,
                recipientUserId: recipient.id,
                priority: "HIGH",
                eventCategory: "ASSET_EQUIPMENT",
                variables: { assetName: asset.assetName, assetCode: asset.assetCode },
            });
        }
    }
};
exports.AssetService = AssetService;
exports.AssetService = AssetService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        notification_service_1.NotificationService])
], AssetService);
