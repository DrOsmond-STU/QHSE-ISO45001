import { Injectable } from "@nestjs/common";
import { OhRestrictedDutyStatus, OhRestrictionType, RestrictedDutyAssignment } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { validateRestrictedDutyAssignmentStatusTransition } from "./fit-to-work-lifecycle";
import { requireActorUserId, requireTenantId } from "./occupational-health-context";

export interface CreateRestrictedDutyAssignmentInput {
  siteId: string;
  departmentId: string;
  employeeUserId: string;
  fitToWorkAssessmentId: string;
  restrictionType: OhRestrictionType;
  alternativeTaskDescription: string;
  startDate: Date;
  endDate?: Date;
}

// §3.1 poin 5 + catatan desain PRD di tabel ini: "SENGAJA tidak memiliki
// foreign key langsung ke kolom klinis... menegakkan batas isolasi akses
// SECARA STRUKTURAL." Konsisten dgn itu, service ini TIDAK punya
// dependency ke FieldEncryptionService/OccupationalHealthAccessControlService/
// MedicalRecordAccessLogService SAMA SEKALI — bukan oversight, desain.
@Injectable()
export class RestrictedDutyAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRestrictedDutyAssignmentInput): Promise<RestrictedDutyAssignment> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.restrictedDutyAssignment.create({
        data: {
          tenantId,
          siteId: input.siteId,
          departmentId: input.departmentId,
          employeeUserId: input.employeeUserId,
          fitToWorkAssessmentId: input.fitToWorkAssessmentId,
          restrictionType: input.restrictionType,
          alternativeTaskDescription: input.alternativeTaskDescription,
          assignedBy: actorUserId,
          startDate: input.startDate,
          endDate: input.endDate,
          status: "ACTIVE",
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async confirmCompliance(id: string): Promise<RestrictedDutyAssignment> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.restrictedDutyAssignment.update({
        where: { id },
        data: { complianceConfirmedBySupervisor: true, updatedBy: actorUserId },
      }),
    );
  }

  async transitionStatus(id: string, to: OhRestrictedDutyStatus): Promise<RestrictedDutyAssignment> {
    const actorUserId = requireActorUserId();
    const existing = await this.prisma.withRls((tx) => tx.restrictedDutyAssignment.findUniqueOrThrow({ where: { id } }));
    validateRestrictedDutyAssignmentStatusTransition(existing.status, to);
    return this.prisma.withRls((tx) => tx.restrictedDutyAssignment.update({ where: { id }, data: { status: to, updatedBy: actorUserId } }));
  }

  async getById(id: string): Promise<RestrictedDutyAssignment> {
    return this.prisma.withRls((tx) => tx.restrictedDutyAssignment.findUniqueOrThrow({ where: { id } }));
  }

  async listByEmployee(employeeUserId: string): Promise<RestrictedDutyAssignment[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.restrictedDutyAssignment.findMany({ where: { tenantId, employeeUserId }, orderBy: { startDate: "desc" } }));
  }

  async listBySite(siteId: string, status?: OhRestrictedDutyStatus): Promise<RestrictedDutyAssignment[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.restrictedDutyAssignment.findMany({ where: { tenantId, siteId, status }, orderBy: { startDate: "desc" } }));
  }
}
