import { EmergencyResponseTeam, EmergencyResponseTeamMember, EmergencyTeamType, ErtRole } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateEmergencyResponseTeamInput {
    siteId: string;
    teamName: string;
    teamType: EmergencyTeamType;
    effectiveDate: Date;
}
export interface AddEmergencyResponseTeamMemberInput {
    userId: string;
    ertRole: ErtRole;
    backupForMemberId?: string;
    certificationReferenceId?: string;
    assignedDate: Date;
}
export declare class EmergencyResponseTeamService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateEmergencyResponseTeamInput): Promise<EmergencyResponseTeam>;
    /** BR-03 — "ert_role=INCIDENT_COMMANDER wajib unik per
     * emergency_response_team_id AKTIF, kecuali sebagai backup_for_member_id
     * eksplisit." Kandidat existing disaring status=ACTIVE pada tim yang SAMA
     * SEBELUM diteruskan ke fungsi murni. §4.2 poin 2 "validasi kompetensi
     * OPSIONAL via certification_reference" — TIDAK ditegakkan sbg guard
     * (certificationReferenceId bare UUID nullable, Modul 19 belum ada). */
    addMember(emergencyResponseTeamId: string, input: AddEmergencyResponseTeamMemberInput): Promise<EmergencyResponseTeamMember>;
    removeMember(teamMemberId: string): Promise<EmergencyResponseTeamMember>;
    getById(emergencyResponseTeamId: string): Promise<{
        members: {
            status: import("@prisma/client").$Enums.EmergencyTeamMemberStatus;
            id: string;
            endDate: Date | null;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            userId: string;
            emergencyResponseTeamId: string;
            ertRole: import("@prisma/client").$Enums.ErtRole;
            backupForMemberId: string | null;
            certificationReferenceId: string | null;
            assignedDate: Date;
        }[];
    } & {
        isActive: boolean;
        id: string;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        siteId: string;
        deletedAt: Date | null;
        effectiveDate: Date;
        teamName: string;
        teamType: import("@prisma/client").$Enums.EmergencyTeamType;
    }>;
    listActiveBySite(siteId: string): Promise<EmergencyResponseTeam[]>;
}
