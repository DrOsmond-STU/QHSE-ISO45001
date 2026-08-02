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
exports.HealthDataSubjectRequestService = void 0;
const common_1 = require("@nestjs/common");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const consent_and_subject_request_rules_1 = require("./consent-and-subject-request-rules");
const occupational_health_context_1 = require("./occupational-health-context");
// PRD §4.6/§6 BR-06. processErasure() SENGAJA TIDAK melalui dual-gate BR-02/
// access-log BR-01 — operasi ini TIDAK PERNAH mendekripsi/merender konten
// PHI ke pemanggil (hanya menulis NULL ke kolom [ENCRYPTED] + status), jadi
// tidak ada risiko "PHI bocor ke viewer tidak berwenang" yang jadi alasan
// dual-gate ada — konsisten dgn RBAC baseline PRD §3.2 yang HANYA kasih
// DPO/Compliance Officer subject_request.handle + access_log.view, TANPA
// read_phi/write (role ini secara desain tidak perlu "melihat" PHI utk
// menghapusnya).
let HealthDataSubjectRequestService = class HealthDataSubjectRequestService {
    prisma;
    notificationService;
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async submit(input) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        const request = await this.prisma.withRls((tx) => tx.healthDataSubjectRequest.create({
            data: {
                tenantId,
                employeeUserId: input.employeeUserId,
                requestType: input.requestType,
                requestDate: new Date(),
                requestDetail: input.requestDetail,
                handledBy: actorUserId,
                status: "SUBMITTED",
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
        // PRD §8 baris 6 — "health_data_subject_requests baru diajukan -> OH
        // Staff/DPO."
        const recipients = await this.prisma.withRls((tx) => tx.user.findMany({
            where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: { in: ["OCCUPATIONAL_HEALTH_STAFF", "COMPLIANCE_OFFICER"] } } } } },
            select: { id: true },
        }));
        for (const recipient of recipients) {
            await this.notificationService.enqueue({
                eventType: "OCCUPATIONAL_HEALTH_SUBJECT_REQUEST_SUBMITTED",
                entityType: "HEALTH_DATA_SUBJECT_REQUEST",
                entityId: request.id,
                recipientUserId: recipient.id,
                priority: "MEDIUM",
                eventCategory: "OCCUPATIONAL_HEALTH",
                variables: { requestType: input.requestType },
            });
        }
        return request;
    }
    async beginReview(id) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.healthDataSubjectRequest.update({ where: { id }, data: { status: "IN_REVIEW", updatedBy: actorUserId } }));
    }
    /** BR-06 — SATU-SATUNYA jalur pemrosesan ERASURE_ANONYMIZATION. Kalau
     * request_type BUKAN ERASURE_ANONYMIZATION, gunakan approve()/reject()/
     * complete() manual (ACCESS_COPY/CORRECTION/PROCESSING_RESTRICTION tidak
     * punya prosedur otomatis — ditangani proses manual OH Staff/DPO). */
    async processErasure(id, minimumRetentionDaysOverride) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        const request = await this.prisma.withRls((tx) => tx.healthDataSubjectRequest.findUniqueOrThrow({ where: { id } }));
        if (request.requestType !== "ERASURE_ANONYMIZATION") {
            throw new Error(`processErasure() hanya berlaku utk request_type=ERASURE_ANONYMIZATION, bukan ${request.requestType}.`);
        }
        const medicalRecord = await this.prisma.withRls((tx) => tx.medicalRecord.findUnique({ where: { employeeUserId: request.employeeUserId } }));
        const lastRecordActivityDate = medicalRecord?.updatedAt ?? request.requestDate;
        const eligibility = (0, consent_and_subject_request_rules_1.canProcessErasureRequest)({
            lastRecordActivityDate,
            requestDate: request.requestDate,
            minimumRetentionDays: minimumRetentionDaysOverride,
        });
        if (!eligibility.eligible) {
            return this.prisma.withRls((tx) => tx.healthDataSubjectRequest.update({
                where: { id },
                data: { status: "REJECTED", rejectionReason: eligibility.rejectionReason, resolutionDate: new Date(), updatedBy: actorUserId },
            }));
        }
        if (medicalRecord) {
            await this.prisma.withRls((tx) => tx.medicalRecord.update({
                where: { id: medicalRecord.id },
                data: {
                    bloodTypeEncrypted: null,
                    knownAllergiesEncrypted: null,
                    chronicConditionsEncrypted: null,
                    currentMedicationsEncrypted: null,
                    disabilityStatusEncrypted: null,
                    immunizationHistoryEncrypted: null,
                    baselineHealthNotesEncrypted: null,
                    emergencyMedicalContactName: null,
                    emergencyMedicalContactPhone: null,
                    emergencyMedicalContactRelationship: null,
                    recordStatus: "ANONYMIZED",
                    updatedBy: actorUserId,
                },
            }));
        }
        return this.prisma.withRls((tx) => tx.healthDataSubjectRequest.update({
            where: { id },
            data: {
                status: "COMPLETED",
                resolutionNotes: "Data medical_records dianonimkan sesuai BR-06 (bukan hard-delete).",
                resolutionDate: new Date(),
                updatedBy: actorUserId,
            },
        }));
    }
    async approve(id, resolutionNotes) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.healthDataSubjectRequest.update({ where: { id }, data: { status: "APPROVED", resolutionNotes, updatedBy: actorUserId } }));
    }
    async reject(id, rejectionReason) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.healthDataSubjectRequest.update({
            where: { id },
            data: { status: "REJECTED", rejectionReason, resolutionDate: new Date(), updatedBy: actorUserId },
        }));
    }
    async complete(id, resolutionNotes) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.healthDataSubjectRequest.update({
            where: { id },
            data: { status: "COMPLETED", resolutionNotes, resolutionDate: new Date(), updatedBy: actorUserId },
        }));
    }
    async getById(id) {
        return this.prisma.withRls((tx) => tx.healthDataSubjectRequest.findUniqueOrThrow({ where: { id } }));
    }
    async listByEmployee(employeeUserId) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.healthDataSubjectRequest.findMany({ where: { tenantId, employeeUserId }, orderBy: { requestDate: "desc" } }));
    }
};
exports.HealthDataSubjectRequestService = HealthDataSubjectRequestService;
exports.HealthDataSubjectRequestService = HealthDataSubjectRequestService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], HealthDataSubjectRequestService);
//# sourceMappingURL=health-data-subject-request.service.js.map