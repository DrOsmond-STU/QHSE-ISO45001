import { Injectable } from "@nestjs/common";
import { DrillAttendanceStatus, EmergencyDrill, EmergencyDrillType, EmergencyPersonType } from "@prisma/client";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./emergency-response-context";
import { assertActivationExistsIfFullScaleEvacuation, assertCapaLinkedIfGapsIdentified, validateEmergencyDrillStatusTransition } from "./emergency-drill-rules";
import { EmergencyResponseWorkflowBootstrapService } from "./emergency-response-workflow-bootstrap.service";

const EMERGENCY_DRILL_NUMBERING_MODULE_CODE = "EMERGENCY_DRILL";

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

// Task 3.7 (Modul 14 §4.3/§6 BR-04/BR-08). BELUM ada controller HTTP.
@Injectable()
export class EmergencyDrillService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: NumberingService,
    private readonly bootstrapService: EmergencyResponseWorkflowBootstrapService,
  ) {}

  async create(input: CreateEmergencyDrillInput): Promise<EmergencyDrill> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    await this.bootstrapService.ensureDrillNumberingConfig(input.siteId);
    const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
    const drillNumber = await this.numberingService.generateNext(EMERGENCY_DRILL_NUMBERING_MODULE_CODE, {
      scopeId: input.siteId,
      variables: { SITE_CODE: site.siteCode },
    });

    return this.prisma.withRls((tx) =>
      tx.emergencyDrill.create({
        data: {
          tenantId,
          siteId: input.siteId,
          drillNumber,
          emergencyResponsePlanId: input.emergencyResponsePlanId,
          drillType: input.drillType,
          scheduledDate: input.scheduledDate,
          objective: input.objective,
          scenarioDescription: input.scenarioDescription,
          plannedParticipantCount: input.plannedParticipantCount,
          evacuationTimeTargetMinutes: input.evacuationTimeTargetMinutes,
          conductedBy: input.conductedBy,
          status: "PLANNED",
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async start(emergencyDrillId: string): Promise<EmergencyDrill> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const drill = await tx.emergencyDrill.findUniqueOrThrow({ where: { id: emergencyDrillId } });
      validateEmergencyDrillStatusTransition(drill.status, "IN_PROGRESS");
      return tx.emergencyDrill.update({
        where: { id: emergencyDrillId },
        data: { status: "IN_PROGRESS", actualDate: drill.actualDate ?? new Date(), updatedBy },
      });
    });
  }

  /** PRD §4.3 poin 3-4 — "HSE Officer/Marshal mencatat kehadiran manual utk
   * yang tidak dapat mengakses aplikasi" + "actual_participant_count
   * denormalized dari drill_participation_logs." Recompute HANYA menghitung
   * baris attendance_status=PRESENT (ABSENT/EXCUSED TIDAK dihitung sbg
   * "berpartisipasi"). */
  async recordParticipation(emergencyDrillId: string, input: RecordDrillParticipationInput) {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      const log = await tx.drillParticipationLog.create({
        data: {
          tenantId,
          emergencyDrillId,
          userId: input.userId,
          participantName: input.participantName,
          participantType: input.participantType,
          roleDuringDrill: input.roleDuringDrill,
          attendanceStatus: input.attendanceStatus,
          performanceNotes: input.performanceNotes,
          createdBy,
          updatedBy: createdBy,
        },
      });
      const actualParticipantCount = await tx.drillParticipationLog.count({ where: { emergencyDrillId, attendanceStatus: "PRESENT" } });
      await tx.emergencyDrill.update({ where: { id: emergencyDrillId }, data: { actualParticipantCount } });
      return log;
    });
  }

  /** BR-04 (FULL_SCALE_EVACUATION wajib >=1 emergency_activations) + BR-08
   * (capa_id wajib kalau gapsIdentified terisi) ditegakkan SEBELUM menulis
   * status COMPLETED. */
  async complete(emergencyDrillId: string, input: CompleteEmergencyDrillInput): Promise<EmergencyDrill> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const drill = await tx.emergencyDrill.findUniqueOrThrow({ where: { id: emergencyDrillId } });
      validateEmergencyDrillStatusTransition(drill.status, "COMPLETED");

      const activationCount = await tx.emergencyActivation.count({ where: { relatedEmergencyDrillId: emergencyDrillId } });
      assertActivationExistsIfFullScaleEvacuation(drill.drillType, activationCount);
      assertCapaLinkedIfGapsIdentified(input.gapsIdentified, input.capaId);

      return tx.emergencyDrill.update({
        where: { id: emergencyDrillId },
        data: {
          status: "COMPLETED",
          evacuationTimeActualMinutes: input.evacuationTimeActualMinutes,
          observerNotes: input.observerNotes,
          gapsIdentified: input.gapsIdentified,
          capaId: input.capaId,
          updatedBy,
        },
      });
    });
  }

  async cancel(emergencyDrillId: string): Promise<EmergencyDrill> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const drill = await tx.emergencyDrill.findUniqueOrThrow({ where: { id: emergencyDrillId } });
      validateEmergencyDrillStatusTransition(drill.status, "CANCELLED");
      return tx.emergencyDrill.update({ where: { id: emergencyDrillId }, data: { status: "CANCELLED", updatedBy } });
    });
  }

  async getById(emergencyDrillId: string) {
    return this.prisma.withRls((tx) =>
      tx.emergencyDrill.findUniqueOrThrow({ where: { id: emergencyDrillId }, include: { participationLogs: true, activations: true } }),
    );
  }

  async listBySite(siteId: string): Promise<EmergencyDrill[]> {
    return this.prisma.withRls((tx) => tx.emergencyDrill.findMany({ where: { siteId, deletedAt: null }, orderBy: { scheduledDate: "desc" } }));
  }
}
