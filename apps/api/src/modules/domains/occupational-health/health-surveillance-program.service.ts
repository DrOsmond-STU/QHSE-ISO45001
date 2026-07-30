import { Injectable } from "@nestjs/common";
import { HealthSurveillanceEnrollment, HealthSurveillanceProgram, OhExposureType, OhMonitoringFrequency, OhSurveillanceProgramStatus } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./occupational-health-context";

export interface CreateHealthSurveillanceProgramInput {
  siteId: string;
  departmentId?: string;
  programName: string;
  exposureType: OhExposureType;
  relatedHiraId?: string;
  targetPopulationCriteria: string;
  monitoringFrequency: OhMonitoringFrequency;
  mcuPackageRequired?: string;
  startDate: Date;
  reviewDate?: Date;
}

// PRD §4.5 — target_population_criteria SENGAJA "deskripsi non-sensitif
// (jabatan/area), BUKAN daftar nama" (§5), jadi TIDAK ada kolom [ENCRYPTED]
// sama sekali di tabel ini/enrollments — TIDAK melalui dual-gate BR-02
// (bukan data klinis mentah), CRUD biasa.
@Injectable()
export class HealthSurveillanceProgramService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateHealthSurveillanceProgramInput): Promise<HealthSurveillanceProgram> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.healthSurveillanceProgram.create({
        data: {
          tenantId,
          siteId: input.siteId,
          departmentId: input.departmentId,
          programName: input.programName,
          exposureType: input.exposureType,
          relatedHiraId: input.relatedHiraId,
          targetPopulationCriteria: input.targetPopulationCriteria,
          monitoringFrequency: input.monitoringFrequency,
          mcuPackageRequired: input.mcuPackageRequired,
          programOwner: actorUserId,
          startDate: input.startDate,
          reviewDate: input.reviewDate,
          status: "ACTIVE",
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async transitionStatus(id: string, status: OhSurveillanceProgramStatus): Promise<HealthSurveillanceProgram> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) => tx.healthSurveillanceProgram.update({ where: { id }, data: { status, updatedBy: actorUserId } }));
  }

  async getById(id: string): Promise<HealthSurveillanceProgram> {
    return this.prisma.withRls((tx) => tx.healthSurveillanceProgram.findUniqueOrThrow({ where: { id } }));
  }

  async listBySite(siteId: string): Promise<HealthSurveillanceProgram[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.healthSurveillanceProgram.findMany({ where: { tenantId, siteId } }));
  }

  async enroll(healthSurveillanceProgramId: string, employeeUserId: string, enrollmentDate: Date): Promise<HealthSurveillanceEnrollment> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.healthSurveillanceEnrollment.create({
        data: {
          tenantId,
          healthSurveillanceProgramId,
          employeeUserId,
          enrollmentDate,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async exitEnrollment(enrollmentId: string, exitDate: Date, exitReason: string): Promise<HealthSurveillanceEnrollment> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.healthSurveillanceEnrollment.update({
        where: { id: enrollmentId },
        data: { exitDate, exitReason, updatedBy: actorUserId },
      }),
    );
  }

  async listEnrollmentsByProgram(healthSurveillanceProgramId: string): Promise<HealthSurveillanceEnrollment[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.healthSurveillanceEnrollment.findMany({ where: { tenantId, healthSurveillanceProgramId } }));
  }

  async listActiveEnrollmentsByEmployee(employeeUserId: string): Promise<HealthSurveillanceEnrollment[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.healthSurveillanceEnrollment.findMany({ where: { tenantId, employeeUserId, exitDate: null } }));
  }
}
