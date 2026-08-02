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
exports.EmergencyActivationService = void 0;
const common_1 = require("@nestjs/common");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const emergency_activation_rules_1 = require("./emergency-activation-rules");
const emergency_response_context_1 = require("./emergency-response-context");
/**
 * Task 3.7 (Modul 14 §4.4/§6 BR-07). Acceptance criterion literal
 * TASK_INSTRUCTION.md 3.7 — "aktivasi darurat (emergency_activations)
 * memicu notifikasi broadcast prioritas tinggi (0.11)". PRD §8 baris
 * pertama: "trigger_context=REAL_EMERGENCY -> Seluruh karyawan/kontraktor
 * di site terkait, Top Management, HSE Manager, In-app+WhatsApp/Telegram
 * (prioritas TERTINGGI)". `NotificationService.enqueue()` (0.11) HANYA
 * terima SATU recipientUserId per panggilan — "broadcast" diimplementasikan
 * sbg LOOP sequential per resolved recipient (TIDAK ada infrastruktur
 * batch-notification baru di codebase ini) — NFR §11 "beban lonjakan
 * ratusan/ribuan submit" TIDAK ditangani strategi arsitektur khusus
 * (queue/rate-limit terpisah), gap TDD §26. `trigger_context=DRILL` TIDAK
 * memicu broadcast SAMA SEKALI (PRD §8 baris itu eksplisit HANYA
 * REAL_EMERGENCY).
 */
let EmergencyActivationService = class EmergencyActivationService {
    prisma;
    notificationService;
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async declare(input) {
        const activatedBy = (0, emergency_response_context_1.requireActorUserId)();
        const tenantId = (0, emergency_response_context_1.requireTenantId)();
        const activation = await this.prisma.withRls((tx) => tx.emergencyActivation.create({
            data: {
                tenantId,
                siteId: input.siteId,
                emergencyResponsePlanId: input.emergencyResponsePlanId,
                triggerContext: input.triggerContext,
                relatedEmergencyDrillId: input.relatedEmergencyDrillId,
                emergencyType: input.emergencyType,
                activationDatetime: new Date(),
                activatedBy,
                description: input.description,
                totalExpectedHeadcount: input.totalExpectedHeadcount,
                status: "ACTIVE",
                createdBy: activatedBy,
                updatedBy: activatedBy,
            },
        }));
        if (activation.triggerContext === "REAL_EMERGENCY") {
            await this.broadcastRealEmergencyActivation(activation);
        }
        return activation;
    }
    async broadcastRealEmergencyActivation(activation) {
        const tenantId = (0, emergency_response_context_1.requireTenantId)();
        const { recipientUserIds, siteName, musterPointName } = await this.prisma.withRls(async (tx) => {
            const site = await tx.site.findUniqueOrThrow({ where: { id: activation.siteId }, select: { name: true } });
            let resolvedMusterPointName = "titik kumpul terdekat";
            if (activation.emergencyResponsePlanId) {
                const plan = await tx.emergencyResponsePlan.findUnique({
                    where: { id: activation.emergencyResponsePlanId },
                    select: { defaultMusterPointId: true },
                });
                if (plan?.defaultMusterPointId) {
                    const musterPoint = await tx.emergencyMusterPoint.findUnique({
                        where: { id: plan.defaultMusterPointId },
                        select: { musterPointName: true },
                    });
                    if (musterPoint)
                        resolvedMusterPointName = musterPoint.musterPointName;
                }
            }
            // "Seluruh karyawan/kontraktor DI SITE TERKAIT" — site-scoped.
            const siteUsers = await tx.user.findMany({
                where: { tenantId, siteId: activation.siteId, status: "ACTIVE", userType: { in: ["INTERNAL_EMPLOYEE", "CONTRACTOR"] } },
                select: { id: true },
            });
            // "Top Management, HSE Manager" — PRD TIDAK menskop keduanya ke site
            // (beda dari baris pertama), pola sama resolusi HSE Manager tenant-
            // wide scan job lain (mis. inspection-record-overdue-scan 3.6).
            // Top Management dipetakan ke TENANT_ADMIN (§3 modul ini + Incident
            // 3.5, PRD tidak minta role baru).
            const managementUsers = await tx.user.findMany({
                where: {
                    tenantId,
                    status: "ACTIVE",
                    userRoles: { some: { role: { roleCode: { in: ["HSE_MANAGER", "TENANT_ADMIN"] } } } },
                },
                select: { id: true },
            });
            const ids = new Set([...siteUsers.map((u) => u.id), ...managementUsers.map((u) => u.id)]);
            return { recipientUserIds: ids, siteName: site.name, musterPointName: resolvedMusterPointName };
        });
        for (const recipientUserId of recipientUserIds) {
            await this.notificationService.enqueue({
                eventType: "EMERGENCY_REAL_ACTIVATION_DECLARED",
                entityType: "EMERGENCY_ACTIVATION",
                entityId: activation.id,
                recipientUserId,
                priority: "CRITICAL",
                eventCategory: "EMERGENCY_RESPONSE",
                variables: { emergencyType: activation.emergencyType, site: siteName, musterPointName },
            });
        }
    }
    async markAllClear(emergencyActivationId) {
        const updatedBy = (0, emergency_response_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const activation = await tx.emergencyActivation.findUniqueOrThrow({ where: { id: emergencyActivationId } });
            (0, emergency_activation_rules_1.validateEmergencyActivationStatusTransition)(activation.status, "ALL_CLEAR_DECLARED");
            return tx.emergencyActivation.update({
                where: { id: emergencyActivationId },
                data: { status: "ALL_CLEAR_DECLARED", allClearDatetime: new Date(), updatedBy },
            });
        });
    }
    async standDown(emergencyActivationId) {
        const updatedBy = (0, emergency_response_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const activation = await tx.emergencyActivation.findUniqueOrThrow({ where: { id: emergencyActivationId } });
            (0, emergency_activation_rules_1.validateEmergencyActivationStatusTransition)(activation.status, "STOOD_DOWN");
            return tx.emergencyActivation.update({ where: { id: emergencyActivationId }, data: { status: "STOOD_DOWN", updatedBy } });
        });
    }
    /** PRD §4.4 poin 5 — "Jika berkembang menjadi insiden formal ->
     * ditautkan related_incident_report_id ... untuk investigasi lanjutan."
     * Tautan MANUAL (caller sudah membuat IncidentReport terpisah lewat
     * IncidentReportService, di luar modul ini) — pola sama
     * IncidentCorrectiveActionLinkService (3.5). */
    async linkIncidentReport(emergencyActivationId, incidentReportId) {
        const updatedBy = (0, emergency_response_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.emergencyActivation.update({ where: { id: emergencyActivationId }, data: { relatedIncidentReportId: incidentReportId, updatedBy } }));
    }
    /** BR-07 — total_checked_in_count/missing_person_count DIHITUNG di sini
     * (bukan disimpan/didenormalisasi, lihat banner comment schema.prisma)
     * dari agregasi LIVE muster_point_checkins — TIDAK PERNAH stale. Caller
     * (API response/UI) WAJIB menampilkan disclaimer eksplisit (PRD §12) —
     * fungsi/method ini TIDAK menyertakan teks disclaimer (bukan tanggung
     * jawab layer data). */
    async getWithProgress(emergencyActivationId) {
        return this.prisma.withRls(async (tx) => {
            const activation = await tx.emergencyActivation.findUniqueOrThrow({ where: { id: emergencyActivationId } });
            const totalCheckedInCount = await tx.musterPointCheckin.count({ where: { emergencyActivationId } });
            return {
                activation,
                totalCheckedInCount,
                missingPersonCount: (0, emergency_activation_rules_1.computeMissingPersonCount)(activation.totalExpectedHeadcount, totalCheckedInCount),
            };
        });
    }
    async getById(emergencyActivationId) {
        return this.prisma.withRls((tx) => tx.emergencyActivation.findUniqueOrThrow({ where: { id: emergencyActivationId } }));
    }
};
exports.EmergencyActivationService = EmergencyActivationService;
exports.EmergencyActivationService = EmergencyActivationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], EmergencyActivationService);
//# sourceMappingURL=emergency-activation.service.js.map