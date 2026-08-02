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
exports.McuScheduleService = void 0;
const common_1 = require("@nestjs/common");
const field_encryption_service_1 = require("../../../platform/field-encryption/field-encryption.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const mcu_lifecycle_1 = require("./mcu-lifecycle");
const occupational_health_context_1 = require("./occupational-health-context");
// mcu_schedules SENGAJA TIDAK melalui dual-gate BR-02/access-log BR-01 —
// enum accessed_entity_type (§5) TIDAK menyertakan mcu_schedules (hanya
// MEDICAL_RECORD/MCU_RESULT/FIT_TO_WORK_ASSESSMENT/PAK_CASE/CLINIC_VISIT),
// metadata jadwal (tanggal/tipe/paket) jauh lebih tidak sensitif drpd hasil
// klinis. reasonForSpecial TETAP [ENCRYPTED] (BR-05 berlaku ke SEMUA kolom
// bertanda itu terlepas dari gating entitasnya) — enkripsi != gating akses,
// dua kontrol independen.
let McuScheduleService = class McuScheduleService {
    prisma;
    fieldEncryption;
    constructor(prisma, fieldEncryption) {
        this.prisma = prisma;
        this.fieldEncryption = fieldEncryption;
    }
    async create(input) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        const reasonForSpecialEncrypted = await this.fieldEncryption.encrypt(tenantId, input.reasonForSpecial);
        const record = await this.prisma.withRls((tx) => tx.mcuSchedule.create({
            data: {
                tenantId,
                siteId: input.siteId,
                departmentId: input.departmentId,
                employeeUserId: input.employeeUserId,
                mcuType: input.mcuType,
                scheduledDate: input.scheduledDate,
                mcuPackageCode: input.mcuPackageCode,
                mcuPackageName: input.mcuPackageName,
                reasonForSpecialEncrypted,
                providerClinicName: input.providerClinicName,
                linkedHealthSurveillanceProgramId: input.linkedHealthSurveillanceProgramId,
                status: "SCHEDULED",
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
        return this.toDecrypted(tenantId, record, input.reasonForSpecial ?? null);
    }
    async transitionStatus(id, to) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        const existing = await this.prisma.withRls((tx) => tx.mcuSchedule.findUniqueOrThrow({ where: { id } }));
        (0, mcu_lifecycle_1.validateMcuScheduleStatusTransition)(existing.status, to);
        const record = await this.prisma.withRls((tx) => tx.mcuSchedule.update({ where: { id }, data: { status: to, updatedBy: actorUserId } }));
        return this.toDecrypted(tenantId, record);
    }
    async reschedule(id, newScheduledDate) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        const existing = await this.prisma.withRls((tx) => tx.mcuSchedule.findUniqueOrThrow({ where: { id } }));
        (0, mcu_lifecycle_1.validateMcuScheduleStatusTransition)(existing.status, "RESCHEDULED");
        const record = await this.prisma.withRls((tx) => tx.mcuSchedule.update({
            where: { id },
            data: { status: "RESCHEDULED", scheduledDate: newScheduledDate, updatedBy: actorUserId },
        }));
        return this.toDecrypted(tenantId, record);
    }
    async markReminderSent(id) {
        await this.prisma.withRls((tx) => tx.mcuSchedule.update({ where: { id }, data: { reminderSentAt: new Date() } }));
    }
    async getById(id) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const record = await this.prisma.withRls((tx) => tx.mcuSchedule.findUniqueOrThrow({ where: { id } }));
        return this.toDecrypted(tenantId, record);
    }
    async listByEmployee(employeeUserId) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const rows = await this.prisma.withRls((tx) => tx.mcuSchedule.findMany({ where: { tenantId, employeeUserId }, orderBy: { scheduledDate: "desc" } }));
        return Promise.all(rows.map((row) => this.toDecrypted(tenantId, row)));
    }
    async listBySite(siteId, status) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const rows = await this.prisma.withRls((tx) => tx.mcuSchedule.findMany({ where: { tenantId, siteId, status }, orderBy: { scheduledDate: "asc" } }));
        return Promise.all(rows.map((row) => this.toDecrypted(tenantId, row)));
    }
    async toDecrypted(tenantId, record, reasonForSpecialHint) {
        const { reasonForSpecialEncrypted, ...rest } = record;
        const reasonForSpecial = reasonForSpecialHint !== undefined ? reasonForSpecialHint : await this.fieldEncryption.decrypt(tenantId, reasonForSpecialEncrypted);
        return { ...rest, reasonForSpecial };
    }
};
exports.McuScheduleService = McuScheduleService;
exports.McuScheduleService = McuScheduleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        field_encryption_service_1.FieldEncryptionService])
], McuScheduleService);
