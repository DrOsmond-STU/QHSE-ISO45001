import { FitToWorkAssessment, OhAccessReason, OhFitStatus, OhFitToWorkAssessmentStatus, OhFitToWorkTrigger } from "@prisma/client";
import { FieldEncryptionService } from "../../../platform/field-encryption/field-encryption.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { OccupationalHealthAccessControlService } from "./occupational-health-access-control.service";
import { MedicalRecordAccessLogService } from "./medical-record-access-log.service";
export interface CreateFitToWorkAssessmentInput {
    siteId: string;
    departmentId?: string;
    employeeUserId: string;
    assessmentDate: Date;
    assessmentTrigger: OhFitToWorkTrigger;
    relatedMcuResultId?: string;
    fitStatus: OhFitStatus;
    restrictionDetails?: string;
    restrictionSummaryForSupervisor?: string;
    restrictionValidFrom?: Date;
    restrictionValidUntil?: Date;
    nextReassessmentDate?: Date;
}
export type DecryptedFitToWorkAssessment = Omit<FitToWorkAssessment, "restrictionDetailsEncrypted"> & {
    restrictionDetails: string | null;
};
export declare class FitToWorkAssessmentService {
    private readonly prisma;
    private readonly fieldEncryption;
    private readonly accessControl;
    private readonly accessLog;
    private readonly notificationService;
    constructor(prisma: PrismaService, fieldEncryption: FieldEncryptionService, accessControl: OccupationalHealthAccessControlService, accessLog: MedicalRecordAccessLogService, notificationService: NotificationService);
    create(input: CreateFitToWorkAssessmentInput, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedFitToWorkAssessment>;
    /** true kalau assessment ini WAJIB menghasilkan restricted_duty_assignments
     * (PRD §4.2 poin 3) — caller (mis. RestrictedDutyAssignmentService.create()
     * dipanggil Supervisor/Dept Head terpisah) yang bertindak atas info ini,
     * method ini TIDAK auto-create (assignment butuh assignedBy Supervisor +
     * alternative_task_description operasional yang bukan wewenang dokter). */
    requiresRestrictedDuty(fitStatus: OhFitStatus): boolean;
    linkRestrictedDutyAssignment(id: string, restrictedDutyAssignmentId: string): Promise<void>;
    transitionStatus(id: string, to: OhFitToWorkAssessmentStatus): Promise<void>;
    getById(id: string, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedFitToWorkAssessment>;
    /** BR-04 — boundary field. TIDAK memerlukan dual-gate BR-02/access-log
     * BR-01 (bukan data klinis mentah), TIDAK PERNAH fetch
     * restrictionDetailsEncrypted sama sekali (query eksplisit `select`,
     * bukan cuma "diabaikan setelah fetch" — kolom itu TIDAK ADA di hasil
     * query DB sama sekali). Dipakai Department Head/Supervisor
     * (occupational_health.fit_to_work.view_summary). */
    getSummaryForSupervisor(id: string): Promise<{
        status: import("@prisma/client").$Enums.OhFitToWorkAssessmentStatus;
        id: string;
        employeeUserId: string;
        fitStatus: import("@prisma/client").$Enums.OhFitStatus;
        restrictionSummaryForSupervisor: string | null;
        restrictionValidFrom: Date | null;
        restrictionValidUntil: Date | null;
        nextReassessmentDate: Date | null;
    }>;
    listDueForReassessment(asOfDate: Date): Promise<FitToWorkAssessment[]>;
    markReassessmentReminderSent(id: string, sentAt: Date): Promise<void>;
    private toDecrypted;
}
