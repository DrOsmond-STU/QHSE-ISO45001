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
exports.AssetTransferService = exports.ASSET_SITE_CHANGED_EVENT = exports.DISPOSAL_WORKFLOW_ENTITY_TYPE = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const asset_service_1 = require("./asset.service");
const asset_equipment_context_1 = require("./asset-equipment-context");
const asset_lifecycle_1 = require("./asset-lifecycle");
// PRD §4.3 "dapat dikonfigurasi memakainya jika tenant memerlukan approval
// utk disposal aset bernilai tinggi (opsional, requires_disposal_approval
// di kategori)" — TIDAK ada baris §4 workflow_definitions default utk ini
// (BEDA seluruh modul lain sesi ini yang selalu py tabel konfigurasi
// eksplisit), approver "Top Management"-tier diinvent COMPANY_ADMIN, pola
// SAMA preseden Audit 4.1/CAPA/Emergency Response/Environmental utk
// keputusan bernilai organisasional — gap TDD §26.
const DISPOSAL_WORKFLOW_MODULE_CODE = "ASSET_DISPOSAL";
const DISPOSAL_WORKFLOW_NAME = "Asset Disposal Approval — 1 Stage (Company Admin)";
const DISPOSAL_STAGE_SLA_HOURS = 120;
exports.DISPOSAL_WORKFLOW_ENTITY_TYPE = "asset";
// BEYOND task 6.1 asli — ditambah RETROAKTIF task 6.2 (Calibration
// Management) utk BR-08 Modul 16 ("perubahan assets.site_id wajib memicu
// sinkronisasi calibration_items.site_id, event-driven"). Perubahan ADITIF
// murni (emit() baru, tidak mengubah baris kode yg sudah ada) — pola sama
// stub event lintas-modul lain sesi ini (mis. audit.finding_capa_required
// 4.1 diantisipasi CAPA 4.2). TIDAK ADA konsumen SAMA SEKALI sebelum modul
// ini genuinely ada, aman di-emit ke "void".
exports.ASSET_SITE_CHANGED_EVENT = "asset.site_changed";
let AssetTransferService = class AssetTransferService {
    prisma;
    assetService;
    workflowEngine;
    eventEmitter;
    constructor(prisma, assetService, workflowEngine, eventEmitter) {
        this.prisma = prisma;
        this.assetService = assetService;
        this.workflowEngine = workflowEngine;
        this.eventEmitter = eventEmitter;
    }
    async transfer(input) {
        const tenantId = (0, asset_equipment_context_1.requireTenantId)();
        const actorUserId = (0, asset_equipment_context_1.requireActorUserId)();
        const asset = await this.prisma.withRls((tx) => tx.asset.findUniqueOrThrow({ where: { id: input.assetId } }));
        const log = await this.prisma.withRls((tx) => tx.assetTransferLog.create({
            data: {
                tenantId,
                assetId: input.assetId,
                fromSiteId: asset.siteId,
                toSiteId: input.toSiteId,
                transferDate: input.transferDate,
                reason: input.reason,
                requestedBy: input.requestedBy,
                approvedBy: input.approvedBy,
                createdBy: actorUserId,
            },
        }));
        // BR "tidak mengubah histori maintenance sebelumnya" (PRD §4.3) —
        // maintenance_schedules/maintenance_records TIDAK disentuh sama sekali,
        // hanya assets.site_id berpindah.
        await this.prisma.withRls((tx) => tx.asset.update({ where: { id: input.assetId }, data: { siteId: input.toSiteId, updatedBy: actorUserId } }));
        // BR-08 Modul 16 (task 6.2, ditambah retroaktif) — lihat banner comment
        // ASSET_SITE_CHANGED_EVENT di atas.
        this.eventEmitter.emit(exports.ASSET_SITE_CHANGED_EVENT, { tenantId, assetId: input.assetId, newSiteId: input.toSiteId });
        return log;
    }
    async retire(assetId) {
        const actorUserId = (0, asset_equipment_context_1.requireActorUserId)();
        const asset = await this.prisma.withRls((tx) => tx.asset.update({ where: { id: assetId }, data: { lifecycleStatus: "RETIRED", updatedBy: actorUserId } }));
        // BR-01 — RETIRED TIDAK digate BR-03 (hanya DISPOSED), langsung nonaktifkan jadwal.
        await this.assetService.deactivateSchedulesIfTerminal(assetId, "RETIRED");
        return asset;
    }
    /** BR-03 — disposal langsung kalau kategori TIDAK mewajibkan approval,
     * ATAU mulai Workflow Engine (status TETAP belum DISPOSED sampai
     * disetujui) kalau kategori mewajibkannya. */
    async requestDisposal(assetId) {
        const actorUserId = (0, asset_equipment_context_1.requireActorUserId)();
        const asset = await this.prisma.withRls((tx) => tx.asset.findUniqueOrThrow({ where: { id: assetId } }));
        const category = await this.prisma.withRls((tx) => tx.assetCategory.findUniqueOrThrow({ where: { id: asset.assetCategoryId } }));
        if (!(0, asset_lifecycle_1.requiresDisposalWorkflow)("DISPOSED", category.requiresDisposalApproval)) {
            const disposed = await this.prisma.withRls((tx) => tx.asset.update({ where: { id: assetId }, data: { lifecycleStatus: "DISPOSED", updatedBy: actorUserId } }));
            await this.assetService.deactivateSchedulesIfTerminal(assetId, "DISPOSED");
            return disposed;
        }
        const definition = await this.prisma.withRls((tx) => this.ensureDisposalWorkflowDefinition(tx));
        const instance = await this.workflowEngine.startInstance(exports.DISPOSAL_WORKFLOW_ENTITY_TYPE, assetId, definition.id, {
            assetCode: asset.assetCode,
            assetName: asset.assetName,
        });
        return this.prisma.withRls((tx) => tx.asset.update({ where: { id: assetId }, data: { disposalWorkflowInstanceId: instance.id, updatedBy: actorUserId } }));
    }
    /** Dipanggil AssetDisposalWorkflowCompletionListener. APPROVED -> DISPOSED
     * + nonaktifkan jadwal (BR-01). REJECTED -> lifecycle_status TIDAK
     * berubah (tetap ACTIVE/apa pun sebelumnya) — disposalWorkflowInstanceId
     * TIDAK di-null-kan (pointer sekali-pakai historis, lihat banner comment
     * schema.prisma), caller yang ingin coba lagi memanggil requestDisposal()
     * ULANG (instance BARU, menimpa pointer lama). */
    async onDisposalWorkflowCompleted(assetId, approved) {
        if (!approved)
            return;
        await this.prisma.withRls((tx) => tx.asset.update({ where: { id: assetId }, data: { lifecycleStatus: "DISPOSED" } }));
        await this.assetService.deactivateSchedulesIfTerminal(assetId, "DISPOSED");
    }
    async ensureDisposalWorkflowDefinition(tx) {
        const tenantId = (0, asset_equipment_context_1.requireTenantId)();
        const existing = await tx.workflowDefinition.findFirst({
            where: { tenantId, moduleCode: DISPOSAL_WORKFLOW_MODULE_CODE, isActive: true },
            orderBy: { version: "desc" },
        });
        if (existing)
            return existing;
        const companyAdminRole = await tx.role.findFirst({ where: { tenantId: null, roleCode: "COMPANY_ADMIN" } });
        if (!companyAdminRole) {
            throw new common_1.NotFoundException('Role sistem "COMPANY_ADMIN" tidak ditemukan — RBAC baseline (seed-rbac-baseline.ts) wajib dijalankan sebelum modul Asset bisa membuat workflow_definitions disposal.');
        }
        const definition = await tx.workflowDefinition.create({
            data: { tenantId, moduleCode: DISPOSAL_WORKFLOW_MODULE_CODE, name: DISPOSAL_WORKFLOW_NAME, isActive: true, version: 1 },
        });
        const stage1 = await tx.workflowStage.create({
            data: {
                tenantId,
                workflowDefinitionId: definition.id,
                sequenceNo: 1,
                stageName: "Disposal Approval",
                approverType: "ROLE_IN_SCOPE",
                approverRoleId: companyAdminRole.id,
                slaHours: DISPOSAL_STAGE_SLA_HOURS,
                escalationAction: "NOTIFY_SUPERIOR",
                allowDelegation: true,
            },
        });
        await tx.workflowTransition.createMany({
            data: [
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: null, triggerAction: "APPROVE", resultStatus: "APPROVED" },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: null, triggerAction: "REJECT", resultStatus: "REJECTED" },
            ],
        });
        return definition;
    }
};
exports.AssetTransferService = AssetTransferService;
exports.AssetTransferService = AssetTransferService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        asset_service_1.AssetService,
        workflow_engine_service_1.WorkflowEngineService,
        event_emitter_1.EventEmitter2])
], AssetTransferService);
