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
exports.OccupationalDiseaseCaseService = void 0;
const common_1 = require("@nestjs/common");
const field_encryption_service_1 = require("../../../platform/field-encryption/field-encryption.service");
const notification_service_1 = require("../../../platform/notification/notification.service");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const pak_case_lifecycle_1 = require("./pak-case-lifecycle");
const occupational_health_context_1 = require("./occupational-health-context");
const occupational_health_access_control_service_1 = require("./occupational-health-access-control.service");
const medical_record_access_log_service_1 = require("./medical-record-access-log.service");
const occupational_health_workflow_bootstrap_service_1 = require("./occupational-health-workflow-bootstrap.service");
const PAK_NUMBERING_MODULE_CODE = "OH_PAK";
const PAK_CASE_WORKFLOW_ENTITY_TYPE = "occupational_disease_case";
// PRD §4.3 — occupational_disease_cases ADA di enum accessed_entity_type
// (PAK_CASE) DAN literal BR-01 -- dual-gate + access-log PENUH. BR-10
// (deskripsi CAPA sistemik) TIDAK bisa ditegakkan dari sini (field bebas-
// teks CapaRegister.problemStatement, modul ini tidak kontrol isinya) —
// linkCapaRegister() TETAP caller-supplied manual (PRD §4.3 poin 4 TIDAK
// pernah menulis "otomatis", BEDA literal dari Environmental BR-02).
let OccupationalDiseaseCaseService = class OccupationalDiseaseCaseService {
    prisma;
    fieldEncryption;
    accessControl;
    accessLog;
    numberingService;
    bootstrapService;
    workflowEngineService;
    notificationService;
    constructor(prisma, fieldEncryption, accessControl, accessLog, numberingService, bootstrapService, workflowEngineService, notificationService) {
        this.prisma = prisma;
        this.fieldEncryption = fieldEncryption;
        this.accessControl = accessControl;
        this.accessLog = accessLog;
        this.numberingService = numberingService;
        this.bootstrapService = bootstrapService;
        this.workflowEngineService = workflowEngineService;
        this.notificationService = notificationService;
    }
    async create(input, reasonForAccess, reasonNotes) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        await this.accessControl.assertPhiAccessAuthorized({ scopeType: "SITE", scopeId: input.siteId });
        await this.bootstrapService.ensurePakNumberingConfig(input.siteId);
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
        const caseNumber = await this.numberingService.generateNext(PAK_NUMBERING_MODULE_CODE, {
            scopeId: input.siteId,
            variables: { SITE_CODE: site.siteCode },
        });
        const [diagnosisDetailEncrypted, suspectedCausalAgentExposureEncrypted] = await Promise.all([
            this.fieldEncryption.encrypt(tenantId, input.diagnosisDetail),
            this.fieldEncryption.encrypt(tenantId, input.suspectedCausalAgentExposure),
        ]);
        const record = await this.prisma.withRls((tx) => tx.occupationalDiseaseCase.create({
            data: {
                tenantId,
                siteId: input.siteId,
                departmentId: input.departmentId,
                caseNumber,
                employeeUserId: input.employeeUserId,
                diagnosisDate: input.diagnosisDate,
                diagnosedBy: input.diagnosedBy,
                diseaseCategory: input.diseaseCategory,
                diagnosisDetailEncrypted,
                suspectedCausalAgentExposureEncrypted,
                relatedHiraId: input.relatedHiraId,
                relatedEnvironmentalMonitoringRecordId: input.relatedEnvironmentalMonitoringRecordId,
                severityClassification: input.severityClassification,
                workRelatednessDetermination: "UNDER_INVESTIGATION",
                caseStatus: "OPEN",
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
        await this.accessLog.recordAccess({
            subjectEmployeeUserId: input.employeeUserId,
            accessedEntityType: "PAK_CASE",
            accessedEntityId: record.id,
            accessType: "EDIT",
            reasonForAccess,
            reasonNotes,
        });
        // BR-08 — eskalasi ke Top Management, ringkasan AGREGAT/non-identifiable
        // (kategori & site SAJA, TIDAK PERNAH employeeUserId/nama) DAN ke OH
        // Staff (detail penuh, PRD §8 baris 4 "detail penuh hanya OH Staff") —
        // DUA event type TERPISAH (bukan satu event dgn variables berbeda) demi
        // BR-03/§3.1 structural: recipient Top Management TIDAK PERNAH menerima
        // payload yang secara teknis BISA memuat employeeUserId. Dicek+dikirim
        // LANGSUNG di sini (pola sama Environmental "SIGNIFICANT tanpa kontrol"
        // 5.2), bukan scan job terjadwal (PRD tidak beri timing lain).
        if ((0, pak_case_lifecycle_1.requiresTopManagementEscalation)(input.severityClassification)) {
            const topManagement = await this.prisma.withRls((tx) => tx.user.findMany({ where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "COMPANY_ADMIN" } } } }, select: { id: true } }));
            for (const recipient of topManagement) {
                await this.notificationService.enqueue({
                    eventType: "OCCUPATIONAL_HEALTH_PAK_CASE_SEVERE_AGGREGATE",
                    entityType: "PAK_CASE",
                    entityId: record.id,
                    recipientUserId: recipient.id,
                    priority: "CRITICAL",
                    eventCategory: "OCCUPATIONAL_HEALTH",
                    variables: { severityClassification: input.severityClassification, siteId: input.siteId },
                });
            }
            const ohStaff = await this.prisma.withRls((tx) => tx.user.findMany({ where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "OCCUPATIONAL_HEALTH_STAFF" } } } }, select: { id: true } }));
            for (const recipient of ohStaff) {
                await this.notificationService.enqueue({
                    eventType: "OCCUPATIONAL_HEALTH_PAK_CASE_SEVERE_DETAIL",
                    entityType: "PAK_CASE",
                    entityId: record.id,
                    recipientUserId: recipient.id,
                    priority: "CRITICAL",
                    eventCategory: "OCCUPATIONAL_HEALTH",
                    variables: { severityClassification: input.severityClassification, siteId: input.siteId, caseNumber: record.caseNumber, diseaseCategory: input.diseaseCategory },
                });
            }
        }
        return this.toDecrypted(tenantId, record, {
            diagnosisDetail: input.diagnosisDetail ?? null,
            suspectedCausalAgentExposure: input.suspectedCausalAgentExposure ?? null,
        });
    }
    async submitForReview(id) {
        const actorId = (0, occupational_health_context_1.requireActorUserId)();
        const existing = await this.prisma.withRls((tx) => tx.occupationalDiseaseCase.findUniqueOrThrow({ where: { id } }));
        if (existing.workflowInstanceId) {
            throw new Error("occupational_disease_cases sudah punya workflow_instance aktif — tunggu hasil review sebelum submit ulang.");
        }
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensurePakCaseWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(PAK_CASE_WORKFLOW_ENTITY_TYPE, id, definition.id, {});
        await this.prisma.withRls((tx) => tx.occupationalDiseaseCase.update({ where: { id }, data: { workflowInstanceId: instance.id, updatedBy: actorId } }));
    }
    /** Dipanggil OccupationalDiseaseCaseWorkflowCompletionListener — review
     * (konfirmasi diagnosis + systemic risk) selesai, TIDAK mengubah
     * case_status (itu concern terpisah, perjalanan klinis nyata pasien,
     * ditegakkan transitionStatus() langsung oleh OH Staff). */
    async markReviewCompleted(id) {
        await this.prisma.withRls((tx) => tx.occupationalDiseaseCase.update({ where: { id }, data: { workflowInstanceId: null } }));
    }
    async recordWorkRelatednessDetermination(id, determination) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        await this.prisma.withRls((tx) => tx.occupationalDiseaseCase.update({ where: { id }, data: { workRelatednessDetermination: determination, updatedBy: actorUserId } }));
    }
    async recordDisnakerReport(id, reportDate, reportNumber) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        await this.prisma.withRls((tx) => tx.occupationalDiseaseCase.update({
            where: { id },
            data: { reportedToDisnaker: true, disnakerReportDate: reportDate, disnakerReportNumber: reportNumber, updatedBy: actorUserId },
        }));
    }
    async recordBpjsClaimNumber(id, claimNumber) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        await this.prisma.withRls((tx) => tx.occupationalDiseaseCase.update({ where: { id }, data: { bpjsKetenagakerjaanClaimNumber: claimNumber, updatedBy: actorUserId } }));
    }
    /** BR-10 — link MANUAL (caller sudah CapaRegisterService.create({sourceType:
     * "OCCUPATIONAL_DISEASE_CASE",...}) sendiri, deskripsi WAJIB sistemik/
     * non-identifiable — didisiplinkan proses/UI, TIDAK bisa dipaksa dari sini). */
    async linkCapaRegister(id, capaRegisterId) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        await this.prisma.withRls((tx) => tx.occupationalDiseaseCase.update({ where: { id }, data: { capaRegisterId, updatedBy: actorUserId } }));
    }
    async transitionStatus(id, to) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        const existing = await this.prisma.withRls((tx) => tx.occupationalDiseaseCase.findUniqueOrThrow({ where: { id } }));
        (0, pak_case_lifecycle_1.validatePakCaseStatusTransition)(existing.caseStatus, to);
        const closedDate = to === "CLOSED" ? new Date() : undefined;
        await this.prisma.withRls((tx) => tx.occupationalDiseaseCase.update({ where: { id }, data: { caseStatus: to, closedDate, updatedBy: actorUserId } }));
    }
    async getById(id, reasonForAccess, reasonNotes) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const record = await this.prisma.withRls((tx) => tx.occupationalDiseaseCase.findUniqueOrThrow({ where: { id } }));
        await this.accessControl.assertPhiAccessAuthorized({ scopeType: "SITE", scopeId: record.siteId });
        await this.accessLog.recordAccess({
            subjectEmployeeUserId: record.employeeUserId,
            accessedEntityType: "PAK_CASE",
            accessedEntityId: record.id,
            accessType: "VIEW",
            reasonForAccess,
            reasonNotes,
        });
        return this.toDecrypted(tenantId, record);
    }
    async toDecrypted(tenantId, record, plainHint) {
        const { diagnosisDetailEncrypted, suspectedCausalAgentExposureEncrypted, ...rest } = record;
        if (plainHint) {
            return { ...rest, ...plainHint };
        }
        const [diagnosisDetail, suspectedCausalAgentExposure] = await Promise.all([
            this.fieldEncryption.decrypt(tenantId, diagnosisDetailEncrypted),
            this.fieldEncryption.decrypt(tenantId, suspectedCausalAgentExposureEncrypted),
        ]);
        return { ...rest, diagnosisDetail, suspectedCausalAgentExposure };
    }
};
exports.OccupationalDiseaseCaseService = OccupationalDiseaseCaseService;
exports.OccupationalDiseaseCaseService = OccupationalDiseaseCaseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        field_encryption_service_1.FieldEncryptionService,
        occupational_health_access_control_service_1.OccupationalHealthAccessControlService,
        medical_record_access_log_service_1.MedicalRecordAccessLogService,
        numbering_service_1.NumberingService,
        occupational_health_workflow_bootstrap_service_1.OccupationalHealthWorkflowBootstrapService,
        workflow_engine_service_1.WorkflowEngineService,
        notification_service_1.NotificationService])
], OccupationalDiseaseCaseService);
