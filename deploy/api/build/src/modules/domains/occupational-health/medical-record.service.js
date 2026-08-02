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
exports.MedicalRecordService = void 0;
const common_1 = require("@nestjs/common");
const field_encryption_service_1 = require("../../../platform/field-encryption/field-encryption.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const medical_record_access_log_service_1 = require("./medical-record-access-log.service");
const occupational_health_context_1 = require("./occupational-health-context");
const occupational_health_access_control_service_1 = require("./occupational-health-access-control.service");
// Modul 13 §5/§3.1 — service PERTAMA sesi ini yang menggabungkan TIGA
// kontrol sekaligus: dual-gate BR-02 (OccupationalHealthAccessControlService),
// fail-closed access log BR-01 (MedicalRecordAccessLogService, log DULU
// baru decrypt+return — throw di recordAccess() otomatis mencegah return),
// dan enkripsi field-level BR-05 (FieldEncryptionService). Urutan
// getById(): (1) fetch row MENTAH [ciphertext, aman krn belum didekripsi],
// (2) tentukan targetScope dari row, (3) dual-gate check, (4) access log
// (fail-closed), (5) BARU decrypt+return.
let MedicalRecordService = class MedicalRecordService {
    prisma;
    fieldEncryption;
    accessControl;
    accessLog;
    constructor(prisma, fieldEncryption, accessControl, accessLog) {
        this.prisma = prisma;
        this.fieldEncryption = fieldEncryption;
        this.accessControl = accessControl;
        this.accessLog = accessLog;
    }
    async create(input, reasonForAccess, reasonNotes) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        await this.accessControl.assertPhiAccessAuthorized(this.resolveScope({ siteId: input.siteId, companyId: input.companyId }));
        const encrypted = await this.encryptClinicalFields(tenantId, input);
        const record = await this.prisma.withRls((tx) => tx.medicalRecord.create({
            data: {
                tenantId,
                employeeUserId: input.employeeUserId,
                companyId: input.companyId,
                siteId: input.siteId,
                emergencyMedicalContactName: input.emergencyMedicalContactName,
                emergencyMedicalContactPhone: input.emergencyMedicalContactPhone,
                emergencyMedicalContactRelationship: input.emergencyMedicalContactRelationship,
                consentId: input.consentId,
                lastUpdatedByPractitioner: actorUserId,
                recordStatus: "ACTIVE",
                createdBy: actorUserId,
                updatedBy: actorUserId,
                ...encrypted.data,
            },
        }));
        // Penulisan (BUKAN cakupan literal BR-01 "VIEW/EXPORT/PRINT") TETAP
        // dicatat (accessType EDIT, nilai enum yang SUDAH ada di skema) demi
        // jejak audit PHI yang lengkap — generalisasi wajar, bukan invented BR baru.
        await this.accessLog.recordAccess({
            subjectEmployeeUserId: input.employeeUserId,
            accessedEntityType: "MEDICAL_RECORD",
            accessedEntityId: record.id,
            accessType: "EDIT",
            reasonForAccess,
            reasonNotes,
        });
        return this.toDecrypted(tenantId, record, encrypted.plain.immunizationHistory);
    }
    async update(id, input, reasonForAccess, reasonNotes) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        const existing = await this.prisma.withRls((tx) => tx.medicalRecord.findUniqueOrThrow({ where: { id } }));
        await this.accessControl.assertPhiAccessAuthorized(this.resolveScope(existing));
        const encrypted = await this.encryptClinicalFields(tenantId, input);
        const record = await this.prisma.withRls((tx) => tx.medicalRecord.update({
            where: { id },
            data: {
                emergencyMedicalContactName: input.emergencyMedicalContactName,
                emergencyMedicalContactPhone: input.emergencyMedicalContactPhone,
                emergencyMedicalContactRelationship: input.emergencyMedicalContactRelationship,
                consentId: input.consentId,
                lastUpdatedByPractitioner: actorUserId,
                updatedBy: actorUserId,
                ...encrypted.data,
            },
        }));
        await this.accessLog.recordAccess({
            subjectEmployeeUserId: record.employeeUserId,
            accessedEntityType: "MEDICAL_RECORD",
            accessedEntityId: record.id,
            accessType: "EDIT",
            reasonForAccess,
            reasonNotes,
        });
        return this.toDecrypted(tenantId, record, encrypted.plain.immunizationHistory);
    }
    async getById(id, reasonForAccess, reasonNotes) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const record = await this.prisma.withRls((tx) => tx.medicalRecord.findUniqueOrThrow({ where: { id } }));
        await this.accessControl.assertPhiAccessAuthorized(this.resolveScope(record));
        // BR-01 fail-closed — log WAJIB berhasil SEBELUM decrypt/return di bawah.
        await this.accessLog.recordAccess({
            subjectEmployeeUserId: record.employeeUserId,
            accessedEntityType: "MEDICAL_RECORD",
            accessedEntityId: record.id,
            accessType: "VIEW",
            reasonForAccess,
            reasonNotes,
        });
        return this.toDecrypted(tenantId, record);
    }
    async getByEmployeeUserId(employeeUserId, reasonForAccess, reasonNotes) {
        const record = await this.prisma.withRls((tx) => tx.medicalRecord.findUnique({ where: { employeeUserId } }));
        if (!record) {
            return null;
        }
        return this.getById(record.id, reasonForAccess, reasonNotes);
    }
    resolveScope(row) {
        if (row.siteId) {
            return { scopeType: "SITE", scopeId: row.siteId };
        }
        return { scopeType: "COMPANY", scopeId: row.companyId };
    }
    async encryptClinicalFields(tenantId, input) {
        const [bloodTypeEncrypted, knownAllergiesEncrypted, chronicConditionsEncrypted, currentMedicationsEncrypted, disabilityStatusEncrypted, baselineHealthNotesEncrypted, immunizationHistoryEncrypted,] = await Promise.all([
            this.fieldEncryption.encrypt(tenantId, input.bloodType),
            this.fieldEncryption.encrypt(tenantId, input.knownAllergies),
            this.fieldEncryption.encrypt(tenantId, input.chronicConditions),
            this.fieldEncryption.encrypt(tenantId, input.currentMedications),
            this.fieldEncryption.encrypt(tenantId, input.disabilityStatus),
            this.fieldEncryption.encrypt(tenantId, input.baselineHealthNotes),
            this.fieldEncryption.encryptJson(tenantId, input.immunizationHistory),
        ]);
        return {
            // HANYA kolom *_encrypted asli — di-spread LANGSUNG ke Prisma `data:`
            // di create()/update(), TIDAK BOLEH memuat key selain kolom tabel
            // sungguhan (pola sama McuResultService.encryptClinicalFields()).
            data: {
                bloodTypeEncrypted,
                knownAllergiesEncrypted,
                chronicConditionsEncrypted,
                currentMedicationsEncrypted,
                disabilityStatusEncrypted,
                baselineHealthNotesEncrypted,
                immunizationHistoryEncrypted,
            },
            plain: { immunizationHistory: input.immunizationHistory ?? null },
        };
    }
    async toDecrypted(tenantId, record, immunizationHistoryHint) {
        const { bloodTypeEncrypted, knownAllergiesEncrypted, chronicConditionsEncrypted, currentMedicationsEncrypted, disabilityStatusEncrypted, immunizationHistoryEncrypted, baselineHealthNotesEncrypted, ...rest } = record;
        const [bloodType, knownAllergies, chronicConditions, currentMedications, disabilityStatus, baselineHealthNotes] = await Promise.all([
            this.fieldEncryption.decrypt(tenantId, bloodTypeEncrypted),
            this.fieldEncryption.decrypt(tenantId, knownAllergiesEncrypted),
            this.fieldEncryption.decrypt(tenantId, chronicConditionsEncrypted),
            this.fieldEncryption.decrypt(tenantId, currentMedicationsEncrypted),
            this.fieldEncryption.decrypt(tenantId, disabilityStatusEncrypted),
            this.fieldEncryption.decrypt(tenantId, baselineHealthNotesEncrypted),
        ]);
        const immunizationHistory = immunizationHistoryHint !== undefined
            ? immunizationHistoryHint
            : await this.fieldEncryption.decryptJson(tenantId, immunizationHistoryEncrypted);
        return {
            ...rest,
            bloodType,
            knownAllergies,
            chronicConditions,
            currentMedications,
            disabilityStatus,
            immunizationHistory,
            baselineHealthNotes,
        };
    }
};
exports.MedicalRecordService = MedicalRecordService;
exports.MedicalRecordService = MedicalRecordService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        field_encryption_service_1.FieldEncryptionService,
        occupational_health_access_control_service_1.OccupationalHealthAccessControlService,
        medical_record_access_log_service_1.MedicalRecordAccessLogService])
], MedicalRecordService);
