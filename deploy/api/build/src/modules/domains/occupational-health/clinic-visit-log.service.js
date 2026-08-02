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
exports.ClinicVisitLogService = void 0;
const common_1 = require("@nestjs/common");
const field_encryption_service_1 = require("../../../platform/field-encryption/field-encryption.service");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const occupational_health_context_1 = require("./occupational-health-context");
const occupational_health_access_control_service_1 = require("./occupational-health-access-control.service");
const medical_record_access_log_service_1 = require("./medical-record-access-log.service");
const occupational_health_workflow_bootstrap_service_1 = require("./occupational-health-workflow-bootstrap.service");
const CLINIC_VISIT_NUMBERING_MODULE_CODE = "OH_CLINIC_VISIT";
// clinic_visit_logs ADA di enum accessed_entity_type (CLINIC_VISIT) DAN
// literal BR-01 — TAPI employeeUserId NULLABLE (§5: "nullable jika
// pengunjung non-employee"), sementara medical_record_access_logs.
// subjectEmployeeUserId WAJIB FK valid ke users (tidak bisa NULL). Interpretasi
// (gap TDD §26): dual-gate BR-02 + access-log BR-01 HANYA berlaku kalau
// employeeUserId TERISI (kunjungan terkait pekerja platform) — kunjungan
// visitor-only (mis. tamu tanpa akun users) TIDAK PUNYA identitas PHI
// employee dalam pengertian yang dilindungi arsitektur ini (PRD §1
// eksplisit scope "rekam medis KERJA"/"kelaikan KERJA"). Enkripsi BR-05
// TETAP berlaku ke SEMUA baris (encryption != gating, kontrol independen).
let ClinicVisitLogService = class ClinicVisitLogService {
    prisma;
    fieldEncryption;
    accessControl;
    accessLog;
    numberingService;
    bootstrapService;
    constructor(prisma, fieldEncryption, accessControl, accessLog, numberingService, bootstrapService) {
        this.prisma = prisma;
        this.fieldEncryption = fieldEncryption;
        this.accessControl = accessControl;
        this.accessLog = accessLog;
        this.numberingService = numberingService;
        this.bootstrapService = bootstrapService;
    }
    async create(input, reasonForAccess, reasonNotes) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        if (input.employeeUserId) {
            await this.accessControl.assertPhiAccessAuthorized({ scopeType: "SITE", scopeId: input.siteId });
        }
        let visitNumber;
        if (input.generateVisitNumber) {
            await this.bootstrapService.ensureClinicVisitNumberingConfig(input.siteId);
            const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
            visitNumber = await this.numberingService.generateNext(CLINIC_VISIT_NUMBERING_MODULE_CODE, {
                scopeId: input.siteId,
                variables: { SITE_CODE: site.siteCode },
            });
        }
        const [chiefComplaintEncrypted, treatmentGivenEncrypted, referralReasonEncrypted, vitalSignsEncrypted, medicationDispensedEncrypted] = await Promise.all([
            this.fieldEncryption.encrypt(tenantId, input.chiefComplaint),
            this.fieldEncryption.encrypt(tenantId, input.treatmentGiven),
            this.fieldEncryption.encrypt(tenantId, input.referralReason),
            this.fieldEncryption.encryptJson(tenantId, input.vitalSigns),
            this.fieldEncryption.encryptJson(tenantId, input.medicationDispensed),
        ]);
        const record = await this.prisma.withRls((tx) => tx.clinicVisitLog.create({
            data: {
                tenantId,
                siteId: input.siteId,
                visitNumber,
                employeeUserId: input.employeeUserId,
                visitorName: input.visitorName,
                visitorType: input.visitorType,
                visitDatetime: input.visitDatetime,
                visitType: input.visitType,
                chiefComplaintEncrypted,
                vitalSignsEncrypted,
                treatmentGivenEncrypted,
                medicationDispensedEncrypted,
                referralRequired: input.referralRequired ?? false,
                referralFacilityName: input.referralFacilityName,
                referralReasonEncrypted,
                workStatusAfterVisit: input.workStatusAfterVisit,
                linkedIncidentId: input.linkedIncidentId,
                attendedBy: actorUserId,
                status: "OPEN",
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
        if (input.employeeUserId) {
            if (!reasonForAccess) {
                throw new Error("reasonForAccess wajib diisi untuk clinic_visit_logs milik employee (BR-01).");
            }
            await this.accessLog.recordAccess({
                subjectEmployeeUserId: input.employeeUserId,
                accessedEntityType: "CLINIC_VISIT",
                accessedEntityId: record.id,
                accessType: "EDIT",
                reasonForAccess,
                reasonNotes,
            });
        }
        return this.toDecrypted(tenantId, record, {
            chiefComplaint: input.chiefComplaint ?? null,
            treatmentGiven: input.treatmentGiven ?? null,
            referralReason: input.referralReason ?? null,
            vitalSigns: input.vitalSigns ?? null,
            medicationDispensed: input.medicationDispensed ?? null,
        });
    }
    async close(id) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        await this.prisma.withRls((tx) => tx.clinicVisitLog.update({ where: { id }, data: { status: "CLOSED", updatedBy: actorUserId } }));
    }
    async getById(id, reasonForAccess, reasonNotes) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const record = await this.prisma.withRls((tx) => tx.clinicVisitLog.findUniqueOrThrow({ where: { id } }));
        if (record.employeeUserId) {
            await this.accessControl.assertPhiAccessAuthorized({ scopeType: "SITE", scopeId: record.siteId });
            if (!reasonForAccess) {
                throw new Error("reasonForAccess wajib diisi untuk clinic_visit_logs milik employee (BR-01).");
            }
            await this.accessLog.recordAccess({
                subjectEmployeeUserId: record.employeeUserId,
                accessedEntityType: "CLINIC_VISIT",
                accessedEntityId: record.id,
                accessType: "VIEW",
                reasonForAccess,
                reasonNotes,
            });
        }
        return this.toDecrypted(tenantId, record);
    }
    async toDecrypted(tenantId, record, plainHint) {
        const { chiefComplaintEncrypted, vitalSignsEncrypted, treatmentGivenEncrypted, medicationDispensedEncrypted, referralReasonEncrypted, ...rest } = record;
        if (plainHint) {
            return { ...rest, ...plainHint };
        }
        const [chiefComplaint, treatmentGiven, referralReason] = await Promise.all([
            this.fieldEncryption.decrypt(tenantId, chiefComplaintEncrypted),
            this.fieldEncryption.decrypt(tenantId, treatmentGivenEncrypted),
            this.fieldEncryption.decrypt(tenantId, referralReasonEncrypted),
        ]);
        const [vitalSigns, medicationDispensed] = await Promise.all([
            this.fieldEncryption.decryptJson(tenantId, vitalSignsEncrypted),
            this.fieldEncryption.decryptJson(tenantId, medicationDispensedEncrypted),
        ]);
        return { ...rest, chiefComplaint, treatmentGiven, referralReason, vitalSigns, medicationDispensed };
    }
};
exports.ClinicVisitLogService = ClinicVisitLogService;
exports.ClinicVisitLogService = ClinicVisitLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        field_encryption_service_1.FieldEncryptionService,
        occupational_health_access_control_service_1.OccupationalHealthAccessControlService,
        medical_record_access_log_service_1.MedicalRecordAccessLogService,
        numbering_service_1.NumberingService,
        occupational_health_workflow_bootstrap_service_1.OccupationalHealthWorkflowBootstrapService])
], ClinicVisitLogService);
