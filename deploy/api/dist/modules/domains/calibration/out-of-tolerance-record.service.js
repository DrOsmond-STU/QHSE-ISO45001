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
exports.OutOfToleranceRecordService = void 0;
const common_1 = require("@nestjs/common");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const calibration_context_1 = require("./calibration-context");
const calibration_lifecycle_1 = require("./calibration-lifecycle");
let OutOfToleranceRecordService = class OutOfToleranceRecordService {
    prisma;
    notificationService;
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    // BR-04 — dipanggil CalibrationCertificateService.create() saat
    // calibration_result=FAIL, OTOMATIS TIDAK BISA di-skip caller.
    async createFromFailedCertificate(certificate, item) {
        const tenantId = (0, calibration_context_1.requireTenantId)();
        const actorUserId = (0, calibration_context_1.requireActorUserId)();
        const record = await this.prisma.withRls((tx) => tx.outOfToleranceRecord.create({
            data: {
                tenantId,
                calibrationCertificateId: certificate.id,
                calibrationItemId: item.id,
                deviationDescription: `Hasil kalibrasi FAIL — sertifikat ${certificate.certificateNo}, item ${item.equipmentTagNo ?? item.id}.`,
                // BR-06 (§6 literal, saat create — lihat banner comment
                // calibration-lifecycle.ts).
                requiresCapa: (0, calibration_lifecycle_1.isCapaRequiredAtOotCreation)(item.isCriticalMeasurement),
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
        const recipients = await this.prisma.withRls((tx) => tx.user.findMany({
            where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: { in: ["HSE_MANAGER", "HSE_OFFICER"] } } } } },
            select: { id: true },
        }));
        for (const recipient of recipients) {
            await this.notificationService.enqueue({
                eventType: "CALIBRATION_RESULT_FAIL",
                entityType: "OUT_OF_TOLERANCE_RECORD",
                entityId: record.id,
                recipientUserId: recipient.id,
                priority: "HIGH",
                eventCategory: "CALIBRATION",
                variables: { equipmentTagNo: item.equipmentTagNo ?? "", certificateNo: certificate.certificateNo },
            });
        }
        return record;
    }
    // §4.2 poin 2 — penilaian dampak, status -> ASSESSED. Re-evaluasi
    // requires_capa via OR penuh (kritis DAN/ATAU impact MEDIUM/HIGH/CRITICAL).
    async assessImpact(id, input) {
        const actorUserId = (0, calibration_context_1.requireActorUserId)();
        const record = await this.prisma.withRls((tx) => tx.outOfToleranceRecord.findUniqueOrThrow({ where: { id } }));
        const item = await this.prisma.withRls((tx) => tx.calibrationItem.findUniqueOrThrow({ where: { id: record.calibrationItemId } }));
        return this.prisma.withRls((tx) => tx.outOfToleranceRecord.update({
            where: { id },
            data: {
                potentialImpactAssessment: input.potentialImpactAssessment,
                affectedPeriodFrom: input.affectedPeriodFrom,
                affectedPeriodTo: input.affectedPeriodTo,
                impactLevel: input.impactLevel,
                requiresCapa: (0, calibration_lifecycle_1.isCapaRequiredAfterImpactAssessment)(item.isCriticalMeasurement, input.impactLevel),
                requiresIncidentReport: input.requiresIncidentReport ?? false,
                status: "ASSESSED",
                updatedBy: actorUserId,
            },
        }));
    }
    // §4.2 poin 3 — CAPA wajib dibuat (caller: UI tombol "Buat CAPA", bawa
    // konteks OOT — di luar cakupan task ini krn belum ada controller HTTP
    // manapun sesi ini, pola sama seluruh modul domain lain). Status ->
    // CAPA_INITIATED (linking CAPA ADALAH milestone-nya).
    async linkCapaRegister(id, capaRegisterId) {
        const actorUserId = (0, calibration_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.outOfToleranceRecord.update({
            where: { id },
            data: { capaRegisterId, status: "CAPA_INITIATED", updatedBy: actorUserId },
        }));
    }
    async linkIncidentReport(id, incidentReportId) {
        const actorUserId = (0, calibration_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.outOfToleranceRecord.update({ where: { id }, data: { incidentReportId, updatedBy: actorUserId } }));
    }
    // BR-07 — TIDAK BISA CLOSED kalau requires_capa=true tapi linked_capa_id kosong.
    async close(id) {
        const actorUserId = (0, calibration_context_1.requireActorUserId)();
        const record = await this.prisma.withRls((tx) => tx.outOfToleranceRecord.findUniqueOrThrow({ where: { id } }));
        if (!(0, calibration_lifecycle_1.canCloseOutOfToleranceRecord)(record.requiresCapa, record.capaRegisterId)) {
            throw new common_1.BadRequestException("BR-07 — out_of_tolerance_records tidak dapat CLOSED: requires_capa=true tapi linked_capa_id masih kosong.");
        }
        return this.prisma.withRls((tx) => tx.outOfToleranceRecord.update({
            where: { id },
            data: { status: "CLOSED", closedBy: actorUserId, closedAt: new Date(), updatedBy: actorUserId },
        }));
    }
    async getById(id) {
        return this.prisma.withRls((tx) => tx.outOfToleranceRecord.findUniqueOrThrow({ where: { id } }));
    }
};
exports.OutOfToleranceRecordService = OutOfToleranceRecordService;
exports.OutOfToleranceRecordService = OutOfToleranceRecordService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], OutOfToleranceRecordService);
//# sourceMappingURL=out-of-tolerance-record.service.js.map