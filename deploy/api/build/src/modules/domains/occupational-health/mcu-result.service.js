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
exports.McuResultService = void 0;
const common_1 = require("@nestjs/common");
const field_encryption_service_1 = require("../../../platform/field-encryption/field-encryption.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const mcu_lifecycle_1 = require("./mcu-lifecycle");
const occupational_health_context_1 = require("./occupational-health-context");
const occupational_health_access_control_service_1 = require("./occupational-health-access-control.service");
const medical_record_access_log_service_1 = require("./medical-record-access-log.service");
const ENCRYPTED_NUMERIC_FIELDS = ["heightCm", "weightKg", "bmi", "bloodPressureSystolic", "bloodPressureDiastolic", "pulseRate"];
// mcu_results ADA di enum accessed_entity_type (§5) DAN literal BR-01 —
// dual-gate + access-log PENUH berlaku, pola SAMA MedicalRecordService.
let McuResultService = class McuResultService {
    prisma;
    fieldEncryption;
    accessControl;
    accessLog;
    notificationService;
    constructor(prisma, fieldEncryption, accessControl, accessLog, notificationService) {
        this.prisma = prisma;
        this.fieldEncryption = fieldEncryption;
        this.accessControl = accessControl;
        this.accessLog = accessLog;
        this.notificationService = notificationService;
    }
    async create(input, reasonForAccess, reasonNotes) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        await this.accessControl.assertPhiAccessAuthorized({ scopeType: "SITE", scopeId: input.siteIdForScope });
        const encrypted = await this.encryptClinicalFields(tenantId, input);
        const record = await this.prisma.withRls((tx) => tx.mcuResult.create({
            data: {
                tenantId,
                mcuScheduleId: input.mcuScheduleId,
                employeeUserId: input.employeeUserId,
                examinationDate: input.examinationDate,
                examiningPhysicianName: input.examiningPhysicianName,
                examiningPhysicianLicenseNo: input.examiningPhysicianLicenseNo,
                overallMcuResult: input.overallMcuResult,
                reportFileAttachmentNote: input.reportFileAttachmentNote,
                status: "DRAFT",
                createdBy: actorUserId,
                updatedBy: actorUserId,
                ...encrypted.data,
            },
        }));
        await this.accessLog.recordAccess({
            subjectEmployeeUserId: input.employeeUserId,
            accessedEntityType: "MCU_RESULT",
            accessedEntityId: record.id,
            accessType: "EDIT",
            reasonForAccess,
            reasonNotes,
        });
        // PRD §8 baris 2 — "overall_mcu_result = REQUIRES_FOLLOW_UP -> notifikasi
        // ke Occupational Health Staff (BUKAN HSE Manager) — hanya ke role
        // whitelisted." Role RBAC OCCUPATIONAL_HEALTH_STAFF dipakai sbg proxy
        // "whitelisted" (memiliki role ITU SENDIRI bukan bukti whitelist aktif
        // per §3.1 poin 1 — notifikasi ini best-effort ke KANDIDAT staf, bukan
        // klaim otorisasi; staf yang benar-benar buka data tetap lewat dual-gate
        // penuh saat getById()).
        if (input.overallMcuResult === "REQUIRES_FOLLOW_UP") {
            const recipients = await this.prisma.withRls((tx) => tx.user.findMany({ where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "OCCUPATIONAL_HEALTH_STAFF" } } } }, select: { id: true } }));
            for (const recipient of recipients) {
                await this.notificationService.enqueue({
                    eventType: "OCCUPATIONAL_HEALTH_MCU_REQUIRES_FOLLOW_UP",
                    entityType: "MCU_RESULT",
                    entityId: record.id,
                    recipientUserId: recipient.id,
                    priority: "HIGH",
                    eventCategory: "OCCUPATIONAL_HEALTH",
                    variables: { overallMcuResult: input.overallMcuResult },
                });
            }
        }
        return this.toDecrypted(tenantId, record, encrypted.plain);
    }
    async linkFitToWorkAssessment(id, fitToWorkAssessmentId) {
        await this.prisma.withRls((tx) => tx.mcuResult.update({ where: { id }, data: { fitToWorkAssessmentId } }));
    }
    async transitionStatus(id, to) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        const existing = await this.prisma.withRls((tx) => tx.mcuResult.findUniqueOrThrow({ where: { id } }));
        (0, mcu_lifecycle_1.validateMcuResultStatusTransition)(existing.status, to);
        await this.prisma.withRls((tx) => tx.mcuResult.update({ where: { id }, data: { status: to, updatedBy: actorUserId } }));
    }
    async getById(id, siteIdForScope, reasonForAccess, reasonNotes) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const record = await this.prisma.withRls((tx) => tx.mcuResult.findUniqueOrThrow({ where: { id } }));
        await this.accessControl.assertPhiAccessAuthorized({ scopeType: "SITE", scopeId: siteIdForScope });
        await this.accessLog.recordAccess({
            subjectEmployeeUserId: record.employeeUserId,
            accessedEntityType: "MCU_RESULT",
            accessedEntityId: record.id,
            accessType: "VIEW",
            reasonForAccess,
            reasonNotes,
        });
        return this.toDecrypted(tenantId, record);
    }
    async encryptClinicalFields(tenantId, input) {
        const numericEncrypted = await Promise.all(ENCRYPTED_NUMERIC_FIELDS.map((field) => this.fieldEncryption.encrypt(tenantId, input[field] === null || input[field] === undefined ? null : String(input[field]))));
        const [labResultsEncrypted, audiometryResultsEncrypted, spirometryResultsEncrypted, diagnosisCodesEncrypted, radiologyResultsEncrypted, physicianConclusionEncrypted] = await Promise.all([
            this.fieldEncryption.encryptJson(tenantId, input.labResults),
            this.fieldEncryption.encryptJson(tenantId, input.audiometryResults),
            this.fieldEncryption.encryptJson(tenantId, input.spirometryResults),
            this.fieldEncryption.encryptJson(tenantId, input.diagnosisCodes),
            this.fieldEncryption.encrypt(tenantId, input.radiologyResults),
            this.fieldEncryption.encrypt(tenantId, input.physicianConclusion),
        ]);
        return {
            data: {
                heightCmEncrypted: numericEncrypted[0],
                weightKgEncrypted: numericEncrypted[1],
                bmiEncrypted: numericEncrypted[2],
                bloodPressureSystolicEncrypted: numericEncrypted[3],
                bloodPressureDiastolicEncrypted: numericEncrypted[4],
                pulseRateEncrypted: numericEncrypted[5],
                labResultsEncrypted,
                radiologyResultsEncrypted,
                audiometryResultsEncrypted,
                spirometryResultsEncrypted,
                physicianConclusionEncrypted,
                diagnosisCodesEncrypted,
            },
            plain: input,
        };
    }
    async toDecrypted(tenantId, record, plainHint) {
        const { heightCmEncrypted, weightKgEncrypted, bmiEncrypted, bloodPressureSystolicEncrypted, bloodPressureDiastolicEncrypted, pulseRateEncrypted, labResultsEncrypted, radiologyResultsEncrypted, audiometryResultsEncrypted, spirometryResultsEncrypted, physicianConclusionEncrypted, diagnosisCodesEncrypted, ...rest } = record;
        if (plainHint) {
            return {
                ...rest,
                heightCm: plainHint.heightCm ?? null,
                weightKg: plainHint.weightKg ?? null,
                bmi: plainHint.bmi ?? null,
                bloodPressureSystolic: plainHint.bloodPressureSystolic ?? null,
                bloodPressureDiastolic: plainHint.bloodPressureDiastolic ?? null,
                pulseRate: plainHint.pulseRate ?? null,
                labResults: plainHint.labResults ?? null,
                radiologyResults: plainHint.radiologyResults ?? null,
                audiometryResults: plainHint.audiometryResults ?? null,
                spirometryResults: plainHint.spirometryResults ?? null,
                physicianConclusion: plainHint.physicianConclusion ?? null,
                diagnosisCodes: plainHint.diagnosisCodes ?? null,
            };
        }
        const [heightCmRaw, weightKgRaw, bmiRaw, systolicRaw, diastolicRaw, pulseRaw, radiologyResults, physicianConclusion] = await Promise.all([
            this.fieldEncryption.decrypt(tenantId, heightCmEncrypted),
            this.fieldEncryption.decrypt(tenantId, weightKgEncrypted),
            this.fieldEncryption.decrypt(tenantId, bmiEncrypted),
            this.fieldEncryption.decrypt(tenantId, bloodPressureSystolicEncrypted),
            this.fieldEncryption.decrypt(tenantId, bloodPressureDiastolicEncrypted),
            this.fieldEncryption.decrypt(tenantId, pulseRateEncrypted),
            this.fieldEncryption.decrypt(tenantId, radiologyResultsEncrypted),
            this.fieldEncryption.decrypt(tenantId, physicianConclusionEncrypted),
        ]);
        const [labResults, audiometryResults, spirometryResults, diagnosisCodes] = await Promise.all([
            this.fieldEncryption.decryptJson(tenantId, labResultsEncrypted),
            this.fieldEncryption.decryptJson(tenantId, audiometryResultsEncrypted),
            this.fieldEncryption.decryptJson(tenantId, spirometryResultsEncrypted),
            this.fieldEncryption.decryptJson(tenantId, diagnosisCodesEncrypted),
        ]);
        return {
            ...rest,
            heightCm: heightCmRaw === null ? null : Number(heightCmRaw),
            weightKg: weightKgRaw === null ? null : Number(weightKgRaw),
            bmi: bmiRaw === null ? null : Number(bmiRaw),
            bloodPressureSystolic: systolicRaw === null ? null : Number(systolicRaw),
            bloodPressureDiastolic: diastolicRaw === null ? null : Number(diastolicRaw),
            pulseRate: pulseRaw === null ? null : Number(pulseRaw),
            labResults,
            radiologyResults,
            audiometryResults,
            spirometryResults,
            physicianConclusion,
            diagnosisCodes,
        };
    }
};
exports.McuResultService = McuResultService;
exports.McuResultService = McuResultService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        field_encryption_service_1.FieldEncryptionService,
        occupational_health_access_control_service_1.OccupationalHealthAccessControlService,
        medical_record_access_log_service_1.MedicalRecordAccessLogService,
        notification_service_1.NotificationService])
], McuResultService);
