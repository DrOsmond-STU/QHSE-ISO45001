import { ClinicVisitLog, OhAccessReason, OhVisitorType, OhVisitType, OhWorkStatusAfterVisit } from "@prisma/client";
import { FieldEncryptionService } from "../../../platform/field-encryption/field-encryption.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { OccupationalHealthAccessControlService } from "./occupational-health-access-control.service";
import { MedicalRecordAccessLogService } from "./medical-record-access-log.service";
import { OccupationalHealthWorkflowBootstrapService } from "./occupational-health-workflow-bootstrap.service";
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
export type DecryptedClinicVisitLog = Omit<ClinicVisitLog, "chiefComplaintEncrypted" | "vitalSignsEncrypted" | "treatmentGivenEncrypted" | "medicationDispensedEncrypted" | "referralReasonEncrypted"> & {
    chiefComplaint: string | null;
    vitalSigns: Record<string, unknown> | null;
    treatmentGiven: string | null;
    medicationDispensed: Record<string, unknown> | null;
    referralReason: string | null;
};
export declare class ClinicVisitLogService {
    private readonly prisma;
    private readonly fieldEncryption;
    private readonly accessControl;
    private readonly accessLog;
    private readonly numberingService;
    private readonly bootstrapService;
    constructor(prisma: PrismaService, fieldEncryption: FieldEncryptionService, accessControl: OccupationalHealthAccessControlService, accessLog: MedicalRecordAccessLogService, numberingService: NumberingService, bootstrapService: OccupationalHealthWorkflowBootstrapService);
    create(input: CreateClinicVisitLogInput, reasonForAccess?: OhAccessReason, reasonNotes?: string): Promise<DecryptedClinicVisitLog>;
    close(id: string): Promise<void>;
    getById(id: string, reasonForAccess?: OhAccessReason, reasonNotes?: string): Promise<DecryptedClinicVisitLog>;
    private toDecrypted;
}
