import { Injectable } from "@nestjs/common";
import { ClinicVisitLog, OhAccessReason, OhVisitorType, OhVisitType, OhWorkStatusAfterVisit } from "@prisma/client";
import { FieldEncryptionService } from "../../../platform/field-encryption/field-encryption.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./occupational-health-context";
import { OccupationalHealthAccessControlService } from "./occupational-health-access-control.service";
import { MedicalRecordAccessLogService } from "./medical-record-access-log.service";
import { OccupationalHealthWorkflowBootstrapService } from "./occupational-health-workflow-bootstrap.service";

const CLINIC_VISIT_NUMBERING_MODULE_CODE = "OH_CLINIC_VISIT";

export interface CreateClinicVisitLogInput {
  siteId: string;
  employeeUserId?: string;
  visitorName?: string;
  visitorType?: OhVisitorType;
  visitDatetime: Date;
  visitType: OhVisitType;
  chiefComplaint?: string;
  vitalSigns?: Record<string, unknown>;
  treatmentGiven?: string;
  medicationDispensed?: Record<string, unknown>;
  referralRequired?: boolean;
  referralFacilityName?: string;
  referralReason?: string;
  workStatusAfterVisit: OhWorkStatusAfterVisit;
  linkedIncidentId?: string;
  generateVisitNumber?: boolean;
}

export type DecryptedClinicVisitLog = Omit<
  ClinicVisitLog,
  "chiefComplaintEncrypted" | "vitalSignsEncrypted" | "treatmentGivenEncrypted" | "medicationDispensedEncrypted" | "referralReasonEncrypted"
> & {
  chiefComplaint: string | null;
  vitalSigns: Record<string, unknown> | null;
  treatmentGiven: string | null;
  medicationDispensed: Record<string, unknown> | null;
  referralReason: string | null;
};

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
@Injectable()
export class ClinicVisitLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fieldEncryption: FieldEncryptionService,
    private readonly accessControl: OccupationalHealthAccessControlService,
    private readonly accessLog: MedicalRecordAccessLogService,
    private readonly numberingService: NumberingService,
    private readonly bootstrapService: OccupationalHealthWorkflowBootstrapService,
  ) {}

  async create(input: CreateClinicVisitLogInput, reasonForAccess?: OhAccessReason, reasonNotes?: string): Promise<DecryptedClinicVisitLog> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    if (input.employeeUserId) {
      await this.accessControl.assertPhiAccessAuthorized({ scopeType: "SITE", scopeId: input.siteId });
    }

    let visitNumber: string | undefined;
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

    const record = await this.prisma.withRls((tx) =>
      tx.clinicVisitLog.create({
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
      }),
    );

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

  async close(id: string): Promise<void> {
    const actorUserId = requireActorUserId();
    await this.prisma.withRls((tx) => tx.clinicVisitLog.update({ where: { id }, data: { status: "CLOSED", updatedBy: actorUserId } }));
  }

  async getById(id: string, reasonForAccess?: OhAccessReason, reasonNotes?: string): Promise<DecryptedClinicVisitLog> {
    const tenantId = requireTenantId();
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

  private async toDecrypted(
    tenantId: string,
    record: ClinicVisitLog,
    plainHint?: {
      chiefComplaint: string | null;
      treatmentGiven: string | null;
      referralReason: string | null;
      vitalSigns: Record<string, unknown> | null;
      medicationDispensed: Record<string, unknown> | null;
    },
  ): Promise<DecryptedClinicVisitLog> {
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
      this.fieldEncryption.decryptJson<Record<string, unknown>>(tenantId, vitalSignsEncrypted),
      this.fieldEncryption.decryptJson<Record<string, unknown>>(tenantId, medicationDispensedEncrypted),
    ]);
    return { ...rest, chiefComplaint, treatmentGiven, referralReason, vitalSigns, medicationDispensed };
  }
}
