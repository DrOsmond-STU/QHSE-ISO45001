import { DrillAttendanceStatus, EmergencyDrill, EmergencyDrillType, EmergencyPersonType } from "@prisma/client";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { EmergencyResponseWorkflowBootstrapService } from "./emergency-response-workflow-bootstrap.service";
export interface CreateEmergencyDrillInput {
    siteId: string;
    emergencyResponsePlanId: string;
    drillType: EmergencyDrillType;
    scheduledDate: Date;
    objective?: string;
    scenarioDescription?: string;
    plannedParticipantCount?: number;
    evacuationTimeTargetMinutes?: number;
    conductedBy: string;
}
export interface RecordDrillParticipationInput {
    userId?: string;
    participantName?: string;
    participantType: EmergencyPersonType;
    roleDuringDrill?: string;
    attendanceStatus: DrillAttendanceStatus;
    performanceNotes?: string;
}
export interface CompleteEmergencyDrillInput {
    evacuationTimeActualMinutes?: number;
    observerNotes?: string;
    gapsIdentified?: string;
    capaId?: string;
}
export declare class EmergencyDrillService {
    private readonly prisma;
    private readonly numberingService;
    private readonly bootstrapService;
    constructor(prisma: PrismaService, numberingService: NumberingService, bootstrapService: EmergencyResponseWorkflowBootstrapService);
    create(input: CreateEmergencyDrillInput): Promise<EmergencyDrill>;
    start(emergencyDrillId: string): Promise<EmergencyDrill>;
    /** PRD §4.3 poin 3-4 — "HSE Officer/Marshal mencatat kehadiran manual utk
     * yang tidak dapat mengakses aplikasi" + "actual_participant_count
     * denormalized dari drill_participation_logs." Recompute HANYA menghitung
     * baris attendance_status=PRESENT (ABSENT/EXCUSED TIDAK dihitung sbg
     * "berpartisipasi"). */
    recordParticipation(emergencyDrillId: string, input: RecordDrillParticipationInput): Promise<{
        id: string;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        deletedAt: Date | null;
        userId: string | null;
        participantName: string | null;
        participantType: import("@prisma/client").$Enums.EmergencyPersonType;
        roleDuringDrill: string | null;
        attendanceStatus: import("@prisma/client").$Enums.DrillAttendanceStatus;
        performanceNotes: string | null;
        emergencyDrillId: string;
    }>;
    /** BR-04 (FULL_SCALE_EVACUATION wajib >=1 emergency_activations) + BR-08
     * (capa_id wajib kalau gapsIdentified terisi) ditegakkan SEBELUM menulis
     * status COMPLETED. */
    complete(emergencyDrillId: string, input: CompleteEmergencyDrillInput): Promise<EmergencyDrill>;
    cancel(emergencyDrillId: string): Promise<EmergencyDrill>;
    getById(emergencyDrillId: string): Promise<{
        activations: {
            status: import("@prisma/client").$Enums.EmergencyActivationStatus;
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            siteId: string;
            deletedAt: Date | null;
            description: string | null;
            emergencyResponsePlanId: string | null;
            triggerContext: import("@prisma/client").$Enums.EmergencyActivationTriggerContext;
            relatedEmergencyDrillId: string | null;
            emergencyType: import("@prisma/client").$Enums.EmergencyType;
            activationDatetime: Date;
            activatedBy: string;
            totalExpectedHeadcount: number | null;
            relatedIncidentReportId: string | null;
            allClearDatetime: Date | null;
        }[];
        participationLogs: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            userId: string | null;
            participantName: string | null;
            participantType: import("@prisma/client").$Enums.EmergencyPersonType;
            roleDuringDrill: string | null;
            attendanceStatus: import("@prisma/client").$Enums.DrillAttendanceStatus;
            performanceNotes: string | null;
            emergencyDrillId: string;
        }[];
    } & {
        status: import("@prisma/client").$Enums.EmergencyDrillStatus;
        id: string;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        siteId: string;
        deletedAt: Date | null;
        objective: string | null;
        emergencyResponsePlanId: string;
        scenarioDescription: string | null;
        drillNumber: string;
        drillType: import("@prisma/client").$Enums.EmergencyDrillType;
        scheduledDate: Date;
        actualDate: Date | null;
        plannedParticipantCount: number | null;
        actualParticipantCount: number | null;
        evacuationTimeTargetMinutes: number | null;
        evacuationTimeActualMinutes: number | null;
        observerNotes: string | null;
        gapsIdentified: string | null;
        capaId: string | null;
        conductedBy: string;
    }>;
    listBySite(siteId: string): Promise<EmergencyDrill[]>;
}
