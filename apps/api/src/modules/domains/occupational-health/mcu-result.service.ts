import { Injectable } from "@nestjs/common";
import { McuResult, OhAccessReason, OhMcuResultOverall, OhMcuResultStatus } from "@prisma/client";
import { FieldEncryptionService } from "../../../platform/field-encryption/field-encryption.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { validateMcuResultStatusTransition } from "./mcu-lifecycle";
import { requireActorUserId, requireTenantId } from "./occupational-health-context";
import { OccupationalHealthAccessControlService } from "./occupational-health-access-control.service";
import { MedicalRecordAccessLogService } from "./medical-record-access-log.service";

export interface LabResultEntry {
  testName: string;
  value: string;
  unit: string;
  normalRange: string;
  flagAbnormal: boolean;
}

export interface McuResultClinicalFields {
  heightCm?: number | null;
  weightKg?: number | null;
  bmi?: number | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  pulseRate?: number | null;
  labResults?: LabResultEntry[] | null;
  radiologyResults?: string | null;
  audiometryResults?: Record<string, unknown> | null;
  spirometryResults?: Record<string, unknown> | null;
  physicianConclusion?: string | null;
  diagnosisCodes?: string[] | null;
}

export interface CreateMcuResultInput extends McuResultClinicalFields {
  mcuScheduleId: string;
  employeeUserId: string;
  siteIdForScope: string;
  examinationDate: Date;
  examiningPhysicianName: string;
  examiningPhysicianLicenseNo?: string;
  overallMcuResult: OhMcuResultOverall;
  reportFileAttachmentNote?: string;
}

export type DecryptedMcuResult = Omit<
  McuResult,
  | "heightCmEncrypted"
  | "weightKgEncrypted"
  | "bmiEncrypted"
  | "bloodPressureSystolicEncrypted"
  | "bloodPressureDiastolicEncrypted"
  | "pulseRateEncrypted"
  | "labResultsEncrypted"
  | "radiologyResultsEncrypted"
  | "audiometryResultsEncrypted"
  | "spirometryResultsEncrypted"
  | "physicianConclusionEncrypted"
  | "diagnosisCodesEncrypted"
> & {
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  pulseRate: number | null;
  labResults: LabResultEntry[] | null;
  radiologyResults: string | null;
  audiometryResults: Record<string, unknown> | null;
  spirometryResults: Record<string, unknown> | null;
  physicianConclusion: string | null;
  diagnosisCodes: string[] | null;
};

const ENCRYPTED_NUMERIC_FIELDS = ["heightCm", "weightKg", "bmi", "bloodPressureSystolic", "bloodPressureDiastolic", "pulseRate"] as const;

// mcu_results ADA di enum accessed_entity_type (§5) DAN literal BR-01 —
// dual-gate + access-log PENUH berlaku, pola SAMA MedicalRecordService.
@Injectable()
export class McuResultService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fieldEncryption: FieldEncryptionService,
    private readonly accessControl: OccupationalHealthAccessControlService,
    private readonly accessLog: MedicalRecordAccessLogService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(input: CreateMcuResultInput, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedMcuResult> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    await this.accessControl.assertPhiAccessAuthorized({ scopeType: "SITE", scopeId: input.siteIdForScope });

    const encrypted = await this.encryptClinicalFields(tenantId, input);

    const record = await this.prisma.withRls((tx) =>
      tx.mcuResult.create({
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
      }),
    );

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
      const recipients = await this.prisma.withRls((tx) =>
        tx.user.findMany({ where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "OCCUPATIONAL_HEALTH_STAFF" } } } }, select: { id: true } }),
      );
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

  async linkFitToWorkAssessment(id: string, fitToWorkAssessmentId: string): Promise<void> {
    await this.prisma.withRls((tx) => tx.mcuResult.update({ where: { id }, data: { fitToWorkAssessmentId } }));
  }

  async transitionStatus(id: string, to: OhMcuResultStatus): Promise<void> {
    const actorUserId = requireActorUserId();
    const existing = await this.prisma.withRls((tx) => tx.mcuResult.findUniqueOrThrow({ where: { id } }));
    validateMcuResultStatusTransition(existing.status, to);
    await this.prisma.withRls((tx) => tx.mcuResult.update({ where: { id }, data: { status: to, updatedBy: actorUserId } }));
  }

  async getById(id: string, siteIdForScope: string, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedMcuResult> {
    const tenantId = requireTenantId();
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

  private async encryptClinicalFields(tenantId: string, input: McuResultClinicalFields) {
    const numericEncrypted = await Promise.all(
      ENCRYPTED_NUMERIC_FIELDS.map((field) => this.fieldEncryption.encrypt(tenantId, input[field] === null || input[field] === undefined ? null : String(input[field]))),
    );
    const [labResultsEncrypted, audiometryResultsEncrypted, spirometryResultsEncrypted, diagnosisCodesEncrypted, radiologyResultsEncrypted, physicianConclusionEncrypted] =
      await Promise.all([
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

  private async toDecrypted(tenantId: string, record: McuResult, plainHint?: McuResultClinicalFields): Promise<DecryptedMcuResult> {
    const {
      heightCmEncrypted,
      weightKgEncrypted,
      bmiEncrypted,
      bloodPressureSystolicEncrypted,
      bloodPressureDiastolicEncrypted,
      pulseRateEncrypted,
      labResultsEncrypted,
      radiologyResultsEncrypted,
      audiometryResultsEncrypted,
      spirometryResultsEncrypted,
      physicianConclusionEncrypted,
      diagnosisCodesEncrypted,
      ...rest
    } = record;

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
      this.fieldEncryption.decryptJson<LabResultEntry[]>(tenantId, labResultsEncrypted),
      this.fieldEncryption.decryptJson<Record<string, unknown>>(tenantId, audiometryResultsEncrypted),
      this.fieldEncryption.decryptJson<Record<string, unknown>>(tenantId, spirometryResultsEncrypted),
      this.fieldEncryption.decryptJson<string[]>(tenantId, diagnosisCodesEncrypted),
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
}
