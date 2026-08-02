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
exports.QualityObjectiveService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const quality_context_1 = require("./quality-context");
const objective_status_1 = require("./objective-status");
const MANUAL_TERMINAL_STATUSES = ["ACHIEVED", "NOT_ACHIEVED", "DISCONTINUED"];
/**
 * Task 5.1 (Modul 11 §4.5, §3 "Quality Manager | quality.objective.manage").
 * BELUM ada controller HTTP. TIDAK memakai Workflow Engine (PRD §4.5 literal
 * "bersifat perencanaan berkala" — perubahan target_value setelah periode
 * berjalan "direkomendasikan melalui approval sederhana... opsional per
 * tenant", TIDAK diimplementasikan krn tidak ada kolom konfigurasi
 * tenant utk mengaktifkannya, gap TDD §26, pola sama Root Cause Review
 * CAPA §4 "opsional per tenant" 4.2).
 */
let QualityObjectiveService = class QualityObjectiveService {
    prisma;
    notificationService;
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async create(input) {
        const createdBy = (0, quality_context_1.requireActorUserId)();
        const tenantId = (0, quality_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.qualityObjective.create({
            data: {
                tenantId,
                companyId: input.companyId,
                branchId: input.branchId,
                siteId: input.siteId,
                departmentId: input.departmentId,
                objectiveCode: input.objectiveCode,
                objectiveTitle: input.objectiveTitle,
                description: input.description,
                isoClauseRef: input.isoClauseRef ?? "6.2",
                relatedPolicyDocumentId: input.relatedPolicyDocumentId,
                kpiMetricName: input.kpiMetricName,
                targetValue: input.targetValue,
                targetUnit: input.targetUnit,
                baselineValue: input.baselineValue,
                atRiskThresholdPercentage: input.atRiskThresholdPercentage ?? 10,
                measurementFrequency: input.measurementFrequency,
                ownerUserId: input.ownerUserId,
                periodStart: input.periodStart,
                periodEnd: input.periodEnd,
                status: "ON_TRACK",
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    /**
     * BR-05 — catat quality_objective_progress_logs, mutakhirkan current_value
     * + status (HANYA jika status saat ini masih ON_TRACK/AT_RISK — status
     * manual-terminal ACHIEVED/NOT_ACHIEVED/DISCONTINUED dari reviewOutcome()
     * TIDAK PERNAH ditimpa kalkulasi otomatis ini).
     */
    async recordProgress(qualityObjectiveId, periodLabel, actualValue, notes) {
        const recordedBy = (0, quality_context_1.requireActorUserId)();
        const tenantId = (0, quality_context_1.requireTenantId)();
        const objective = await this.prisma.withRls((tx) => tx.qualityObjective.findUniqueOrThrow({ where: { id: qualityObjectiveId } }));
        const log = await this.prisma.withRls((tx) => tx.qualityObjectiveProgressLog.create({
            data: {
                tenantId,
                qualityObjectiveId,
                periodLabel,
                actualValue,
                recordedBy,
                recordedAt: new Date(),
                notes,
                createdBy: recordedBy,
                updatedBy: recordedBy,
            },
        }));
        if (!MANUAL_TERMINAL_STATUSES.includes(objective.status)) {
            const nextStatus = (0, objective_status_1.calculateObjectiveStatus)(actualValue, Number(objective.targetValue), Number(objective.atRiskThresholdPercentage));
            await this.prisma.withRls((tx) => tx.qualityObjective.update({ where: { id: qualityObjectiveId }, data: { currentValue: actualValue, status: nextStatus, updatedBy: recordedBy } }));
            // PRD §8 "Quality Objective AT_RISK/OFF_TRACK | Owner objective, Quality Manager".
            if (nextStatus === "AT_RISK") {
                const qualityManagers = await this.prisma.withRls((tx) => tx.user.findMany({
                    where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "QUALITY_MANAGER" } } } },
                    select: { id: true },
                }));
                const recipientIds = new Set([...qualityManagers.map((m) => m.id), ...(objective.ownerUserId ? [objective.ownerUserId] : [])]);
                for (const recipientUserId of recipientIds) {
                    await this.notificationService.enqueue({
                        eventType: "QUALITY_OBJECTIVE_AT_RISK",
                        entityType: "QUALITY_OBJECTIVE",
                        entityId: qualityObjectiveId,
                        recipientUserId,
                        priority: "MEDIUM",
                        eventCategory: "QUALITY",
                        variables: { objectiveTitle: objective.objectiveTitle },
                    });
                }
            }
        }
        else {
            await this.prisma.withRls((tx) => tx.qualityObjective.update({ where: { id: qualityObjectiveId }, data: { currentValue: actualValue, updatedBy: recordedBy } }));
        }
        return log;
    }
    /** §4.5 poin 4 — hasil review Management Review, manual override terminal. */
    async reviewOutcome(qualityObjectiveId, status) {
        const updatedBy = (0, quality_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.qualityObjective.update({ where: { id: qualityObjectiveId }, data: { status, lastReviewedDate: new Date(), updatedBy } }));
    }
    async getById(qualityObjectiveId) {
        return this.prisma.withRls((tx) => tx.qualityObjective.findUniqueOrThrow({ where: { id: qualityObjectiveId }, include: { progressLogs: true } }));
    }
    async listByCompany(companyId) {
        return this.prisma.withRls((tx) => tx.qualityObjective.findMany({ where: { companyId, deletedAt: null }, orderBy: { periodStart: "desc" } }));
    }
};
exports.QualityObjectiveService = QualityObjectiveService;
exports.QualityObjectiveService = QualityObjectiveService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], QualityObjectiveService);
//# sourceMappingURL=quality-objective.service.js.map