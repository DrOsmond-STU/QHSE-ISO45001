import { Injectable } from "@nestjs/common";
import { EmergencyResponseTeam, EmergencyResponseTeamMember, EmergencyTeamType, ErtRole } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./emergency-response-context";
import { assertIncidentCommanderUniquePerActiveTeam } from "./emergency-team-member-rules";

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

// Task 3.7 (Modul 14 §4.2/§6 BR-03). BELUM ada controller HTTP.
@Injectable()
export class EmergencyResponseTeamService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateEmergencyResponseTeamInput): Promise<EmergencyResponseTeam> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.emergencyResponseTeam.create({
        data: {
          tenantId,
          siteId: input.siteId,
          teamName: input.teamName,
          teamType: input.teamType,
          effectiveDate: input.effectiveDate,
          isActive: true,
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  /** BR-03 — "ert_role=INCIDENT_COMMANDER wajib unik per
   * emergency_response_team_id AKTIF, kecuali sebagai backup_for_member_id
   * eksplisit." Kandidat existing disaring status=ACTIVE pada tim yang SAMA
   * SEBELUM diteruskan ke fungsi murni. §4.2 poin 2 "validasi kompetensi
   * OPSIONAL via certification_reference" — TIDAK ditegakkan sbg guard
   * (certificationReferenceId bare UUID nullable, Modul 19 belum ada). */
  async addMember(emergencyResponseTeamId: string, input: AddEmergencyResponseTeamMemberInput): Promise<EmergencyResponseTeamMember> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      const existingActiveMembers = await tx.emergencyResponseTeamMember.findMany({
        where: { emergencyResponseTeamId, status: "ACTIVE" },
        select: { ertRole: true, backupForMemberId: true },
      });
      assertIncidentCommanderUniquePerActiveTeam(existingActiveMembers, {
        ertRole: input.ertRole,
        backupForMemberId: input.backupForMemberId,
      });

      return tx.emergencyResponseTeamMember.create({
        data: {
          tenantId,
          emergencyResponseTeamId,
          userId: input.userId,
          ertRole: input.ertRole,
          backupForMemberId: input.backupForMemberId,
          certificationReferenceId: input.certificationReferenceId,
          assignedDate: input.assignedDate,
          status: "ACTIVE",
          createdBy,
          updatedBy: createdBy,
        },
      });
    });
  }

  async removeMember(teamMemberId: string): Promise<EmergencyResponseTeamMember> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.emergencyResponseTeamMember.update({
        where: { id: teamMemberId },
        data: { status: "INACTIVE", endDate: new Date(), updatedBy },
      }),
    );
  }

  async getById(emergencyResponseTeamId: string) {
    return this.prisma.withRls((tx) =>
      tx.emergencyResponseTeam.findUniqueOrThrow({ where: { id: emergencyResponseTeamId }, include: { members: true } }),
    );
  }

  async listActiveBySite(siteId: string): Promise<EmergencyResponseTeam[]> {
    return this.prisma.withRls((tx) =>
      tx.emergencyResponseTeam.findMany({ where: { siteId, isActive: true, deletedAt: null }, orderBy: { teamName: "asc" } }),
    );
  }
}
