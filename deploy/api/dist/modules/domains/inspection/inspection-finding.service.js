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
exports.InspectionFindingService = exports.INSPECTION_FINDING_CREATED_EVENT = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const inspection_context_1 = require("./inspection-context");
exports.INSPECTION_FINDING_CREATED_EVENT = "inspection.finding_created";
/**
 * Task 3.6 (Modul 08 §4 poin 6-8/§6 BR-05). BELUM ada controller HTTP.
 * PRD §4 poin 7 "setiap inspection_findings SECARA DEFAULT langsung
 * membuat action item di Modul 24 Action Tracking" + TASK_INSTRUCTION.md
 * literal "di-stub sebagai event inspection.finding_created untuk saat
 * ini" — Modul 24 BELUM ADA (task 7.4), jadi create() HANYA emit event via
 * EventEmitter2 (pola infra SAMA WORKFLOW_INSTANCE_COMPLETED_EVENT tapi
 * NAMESPACE terpisah, BUKAN lewat WorkflowEngineService) — TIDAK ADA
 * listener yang genuinely mengonsumsi event ini sekarang di codebase ini.
 */
let InspectionFindingService = class InspectionFindingService {
    prisma;
    eventEmitter;
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
    async create(input) {
        const identifiedBy = (0, inspection_context_1.requireActorUserId)();
        const tenantId = (0, inspection_context_1.requireTenantId)();
        const finding = await this.prisma.withRls((tx) => tx.inspectionFinding.create({
            data: {
                tenantId,
                inspectionRecordId: input.inspectionRecordId,
                recordItemId: input.recordItemId,
                title: input.title,
                description: input.description,
                severity: input.severity,
                areaLocation: input.areaLocation,
                status: "OPEN",
                identifiedBy,
                identifiedAt: new Date(),
                targetCloseDate: input.targetCloseDate,
                createdBy: identifiedBy,
                updatedBy: identifiedBy,
            },
        }));
        const event = {
            tenantId,
            inspectionFindingId: finding.id,
            inspectionRecordId: finding.inspectionRecordId,
            severity: finding.severity,
            title: finding.title,
            identifiedBy: finding.identifiedBy,
            identifiedAt: finding.identifiedAt,
        };
        this.eventEmitter.emit(exports.INSPECTION_FINDING_CREATED_EVENT, event);
        return finding;
    }
    /** Titik sinkronisasi MANUAL begitu Modul 24 genuinely ada dan action
     * item dibuat DI SANA — TIDAK ADA listener otomatis di codebase ini yang
     * memanggil ini (gap TDD §26, pola sama
     * IncidentCorrectiveActionLinkService.updateCapaStatusCache(), 3.5). */
    async linkActionTracking(inspectionFindingId, actionTrackingId) {
        const updatedBy = (0, inspection_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.inspectionFinding.update({
            where: { id: inspectionFindingId },
            data: { actionTrackingId, status: "ACTION_ASSIGNED", updatedBy },
        }));
    }
    /** BR-05 — eskalasi CAPA BERSIFAT MANUAL/OPSIONAL, TIDAK ADA proses
     * otomatis yang membuat CAPA utk seluruh temuan — ini SATU-SATUNYA
     * jalur mengisi escalated_capa_register_id. */
    async escalateToCapa(inspectionFindingId, capaRegisterId) {
        const updatedBy = (0, inspection_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.inspectionFinding.update({
            where: { id: inspectionFindingId },
            data: { escalatedCapaRegisterId: capaRegisterId, status: "ESCALATED_TO_CAPA", updatedBy },
        }));
    }
    async close(inspectionFindingId) {
        const updatedBy = (0, inspection_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.inspectionFinding.update({ where: { id: inspectionFindingId }, data: { status: "CLOSED", closedAt: new Date(), updatedBy } }));
    }
    async listByRecord(inspectionRecordId) {
        return this.prisma.withRls((tx) => tx.inspectionFinding.findMany({ where: { inspectionRecordId }, orderBy: { identifiedAt: "desc" } }));
    }
};
exports.InspectionFindingService = InspectionFindingService;
exports.InspectionFindingService = InspectionFindingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], InspectionFindingService);
//# sourceMappingURL=inspection-finding.service.js.map