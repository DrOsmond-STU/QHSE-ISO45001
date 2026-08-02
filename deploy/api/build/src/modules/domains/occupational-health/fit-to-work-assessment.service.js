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
exports.FitToWorkAssessmentService = void 0;
const common_1 = require("@nestjs/common");
const field_encryption_service_1 = require("../../../platform/field-encryption/field-encryption.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const fit_to_work_lifecycle_1 = require("./fit-to-work-lifecycle");
const occupational_health_context_1 = require("./occupational-health-context");
const occupational_health_access_control_service_1 = require("./occupational-health-access-control.service");
const medical_record_access_log_service_1 = require("./medical-record-access-log.service");
// PRD §4.2 — TIDAK memakai Workflow Engine (otoritas tunggal dokter/
// paramedis). restrictionDetails [ENCRYPTED] + dual-gate/access-log PENUH
// (fit_to_work_assessments ADA di enum accessed_entity_type). restriction
// SummaryForSupervisor SENGAJA boundary field terpisah — lihat
// getSummaryForSupervisor() di bawah, method TERPISAH yang TIDAK PERNAH
// menyentuh restrictionDetailsEncrypted sama sekali (BR-04 structural).
let FitToWorkAssessmentService = class FitToWorkAssessmentService {
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
        await this.accessControl.assertPhiAccessAuthorized({ scopeType: "SITE", scopeId: input.siteId });
        const restrictionDetailsEncrypted = await this.fieldEncryption.encrypt(tenantId, input.restrictionDetails);
        const record = await this.prisma.withRls((tx) => tx.fitToWorkAssessment.create({
            data: {
                tenantId,
                siteId: input.siteId,
                departmentId: input.departmentId,
                employeeUserId: input.employeeUserId,
                assessmentDate: input.assessmentDate,
                assessmentTrigger: input.assessmentTrigger,
                relatedMcuResultId: input.relatedMcuResultId,
                assessedBy: actorUserId,
                fitStatus: input.fitStatus,
                restrictionDetailsEncrypted,
                restrictionSummaryForSupervisor: input.restrictionSummaryForSupervisor,
                restrictionValidFrom: input.restrictionValidFrom,
                restrictionValidUntil: input.restrictionValidUntil,
                nextReassessmentDate: input.nextReassessmentDate,
                status: "ACTIVE",
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
        await this.accessLog.recordAccess({
            subjectEmployeeUserId: input.employeeUserId,
            accessedEntityType: "FIT_TO_WORK_ASSESSMENT",
            accessedEntityId: record.id,
            accessType: "EDIT",
            reasonForAccess,
            reasonNotes,
        });
        // PRD §8 baris 3 — "fit_to_work_assessments baru terbit -> Karyawan
        // bersangkutan, Supervisor (HANYA restriction_summary_for_supervisor)."
        // SATU set variables dipakai KEDUA penerima (renderTemplate() strict:
        // true, wajib SEMUA variabel template disuplai tiap enqueue() — lihat
        // notification-template.ts) — restrictionSummaryForSupervisor SENGAJA
        // aman utk karyawan sendiri juga lihat (ini boundary field NON-klinis,
        // BR-04 structural tetap tegak krn restrictionDetails TIDAK PERNAH
        // masuk variables ini sama sekali).
        const sharedVariables = { fitStatus: input.fitStatus, restrictionSummaryForSupervisor: input.restrictionSummaryForSupervisor ?? "" };
        await this.notificationService.enqueue({
            eventType: "OCCUPATIONAL_HEALTH_FIT_TO_WORK_UPDATED",
            entityType: "FIT_TO_WORK_ASSESSMENT",
            entityId: record.id,
            recipientUserId: input.employeeUserId,
            priority: "MEDIUM",
            eventCategory: "OCCUPATIONAL_HEALTH",
            variables: sharedVariables,
        });
        if (input.departmentId) {
            const supervisors = await this.prisma.withRls((tx) => tx.user.findMany({
                where: { tenantId, status: "ACTIVE", departmentId: input.departmentId, userRoles: { some: { role: { roleCode: { in: ["SUPERVISOR", "DEPARTMENT_HEAD"] } } } } },
                select: { id: true },
            }));
            for (const supervisor of supervisors) {
                await this.notificationService.enqueue({
                    eventType: "OCCUPATIONAL_HEALTH_FIT_TO_WORK_UPDATED",
                    entityType: "FIT_TO_WORK_ASSESSMENT",
                    entityId: record.id,
                    recipientUserId: supervisor.id,
                    priority: "MEDIUM",
                    eventCategory: "OCCUPATIONAL_HEALTH",
                    variables: sharedVariables,
                });
            }
        }
        return this.toDecrypted(tenantId, record, input.restrictionDetails ?? null);
    }
    /** true kalau assessment ini WAJIB menghasilkan restricted_duty_assignments
     * (PRD §4.2 poin 3) — caller (mis. RestrictedDutyAssignmentService.create()
     * dipanggil Supervisor/Dept Head terpisah) yang bertindak atas info ini,
     * method ini TIDAK auto-create (assignment butuh assignedBy Supervisor +
     * alternative_task_description operasional yang bukan wewenang dokter). */
    requiresRestrictedDuty(fitStatus) {
        return (0, fit_to_work_lifecycle_1.requiresRestrictedDutyAssignment)(fitStatus);
    }
    async linkRestrictedDutyAssignment(id, restrictedDutyAssignmentId) {
        await this.prisma.withRls((tx) => tx.fitToWorkAssessment.update({ where: { id }, data: { linkedRestrictedDutyAssignmentId: restrictedDutyAssignmentId } }));
    }
    async transitionStatus(id, to) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        const existing = await this.prisma.withRls((tx) => tx.fitToWorkAssessment.findUniqueOrThrow({ where: { id } }));
        (0, fit_to_work_lifecycle_1.validateFitToWorkAssessmentStatusTransition)(existing.status, to);
        await this.prisma.withRls((tx) => tx.fitToWorkAssessment.update({ where: { id }, data: { status: to, updatedBy: actorUserId } }));
    }
    async getById(id, reasonForAccess, reasonNotes) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const record = await this.prisma.withRls((tx) => tx.fitToWorkAssessment.findUniqueOrThrow({ where: { id } }));
        await this.accessControl.assertPhiAccessAuthorized({ scopeType: "SITE", scopeId: record.siteId });
        await this.accessLog.recordAccess({
            subjectEmployeeUserId: record.employeeUserId,
            accessedEntityType: "FIT_TO_WORK_ASSESSMENT",
            accessedEntityId: record.id,
            accessType: "VIEW",
            reasonForAccess,
            reasonNotes,
        });
        return this.toDecrypted(tenantId, record);
    }
    /** BR-04 — boundary field. TIDAK memerlukan dual-gate BR-02/access-log
     * BR-01 (bukan data klinis mentah), TIDAK PERNAH fetch
     * restrictionDetailsEncrypted sama sekali (query eksplisit `select`,
     * bukan cuma "diabaikan setelah fetch" — kolom itu TIDAK ADA di hasil
     * query DB sama sekali). Dipakai Department Head/Supervisor
     * (occupational_health.fit_to_work.view_summary). */
    async getSummaryForSupervisor(id) {
        return this.prisma.withRls((tx) => tx.fitToWorkAssessment.findUniqueOrThrow({
            where: { id },
            select: {
                id: true,
                employeeUserId: true,
                fitStatus: true,
                restrictionSummaryForSupervisor: true,
                restrictionValidFrom: true,
                restrictionValidUntil: true,
                nextReassessmentDate: true,
                status: true,
            },
        }));
    }
    async listDueForReassessment(asOfDate) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.fitToWorkAssessment.findMany({
            where: { tenantId, status: "ACTIVE", nextReassessmentDate: { lte: asOfDate }, reassessmentReminderSentAt: null },
        }));
    }
    async markReassessmentReminderSent(id, sentAt) {
        await this.prisma.withRls((tx) => tx.fitToWorkAssessment.update({ where: { id }, data: { reassessmentReminderSentAt: sentAt } }));
    }
    async toDecrypted(tenantId, record, restrictionDetailsHint) {
        const { restrictionDetailsEncrypted, ...rest } = record;
        const restrictionDetails = restrictionDetailsHint !== undefined ? restrictionDetailsHint : await this.fieldEncryption.decrypt(tenantId, restrictionDetailsEncrypted);
        return { ...rest, restrictionDetails };
    }
};
exports.FitToWorkAssessmentService = FitToWorkAssessmentService;
exports.FitToWorkAssessmentService = FitToWorkAssessmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        field_encryption_service_1.FieldEncryptionService,
        occupational_health_access_control_service_1.OccupationalHealthAccessControlService,
        medical_record_access_log_service_1.MedicalRecordAccessLogService,
        notification_service_1.NotificationService])
], FitToWorkAssessmentService);
