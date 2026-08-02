import { McuResult, OhAccessReason, OhMcuResultOverall, OhMcuResultStatus } from "@prisma/client";
import { FieldEncryptionService } from "../../../platform/field-encryption/field-encryption.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
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
export type DecryptedMcuResult = Omit<McuResult, "heightCmEncrypted" | "weightKgEncrypted" | "bmiEncrypted" | "bloodPressureSystolicEncrypted" | "bloodPressureDiastolicEncrypted" | "pulseRateEncrypted" | "labResultsEncrypted" | "radiologyResultsEncrypted" | "audiometryResultsEncrypted" | "spirometryResultsEncrypted" | "physicianConclusionEncrypted" | "diagnosisCodesEncrypted"> & {
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
export declare class McuResultService {
    private readonly prisma;
    private readonly fieldEncryption;
    private readonly accessControl;
    private readonly accessLog;
    private readonly notificationService;
    constructor(prisma: PrismaService, fieldEncryption: FieldEncryptionService, accessControl: OccupationalHealthAccessControlService, accessLog: MedicalRecordAccessLogService, notificationService: NotificationService);
    create(input: CreateMcuResultInput, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedMcuResult>;
    linkFitToWorkAssessment(id: string, fitToWorkAssessmentId: string): Promise<void>;
    transitionStatus(id: string, to: OhMcuResultStatus): Promise<void>;
    getById(id: string, siteIdForScope: string, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedMcuResult>;
    private encryptClinicalFields;
    private toDecrypted;
}
