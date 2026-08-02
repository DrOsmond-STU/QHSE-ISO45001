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
exports.EmergencyEquipmentReadinessChecklistService = void 0;
const common_1 = require("@nestjs/common");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const emergency_response_context_1 = require("./emergency-response-context");
/**
 * Task 3.7 (Modul 14 §4.5/§6 BR-06). BELUM ada controller HTTP.
 *
 * BR-06 poin 1 — "asset_id wajib merujuk pada assets.is_safety_critical=TRUE
 * (Modul 15)" TIDAK BISA ditegakkan — Modul 15 (Asset & Equipment
 * Management) BELUM ADA di codebase ini (task 6.1, Phase 6) — assetId
 * bare UUID TANPA FK sama sekali (lihat banner comment schema.prisma),
 * jadi validasi silang "genuinely aset kritis" mustahil dilakukan
 * sekarang, gap TDD §26.
 *
 * BR-06 poin 2 — "readiness_status=OUT_OF_SERVICE pada alat kritis wajib
 * memicu notifikasi eskalasi REAL-TIME ke HSE Manager & Site Manager
 * (TIDAK menunggu siklus laporan berkala)" — DIIMPLEMENTASIKAN sinkron
 * DI DALAM create() (bukan scan job terpisah, sesuai "real-time" literal).
 * "Site Manager" TIDAK ADA sbg role di roster 15-role baseline (§3 modul
 * ini SENDIRI juga tidak memberi permission_code apa pun ke persona itu)
 * — eskalasi HANYA ke HSE_MANAGER, gap TDD §26.
 */
let EmergencyEquipmentReadinessChecklistService = class EmergencyEquipmentReadinessChecklistService {
    prisma;
    notificationService;
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async create(input) {
        const checkedBy = (0, emergency_response_context_1.requireActorUserId)();
        const tenantId = (0, emergency_response_context_1.requireTenantId)();
        const checklist = await this.prisma.withRls((tx) => tx.emergencyEquipmentReadinessChecklist.create({
            data: {
                tenantId,
                siteId: input.siteId,
                assetId: input.assetId,
                inspectionDate: input.inspectionDate,
                checkedBy,
                readinessStatus: input.readinessStatus,
                issueDescription: input.issueDescription,
                capaId: input.capaId,
                linkedMaintenanceRecordId: input.linkedMaintenanceRecordId,
                nextCheckDueDate: input.nextCheckDueDate,
                createdBy: checkedBy,
                updatedBy: checkedBy,
            },
        }));
        if (checklist.readinessStatus === "OUT_OF_SERVICE") {
            await this.escalateOutOfService(checklist);
        }
        return checklist;
    }
    async escalateOutOfService(checklist) {
        const tenantId = (0, emergency_response_context_1.requireTenantId)();
        const hseManagers = await this.prisma.withRls((tx) => tx.user.findMany({
            where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
            select: { id: true },
        }));
        for (const manager of hseManagers) {
            await this.notificationService.enqueue({
                eventType: "EMERGENCY_EQUIPMENT_OUT_OF_SERVICE",
                entityType: "EMERGENCY_EQUIPMENT_READINESS_CHECKLIST",
                entityId: checklist.id,
                recipientUserId: manager.id,
                priority: "HIGH",
                eventCategory: "EMERGENCY_RESPONSE",
                variables: { assetId: checklist.assetId },
            });
        }
    }
    async getById(readinessChecklistId) {
        return this.prisma.withRls((tx) => tx.emergencyEquipmentReadinessChecklist.findUniqueOrThrow({ where: { id: readinessChecklistId } }));
    }
    async listBySite(siteId) {
        return this.prisma.withRls((tx) => tx.emergencyEquipmentReadinessChecklist.findMany({ where: { siteId, deletedAt: null }, orderBy: { inspectionDate: "desc" } }));
    }
};
exports.EmergencyEquipmentReadinessChecklistService = EmergencyEquipmentReadinessChecklistService;
exports.EmergencyEquipmentReadinessChecklistService = EmergencyEquipmentReadinessChecklistService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], EmergencyEquipmentReadinessChecklistService);
