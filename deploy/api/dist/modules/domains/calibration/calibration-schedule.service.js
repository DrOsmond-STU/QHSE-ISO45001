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
exports.CalibrationScheduleService = void 0;
const common_1 = require("@nestjs/common");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const calibration_context_1 = require("./calibration-context");
const CALIBRATION_SCHEDULE_NUMBERING_MODULE_CODE = "CALIBRATION_WO";
const CALIBRATION_SCHEDULE_NUMBERING_PATTERN = "WO-CAL/{SITE_CODE}/{YYYY}/{SEQ:4}";
let CalibrationScheduleService = class CalibrationScheduleService {
    prisma;
    numbering;
    constructor(prisma, numbering) {
        this.prisma = prisma;
        this.numbering = numbering;
    }
    async ensureNumberingConfig(siteId) {
        const tenantId = (0, calibration_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const existing = await tx.numberingConfig.findFirst({ where: { tenantId, moduleCode: CALIBRATION_SCHEDULE_NUMBERING_MODULE_CODE, scopeId: siteId } });
            if (existing)
                return existing;
            return tx.numberingConfig.create({
                data: {
                    tenantId,
                    moduleCode: CALIBRATION_SCHEDULE_NUMBERING_MODULE_CODE,
                    pattern: CALIBRATION_SCHEDULE_NUMBERING_PATTERN,
                    prefix: "WO-CAL",
                    resetPeriod: "YEARLY",
                    scopeLevel: "SITE",
                    scopeId: siteId,
                },
            });
        });
    }
    async create(input) {
        const tenantId = (0, calibration_context_1.requireTenantId)();
        const actorUserId = (0, calibration_context_1.requireActorUserId)();
        const item = await this.prisma.withRls((tx) => tx.calibrationItem.findUniqueOrThrow({ where: { id: input.calibrationItemId }, select: { siteId: true } }));
        await this.ensureNumberingConfig(item.siteId);
        // Pelajaran task 6.1 (gap TDD §26) — {SITE_CODE} WAJIB disuplai lewat
        // variables, TIDAK PERNAH silently gagal render kalau lupa.
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: item.siteId }, select: { siteCode: true } }));
        const calibrationWoNo = await this.numbering.generateNext(CALIBRATION_SCHEDULE_NUMBERING_MODULE_CODE, {
            scopeId: item.siteId,
            variables: { SITE_CODE: site.siteCode },
        });
        return this.prisma.withRls((tx) => tx.calibrationSchedule.create({
            data: {
                tenantId,
                calibrationItemId: input.calibrationItemId,
                calibrationWoNo,
                scheduledDate: input.scheduledDate,
                dueDate: input.dueDate,
                assignedProviderId: input.assignedProviderId,
                notes: input.notes,
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    async update(id, input) {
        const actorUserId = (0, calibration_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.calibrationSchedule.update({
            where: { id },
            data: {
                scheduledDate: input.scheduledDate,
                dueDate: input.dueDate,
                // due_date diubah manual (mis. ditunda) — SELURUH kolom
                // idempotency reminder + overdue ikut reset, pola sama
                // MaintenanceScheduleService.update() 6.1 (gap TDD §26).
                reminderSentAtDay30: input.dueDate ? null : undefined,
                reminderSentAtDay14: input.dueDate ? null : undefined,
                reminderSentAtDay7: input.dueDate ? null : undefined,
                reminderSentAtDay1: input.dueDate ? null : undefined,
                overdueNotifiedAt: input.dueDate ? null : undefined,
                assignedProviderId: input.assignedProviderId,
                status: input.status,
                notes: input.notes,
                updatedBy: actorUserId,
            },
        }));
    }
    async getById(id) {
        return this.prisma.withRls((tx) => tx.calibrationSchedule.findUniqueOrThrow({ where: { id } }));
    }
    async listByItem(calibrationItemId) {
        const tenantId = (0, calibration_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.calibrationSchedule.findMany({ where: { tenantId, calibrationItemId, deletedAt: null }, orderBy: { dueDate: "desc" } }));
    }
};
exports.CalibrationScheduleService = CalibrationScheduleService;
exports.CalibrationScheduleService = CalibrationScheduleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService])
], CalibrationScheduleService);
//# sourceMappingURL=calibration-schedule.service.js.map