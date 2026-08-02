import { OccupationalDiseaseCase, OhAccessReason, OhDiseaseCategory, OhPakCaseStatus, OhSeverityClassification, OhWorkRelatedness } from "@prisma/client";
import { FieldEncryptionService } from "../../../platform/field-encryption/field-encryption.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { OccupationalHealthAccessControlService } from "./occupational-health-access-control.service";
import { MedicalRecordAccessLogService } from "./medical-record-access-log.service";
import { OccupationalHealthWorkflowBootstrapService } from "./occupational-health-workflow-bootstrap.service";
export interface CreatePakCaseInput {
    siteId: string;
    departmentId?: string;
    employeeUserId: string;
    diagnosisDate: Date;
    diagnosedBy: string;
    diseaseCategory: OhDiseaseCategory;
    diagnosisDetail?: string;
    suspectedCausalAgentExposure?: string;
    relatedHiraId?: string;
    relatedEnvironmentalMonitoringRecordId?: string;
    severityClassification: OhSeverityClassification;
}
export type DecryptedPakCase = Omit<OccupationalDiseaseCase, "diagnosisDetailEncrypted" | "suspectedCausalAgentExposureEncrypted"> & {
    diagnosisDetail: string | null;
    suspectedCausalAgentExposure: string | null;
};
export declare class OccupationalDiseaseCaseService {
    private readonly prisma;
    private readonly fieldEncryption;
    private readonly accessControl;
    private readonly accessLog;
    private readonly numberingService;
    private readonly bootstrapService;
    private readonly workflowEngineService;
    private readonly notificationService;
    constructor(prisma: PrismaService, fieldEncryption: FieldEncryptionService, accessControl: OccupationalHealthAccessControlService, accessLog: MedicalRecordAccessLogService, numberingService: NumberingService, bootstrapService: OccupationalHealthWorkflowBootstrapService, workflowEngineService: WorkflowEngineService, notificationService: NotificationService);
    create(input: CreatePakCaseInput, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedPakCase>;
    submitForReview(id: string): Promise<void>;
    /** Dipanggil OccupationalDiseaseCaseWorkflowCompletionListener — review
     * (konfirmasi diagnosis + systemic risk) selesai, TIDAK mengubah
     * case_status (itu concern terpisah, perjalanan klinis nyata pasien,
     * ditegakkan transitionStatus() langsung oleh OH Staff). */
    markReviewCompleted(id: string): Promise<void>;
    recordWorkRelatednessDetermination(id: string, determination: OhWorkRelatedness): Promise<void>;
    recordDisnakerReport(id: string, reportDate: Date, reportNumber: string): Promise<void>;
    recordBpjsClaimNumber(id: string, claimNumber: string): Promise<void>;
    /** BR-10 — link MANUAL (caller sudah CapaRegisterService.create({sourceType:
     * "OCCUPATIONAL_DISEASE_CASE",...}) sendiri, deskripsi WAJIB sistemik/
     * non-identifiable — didisiplinkan proses/UI, TIDAK bisa dipaksa dari sini). */
    linkCapaRegister(id: string, capaRegisterId: string): Promise<void>;
    transitionStatus(id: string, to: OhPakCaseStatus): Promise<void>;
    getById(id: string, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedPakCase>;
    private toDecrypted;
}
