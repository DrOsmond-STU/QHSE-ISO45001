import { MedicalRecord, OhAccessReason } from "@prisma/client";
import { FieldEncryptionService } from "../../../platform/field-encryption/field-encryption.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { MedicalRecordAccessLogService } from "./medical-record-access-log.service";
import { OccupationalHealthAccessControlService } from "./occupational-health-access-control.service";
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
export type DecryptedMedicalRecord = Omit<MedicalRecord, "bloodTypeEncrypted" | "knownAllergiesEncrypted" | "chronicConditionsEncrypted" | "currentMedicationsEncrypted" | "disabilityStatusEncrypted" | "immunizationHistoryEncrypted" | "baselineHealthNotesEncrypted"> & {
    bloodType: string | null;
    knownAllergies: string | null;
    chronicConditions: string | null;
    currentMedications: string | null;
    disabilityStatus: string | null;
    immunizationHistory: ImmunizationEntry[] | null;
    baselineHealthNotes: string | null;
};
export declare class MedicalRecordService {
    private readonly prisma;
    private readonly fieldEncryption;
    private readonly accessControl;
    private readonly accessLog;
    constructor(prisma: PrismaService, fieldEncryption: FieldEncryptionService, accessControl: OccupationalHealthAccessControlService, accessLog: MedicalRecordAccessLogService);
    create(input: CreateMedicalRecordInput, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedMedicalRecord>;
    update(id: string, input: UpdateMedicalRecordInput, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedMedicalRecord>;
    getById(id: string, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedMedicalRecord>;
    getByEmployeeUserId(employeeUserId: string, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedMedicalRecord | null>;
    private resolveScope;
    private encryptClinicalFields;
    private toDecrypted;
}
