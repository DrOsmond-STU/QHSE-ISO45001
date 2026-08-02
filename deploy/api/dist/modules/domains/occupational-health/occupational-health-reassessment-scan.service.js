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
exports.OccupationalHealthReassessmentScanService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../platform/observability/app-logger.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
/**
 * PRD §8 baris 5 — "restricted_duty_assignments mendekati end_date | OH
 * Staff, Supervisor terkait | In-app" — diimplementasikan berbasis
 * fit_to_work_assessments.next_reassessment_date (§4.2 poin 4: "next_
 * reassessment_date memicu reminder otomatis") krn restricted_duty_
 * assignments SENDIRI tidak punya kolom reassessment (hanya start_date/
 * end_date operasional) — nextReassessmentDate ADALAH sumber tunggal
 * tanggal reassessment kelaikan kerja di skema ini, gap TDD §26. Supervisor
 * "terkait" = assignedBy pada restricted_duty_assignments TERTAUT (kalau ada).
 */
let OccupationalHealthReassessmentScanService = class OccupationalHealthReassessmentScanService {
    prisma;
    notificationService;
    logger;
    adminPrisma;
    constructor(prisma, notificationService, logger) {
        this.prisma = prisma;
        this.notificationService = notificationService;
        this.logger = logger;
        this.adminPrisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    }
    async onModuleDestroy() {
        await this.adminPrisma.$disconnect();
    }
    async scan(now = new Date()) {
        const rows = await this.adminPrisma.$queryRaw `
      SELECT DISTINCT tenant_id FROM fit_to_work_assessments
      WHERE status = 'ACTIVE' AND next_reassessment_date IS NOT NULL AND reassessment_reminder_sent_at IS NULL
    `;
        for (const row of rows) {
            try {
                await this.scanForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "occupational-health-reassessment-scan gagal untuk satu tenant", {
                    module: "occupational_health",
                    action: "occupational-health-reassessment-scan.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async scanForTenant(tenantId, now) {
        const notifications = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const due = await tx.fitToWorkAssessment.findMany({
                where: { tenantId, status: "ACTIVE", nextReassessmentDate: { lte: now }, reassessmentReminderSentAt: null, deletedAt: null },
                select: { id: true, employeeUserId: true, linkedRestrictedDutyAssignmentId: true },
            });
            if (due.length === 0)
                return [];
            await tx.fitToWorkAssessment.updateMany({
                where: { id: { in: due.map((d) => d.id) } },
                data: { reassessmentReminderSentAt: now },
            });
            this.logger.event("info", "occupational-health-reassessment-scan: reminder diproses", {
                module: "occupational_health",
                action: "occupational-health-reassessment-scan.processed",
                tenant_id: tenantId,
                due_count: due.length,
            });
            const ohStaff = await tx.user.findMany({
                where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "OCCUPATIONAL_HEALTH_STAFF" } } } },
                select: { id: true },
            });
            const ohStaffIds = ohStaff.map((u) => u.id);
            const results = [];
            for (const d of due) {
                const recipientIds = new Set(ohStaffIds);
                if (d.linkedRestrictedDutyAssignmentId) {
                    const assignment = await tx.restrictedDutyAssignment.findUnique({
                        where: { id: d.linkedRestrictedDutyAssignmentId },
                        select: { assignedBy: true },
                    });
                    if (assignment)
                        recipientIds.add(assignment.assignedBy);
                }
                results.push({ fitToWorkAssessmentId: d.id, recipientUserIds: Array.from(recipientIds) });
            }
            return results;
        }));
        for (const n of notifications) {
            for (const recipientUserId of n.recipientUserIds) {
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.notificationService.enqueue({
                    eventType: "OCCUPATIONAL_HEALTH_REASSESSMENT_DUE",
                    entityType: "FIT_TO_WORK_ASSESSMENT",
                    entityId: n.fitToWorkAssessmentId,
                    recipientUserId,
                    priority: "MEDIUM",
                    eventCategory: "OCCUPATIONAL_HEALTH",
                    variables: {},
                }));
            }
        }
    }
};
exports.OccupationalHealthReassessmentScanService = OccupationalHealthReassessmentScanService;
exports.OccupationalHealthReassessmentScanService = OccupationalHealthReassessmentScanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        app_logger_service_1.AppLoggerService])
], OccupationalHealthReassessmentScanService);
//# sourceMappingURL=occupational-health-reassessment-scan.service.js.map