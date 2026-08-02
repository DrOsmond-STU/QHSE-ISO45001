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
exports.InspectionRecordGenerationScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
const inspection_record_service_1 = require("./inspection-record.service");
const inspection_schedule_recurrence_1 = require("./inspection-schedule-recurrence");
/**
 * TDD §13.1/§9 pola job cross-tenant. PRD §4 poin 2-3 — generator instance
 * inspection_records dari inspection_schedules aktif. Aktor "createdBy"
 * baris inspection_records yang digenerate = createdBy BARIS JADWAL itu
 * sendiri (siapa pun HSE Manager yang membuat jadwal) — job cross-tenant
 * TIDAK punya aktor manusia sungguhan, pola INI (bukan admin/system user
 * generik yang tidak ada di skema) dipilih krn createdBy/updatedBy WAJIB
 * FK valid ke users, gap TDD §26. Jadwal TANPA default_assigned_inspector_id
 * DILEWATI (inspector_id kolom NOT NULL, tidak bisa digenerate otomatis).
 * CUSTOM_CRON DILEWATI SELURUHNYA (bukan cuma next_generation_date-nya
 * tidak di-advance) — kalau tetap digenerate tanpa next_generation_date
 * maju, jadwal itu akan "due" lagi di scan BERIKUTNYA dan menghasilkan
 * record BARU SETIAP HARI tanpa henti; melewati generation-nya sepenuhnya
 * lebih aman drpd bug generation tak terbatas, gap TDD §26 (butuh
 * cron-expression parser, di luar cakupan task ini).
 */
let InspectionRecordGenerationScanService = class InspectionRecordGenerationScanService {
    prisma;
    recordService;
    logger;
    adminPrisma;
    constructor(prisma, recordService, logger) {
        this.prisma = prisma;
        this.recordService = recordService;
        this.logger = logger;
        this.adminPrisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    }
    async onModuleDestroy() {
        await this.adminPrisma.$disconnect();
    }
    async scan(now = new Date()) {
        const rows = await this.adminPrisma.$queryRaw `
      SELECT DISTINCT tenant_id FROM inspection_schedules WHERE is_active = true
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "inspection-record-generation-scan gagal untuk satu tenant", {
                    module: "inspection",
                    action: "inspection-record-generation-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const dueSchedules = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const schedules = await tx.inspectionSchedule.findMany({
                where: { isActive: true, deletedAt: null },
                select: {
                    id: true,
                    nextGenerationDate: true,
                    recurrencePattern: true,
                    inspectionChecklistTemplateId: true,
                    siteId: true,
                    departmentId: true,
                    defaultAssignedInspectorId: true,
                    createdBy: true,
                },
            });
            const candidates = schedules.map((s) => ({
                scheduleId: s.id,
                nextGenerationDate: s.nextGenerationDate,
                isActive: true,
                startDate: null,
                endDate: null,
            }));
            const dueIds = new Set((0, inspection_schedule_recurrence_1.findSchedulesDueForGeneration)(candidates, now).map((c) => c.scheduleId));
            return schedules.filter((s) => dueIds.has(s.id));
        }));
        let generatedCount = 0;
        for (const schedule of dueSchedules) {
            if (schedule.recurrencePattern === "CUSTOM_CRON")
                continue;
            const inspectorId = schedule.defaultAssignedInspectorId;
            if (!inspectorId)
                continue;
            await tenant_context_1.tenantContextStorage.run({ tenantId, userId: schedule.createdBy }, () => this.recordService.create({
                inspectionChecklistTemplateId: schedule.inspectionChecklistTemplateId,
                inspectionScheduleId: schedule.id,
                siteId: schedule.siteId,
                departmentId: schedule.departmentId ?? undefined,
                plannedDate: schedule.nextGenerationDate,
                inspectorId,
            }));
            generatedCount += 1;
            const nextGenerationDate = (0, inspection_schedule_recurrence_1.computeNextGenerationDate)(schedule.nextGenerationDate, schedule.recurrencePattern);
            if (nextGenerationDate) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls((tx) => tx.inspectionSchedule.update({ where: { id: schedule.id }, data: { nextGenerationDate } })));
            }
        }
        if (generatedCount > 0) {
            this.logger.event("info", "inspection-record-generation-scan: record digenerate", {
                module: "inspection",
                action: "inspection-record-generation-scan.processed",
                tenant_id: tenantId,
                generated_count: generatedCount,
            });
        }
    }
};
exports.InspectionRecordGenerationScanService = InspectionRecordGenerationScanService;
exports.InspectionRecordGenerationScanService = InspectionRecordGenerationScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        inspection_record_service_1.InspectionRecordService,
        app_logger_service_1.AppLoggerService])
], InspectionRecordGenerationScanService);
