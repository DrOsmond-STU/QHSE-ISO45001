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
exports.WasteManifestService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const environmental_context_1 = require("./environmental-context");
const waste_rules_1 = require("./waste-rules");
const environmental_workflow_bootstrap_service_1 = require("./environmental-workflow-bootstrap.service");
const waste_generation_log_service_1 = require("./waste-generation-log.service");
const MANIFEST_NUMBERING_MODULE_CODE = "WASTE_MANIFEST";
/**
 * Task 5.2 (Modul 12 §4.3, §3 "Environmental Officer | environmental.waste_manifest.manage",
 * "TPS LB3 Officer | environmental.waste_manifest.create"). BELUM ada
 * controller HTTP.
 */
let WasteManifestService = class WasteManifestService {
    prisma;
    numberingService;
    bootstrapService;
    wasteGenerationLogService;
    constructor(prisma, numberingService, bootstrapService, wasteGenerationLogService) {
        this.prisma = prisma;
        this.numberingService = numberingService;
        this.bootstrapService = bootstrapService;
        this.wasteGenerationLogService = wasteGenerationLogService;
    }
    async create(input) {
        const createdBy = (0, environmental_context_1.requireActorUserId)();
        const tenantId = (0, environmental_context_1.requireTenantId)();
        (0, waste_rules_1.assertWasteCodeRequiredForHazardous)(input.wasteType, input.wasteCode ?? null);
        await this.bootstrapService.ensureManifestNumberingConfig(input.siteId);
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
        const manifestNumber = await this.numberingService.generateNext(MANIFEST_NUMBERING_MODULE_CODE, {
            scopeId: input.siteId,
            variables: { SITE_CODE: site.siteCode },
        });
        const manifest = await this.prisma.withRls((tx) => tx.wasteManifestRecord.create({
            data: {
                tenantId,
                siteId: input.siteId,
                manifestNumber,
                wasteType: input.wasteType,
                wasteCode: input.wasteCode,
                wasteName: input.wasteName,
                wasteDescription: input.wasteDescription,
                wasteSourceProcess: input.wasteSourceProcess,
                quantity: input.quantity,
                unitOfMeasure: input.unitOfMeasure,
                packagingType: input.packagingType,
                generationDate: input.generationDate,
                storageLocation: input.storageLocation,
                tpsLb3PermitId: input.tpsLb3PermitId,
                manifestStatus: "DRAFT",
                createdBy,
                updatedBy: createdBy,
            },
        }));
        for (const logId of input.linkedGenerationLogIds ?? []) {
            await this.wasteGenerationLogService.linkToManifest(logId, manifest.id);
        }
        return manifest;
    }
    async issue(manifestId) {
        return this.transition(manifestId, "ISSUED");
    }
    async markInTransit(manifestId, detail) {
        const updatedBy = (0, environmental_context_1.requireActorUserId)();
        const manifest = await this.prisma.withRls((tx) => tx.wasteManifestRecord.findUniqueOrThrow({ where: { id: manifestId } }));
        (0, waste_rules_1.validateManifestStatusTransition)(manifest.manifestStatus, "IN_TRANSIT");
        return this.prisma.withRls((tx) => tx.wasteManifestRecord.update({
            where: { id: manifestId },
            data: { manifestStatus: "IN_TRANSIT", updatedBy, ...detail },
        }));
    }
    async markReceivedByTransporter(manifestId) {
        return this.transition(manifestId, "RECEIVED_BY_TRANSPORTER");
    }
    async markReceivedByProcessor(manifestId, detail) {
        const updatedBy = (0, environmental_context_1.requireActorUserId)();
        const manifest = await this.prisma.withRls((tx) => tx.wasteManifestRecord.findUniqueOrThrow({ where: { id: manifestId } }));
        (0, waste_rules_1.validateManifestStatusTransition)(manifest.manifestStatus, "RECEIVED_BY_PROCESSOR");
        return this.prisma.withRls((tx) => tx.wasteManifestRecord.update({
            where: { id: manifestId },
            data: { manifestStatus: "RECEIVED_BY_PROCESSOR", updatedBy, ...detail },
        }));
    }
    async complete(manifestId) {
        return this.transition(manifestId, "COMPLETED");
    }
    async reject(manifestId) {
        return this.transition(manifestId, "REJECTED");
    }
    /** BR-04 — festronik_manifest_no identitas TERPISAH, bukan hasil numbering_configs. */
    async recordFestronikNumber(manifestId, festronikManifestNo) {
        const updatedBy = (0, environmental_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.wasteManifestRecord.update({ where: { id: manifestId }, data: { festronikManifestNo, festronikSyncStatus: "SYNCED", updatedBy } }));
    }
    async transition(manifestId, to) {
        const updatedBy = (0, environmental_context_1.requireActorUserId)();
        const manifest = await this.prisma.withRls((tx) => tx.wasteManifestRecord.findUniqueOrThrow({ where: { id: manifestId } }));
        (0, waste_rules_1.validateManifestStatusTransition)(manifest.manifestStatus, to);
        return this.prisma.withRls((tx) => tx.wasteManifestRecord.update({ where: { id: manifestId }, data: { manifestStatus: to, updatedBy } }));
    }
    async getById(manifestId) {
        return this.prisma.withRls((tx) => tx.wasteManifestRecord.findUniqueOrThrow({ where: { id: manifestId } }));
    }
    async listBySite(siteId) {
        return this.prisma.withRls((tx) => tx.wasteManifestRecord.findMany({ where: { siteId }, orderBy: { createdAt: "desc" } }));
    }
};
exports.WasteManifestService = WasteManifestService;
exports.WasteManifestService = WasteManifestService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        environmental_workflow_bootstrap_service_1.EnvironmentalWorkflowBootstrapService,
        waste_generation_log_service_1.WasteGenerationLogService])
], WasteManifestService);
