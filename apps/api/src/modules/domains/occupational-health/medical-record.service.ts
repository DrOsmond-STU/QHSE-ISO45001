import { Injectable } from "@nestjs/common";
import { MedicalRecord, OhAccessReason } from "@prisma/client";
import { FieldEncryptionService } from "../../../platform/field-encryption/field-encryption.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { MedicalRecordAccessLogService } from "./medical-record-access-log.service";
import { requireActorUserId, requireTenantId } from "./occupational-health-context";
import { OccupationalHealthAccessControlService, PhiAccessTargetScope } from "./occupational-health-access-control.service";

export interface ImmunizationEntry {
  vaccineName: string;
  date: string;
}

export interface MedicalRecordClinicalFields {
  bloodType?: string | null;
  knownAllergies?: string | null;
  chronicConditions?: string | null;
  currentMedications?: string | null;
  disabilityStatus?: string | null;
  immunizationHistory?: ImmunizationEntry[] | null;
  baselineHealthNotes?: string | null;
}

export interface CreateMedicalRecordInput extends MedicalRecordClinicalFields {
  employeeUserId: string;
  companyId: string;
  siteId?: string;
  emergencyMedicalContactName?: string;
  emergencyMedicalContactPhone?: string;
  emergencyMedicalContactRelationship?: string;
  consentId?: string;
}

export type UpdateMedicalRecordInput = MedicalRecordClinicalFields & {
  emergencyMedicalContactName?: string;
  emergencyMedicalContactPhone?: string;
  emergencyMedicalContactRelationship?: string;
  consentId?: string;
};

export type DecryptedMedicalRecord = Omit<
  MedicalRecord,
  | "bloodTypeEncrypted"
  | "knownAllergiesEncrypted"
  | "chronicConditionsEncrypted"
  | "currentMedicationsEncrypted"
  | "disabilityStatusEncrypted"
  | "immunizationHistoryEncrypted"
  | "baselineHealthNotesEncrypted"
> & {
  bloodType: string | null;
  knownAllergies: string | null;
  chronicConditions: string | null;
  currentMedications: string | null;
  disabilityStatus: string | null;
  immunizationHistory: ImmunizationEntry[] | null;
  baselineHealthNotes: string | null;
};

// Modul 13 §5/§3.1 — service PERTAMA sesi ini yang menggabungkan TIGA
// kontrol sekaligus: dual-gate BR-02 (OccupationalHealthAccessControlService),
// fail-closed access log BR-01 (MedicalRecordAccessLogService, log DULU
// baru decrypt+return — throw di recordAccess() otomatis mencegah return),
// dan enkripsi field-level BR-05 (FieldEncryptionService). Urutan
// getById(): (1) fetch row MENTAH [ciphertext, aman krn belum didekripsi],
// (2) tentukan targetScope dari row, (3) dual-gate check, (4) access log
// (fail-closed), (5) BARU decrypt+return.
@Injectable()
export class MedicalRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fieldEncryption: FieldEncryptionService,
    private readonly accessControl: OccupationalHealthAccessControlService,
    private readonly accessLog: MedicalRecordAccessLogService,
  ) {}

  async create(input: CreateMedicalRecordInput, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedMedicalRecord> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    await this.accessControl.assertPhiAccessAuthorized(this.resolveScope({ siteId: input.siteId, companyId: input.companyId }));

    const encrypted = await this.encryptClinicalFields(tenantId, input);

    const record = await this.prisma.withRls((tx) =>
      tx.medicalRecord.create({
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
      }),
    );

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

  async update(id: string, input: UpdateMedicalRecordInput, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedMedicalRecord> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    const existing = await this.prisma.withRls((tx) => tx.medicalRecord.findUniqueOrThrow({ where: { id } }));
    await this.accessControl.assertPhiAccessAuthorized(this.resolveScope(existing));

    const encrypted = await this.encryptClinicalFields(tenantId, input);

    const record = await this.prisma.withRls((tx) =>
      tx.medicalRecord.update({
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
      }),
    );

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

  async getById(id: string, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedMedicalRecord> {
    const tenantId = requireTenantId();
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

  async getByEmployeeUserId(employeeUserId: string, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedMedicalRecord | null> {
    const record = await this.prisma.withRls((tx) => tx.medicalRecord.findUnique({ where: { employeeUserId } }));
    if (!record) {
      return null;
    }
    return this.getById(record.id, reasonForAccess, reasonNotes);
  }

  private resolveScope(row: { siteId?: string | null; companyId: string }): PhiAccessTargetScope {
    if (row.siteId) {
      return { scopeType: "SITE", scopeId: row.siteId };
    }
    return { scopeType: "COMPANY", scopeId: row.companyId };
  }

  private async encryptClinicalFields(tenantId: string, input: MedicalRecordClinicalFields) {
    const [
      bloodTypeEncrypted,
      knownAllergiesEncrypted,
      chronicConditionsEncrypted,
      currentMedicationsEncrypted,
      disabilityStatusEncrypted,
      baselineHealthNotesEncrypted,
      immunizationHistoryEncrypted,
    ] = await Promise.all([
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

  private async toDecrypted(tenantId: string, record: MedicalRecord, immunizationHistoryHint?: ImmunizationEntry[] | null): Promise<DecryptedMedicalRecord> {
    const {
      bloodTypeEncrypted,
      knownAllergiesEncrypted,
      chronicConditionsEncrypted,
      currentMedicationsEncrypted,
      disabilityStatusEncrypted,
      immunizationHistoryEncrypted,
      baselineHealthNotesEncrypted,
      ...rest
    } = record;

    const [bloodType, knownAllergies, chronicConditions, currentMedications, disabilityStatus, baselineHealthNotes] = await Promise.all([
      this.fieldEncryption.decrypt(tenantId, bloodTypeEncrypted),
      this.fieldEncryption.decrypt(tenantId, knownAllergiesEncrypted),
      this.fieldEncryption.decrypt(tenantId, chronicConditionsEncrypted),
      this.fieldEncryption.decrypt(tenantId, currentMedicationsEncrypted),
      this.fieldEncryption.decrypt(tenantId, disabilityStatusEncrypted),
      this.fieldEncryption.decrypt(tenantId, baselineHealthNotesEncrypted),
    ]);

    const immunizationHistory =
      immunizationHistoryHint !== undefined
        ? immunizationHistoryHint
        : await this.fieldEncryption.decryptJson<ImmunizationEntry[]>(tenantId, immunizationHistoryEncrypted);

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
}
