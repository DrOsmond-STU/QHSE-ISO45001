import { Injectable } from "@nestjs/common";
import { FitToWorkAssessment, OhAccessReason, OhFitStatus, OhFitToWorkAssessmentStatus, OhFitToWorkTrigger } from "@prisma/client";
import { FieldEncryptionService } from "../../../platform/field-encryption/field-encryption.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requiresRestrictedDutyAssignment, validateFitToWorkAssessmentStatusTransition } from "./fit-to-work-lifecycle";
import { requireActorUserId, requireTenantId } from "./occupational-health-context";
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

export type DecryptedFitToWorkAssessment = Omit<FitToWorkAssessment, "restrictionDetailsEncrypted"> & { restrictionDetails: string | null };

// PRD §4.2 — TIDAK memakai Workflow Engine (otoritas tunggal dokter/
// paramedis). restrictionDetails [ENCRYPTED] + dual-gate/access-log PENUH
// (fit_to_work_assessments ADA di enum accessed_entity_type). restriction
// SummaryForSupervisor SENGAJA boundary field terpisah — lihat
// getSummaryForSupervisor() di bawah, method TERPISAH yang TIDAK PERNAH
// menyentuh restrictionDetailsEncrypted sama sekali (BR-04 structural).
@Injectable()
export class FitToWorkAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fieldEncryption: FieldEncryptionService,
    private readonly accessControl: OccupationalHealthAccessControlService,
    private readonly accessLog: MedicalRecordAccessLogService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(input: CreateFitToWorkAssessmentInput, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedFitToWorkAssessment> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    await this.accessControl.assertPhiAccessAuthorized({ scopeType: "SITE", scopeId: input.siteId });

    const restrictionDetailsEncrypted = await this.fieldEncryption.encrypt(tenantId, input.restrictionDetails);

    const record = await this.prisma.withRls((tx) =>
      tx.fitToWorkAssessment.create({
        data: {
          tenantId,
          siteId: input.siteId,
          departmentId: input.departmentId,
          employeeUserId: input.employeeUserId,
          assessmentDate: input.assessmentDate,
          assessmentTrigger: input.assessmentTrigger,
          relatedMcuResultId: input.relatedMcuResultId,
          assessedBy: actorUserId,
          fitStatus: input.fitStatus,
          restrictionDetailsEncrypted,
          restrictionSummaryForSupervisor: input.restrictionSummaryForSupervisor,
          restrictionValidFrom: input.restrictionValidFrom,
          restrictionValidUntil: input.restrictionValidUntil,
          nextReassessmentDate: input.nextReassessmentDate,
          status: "ACTIVE",
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );

    await this.accessLog.recordAccess({
      subjectEmployeeUserId: input.employeeUserId,
      accessedEntityType: "FIT_TO_WORK_ASSESSMENT",
      accessedEntityId: record.id,
      accessType: "EDIT",
      reasonForAccess,
      reasonNotes,
    });

    // PRD §8 baris 3 — "fit_to_work_assessments baru terbit -> Karyawan
    // bersangkutan, Supervisor (HANYA restriction_summary_for_supervisor)."
    // SATU set variables dipakai KEDUA penerima (renderTemplate() strict:
    // true, wajib SEMUA variabel template disuplai tiap enqueue() — lihat
    // notification-template.ts) — restrictionSummaryForSupervisor SENGAJA
    // aman utk karyawan sendiri juga lihat (ini boundary field NON-klinis,
    // BR-04 structural tetap tegak krn restrictionDetails TIDAK PERNAH
    // masuk variables ini sama sekali).
    const sharedVariables = { fitStatus: input.fitStatus, restrictionSummaryForSupervisor: input.restrictionSummaryForSupervisor ?? "" };
    await this.notificationService.enqueue({
      eventType: "OCCUPATIONAL_HEALTH_FIT_TO_WORK_UPDATED",
      entityType: "FIT_TO_WORK_ASSESSMENT",
      entityId: record.id,
      recipientUserId: input.employeeUserId,
      priority: "MEDIUM",
      eventCategory: "OCCUPATIONAL_HEALTH",
      variables: sharedVariables,
    });
    if (input.departmentId) {
      const supervisors = await this.prisma.withRls((tx) =>
        tx.user.findMany({
          where: { tenantId, status: "ACTIVE", departmentId: input.departmentId, userRoles: { some: { role: { roleCode: { in: ["SUPERVISOR", "DEPARTMENT_HEAD"] } } } } },
          select: { id: true },
        }),
      );
      for (const supervisor of supervisors) {
        await this.notificationService.enqueue({
          eventType: "OCCUPATIONAL_HEALTH_FIT_TO_WORK_UPDATED",
          entityType: "FIT_TO_WORK_ASSESSMENT",
          entityId: record.id,
          recipientUserId: supervisor.id,
          priority: "MEDIUM",
          eventCategory: "OCCUPATIONAL_HEALTH",
          variables: sharedVariables,
        });
      }
    }

    return this.toDecrypted(tenantId, record, input.restrictionDetails ?? null);
  }

  /** true kalau assessment ini WAJIB menghasilkan restricted_duty_assignments
   * (PRD §4.2 poin 3) — caller (mis. RestrictedDutyAssignmentService.create()
   * dipanggil Supervisor/Dept Head terpisah) yang bertindak atas info ini,
   * method ini TIDAK auto-create (assignment butuh assignedBy Supervisor +
   * alternative_task_description operasional yang bukan wewenang dokter). */
  requiresRestrictedDuty(fitStatus: OhFitStatus): boolean {
    return requiresRestrictedDutyAssignment(fitStatus);
  }

  async linkRestrictedDutyAssignment(id: string, restrictedDutyAssignmentId: string): Promise<void> {
    await this.prisma.withRls((tx) => tx.fitToWorkAssessment.update({ where: { id }, data: { linkedRestrictedDutyAssignmentId: restrictedDutyAssignmentId } }));
  }

  async transitionStatus(id: string, to: OhFitToWorkAssessmentStatus): Promise<void> {
    const actorUserId = requireActorUserId();
    const existing = await this.prisma.withRls((tx) => tx.fitToWorkAssessment.findUniqueOrThrow({ where: { id } }));
    validateFitToWorkAssessmentStatusTransition(existing.status, to);
    await this.prisma.withRls((tx) => tx.fitToWorkAssessment.update({ where: { id }, data: { status: to, updatedBy: actorUserId } }));
  }

  async getById(id: string, reasonForAccess: OhAccessReason, reasonNotes?: string): Promise<DecryptedFitToWorkAssessment> {
    const tenantId = requireTenantId();
    const record = await this.prisma.withRls((tx) => tx.fitToWorkAssessment.findUniqueOrThrow({ where: { id } }));

    await this.accessControl.assertPhiAccessAuthorized({ scopeType: "SITE", scopeId: record.siteId });

    await this.accessLog.recordAccess({
      subjectEmployeeUserId: record.employeeUserId,
      accessedEntityType: "FIT_TO_WORK_ASSESSMENT",
      accessedEntityId: record.id,
      accessType: "VIEW",
      reasonForAccess,
      reasonNotes,
    });

    return this.toDecrypted(tenantId, record);
  }

  /** BR-04 — boundary field. TIDAK memerlukan dual-gate BR-02/access-log
   * BR-01 (bukan data klinis mentah), TIDAK PERNAH fetch
   * restrictionDetailsEncrypted sama sekali (query eksplisit `select`,
   * bukan cuma "diabaikan setelah fetch" — kolom itu TIDAK ADA di hasil
   * query DB sama sekali). Dipakai Department Head/Supervisor
   * (occupational_health.fit_to_work.view_summary). */
  async getSummaryForSupervisor(id: string) {
    return this.prisma.withRls((tx) =>
      tx.fitToWorkAssessment.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          employeeUserId: true,
          fitStatus: true,
          restrictionSummaryForSupervisor: true,
          restrictionValidFrom: true,
          restrictionValidUntil: true,
          nextReassessmentDate: true,
          status: true,
        },
      }),
    );
  }

  async listDueForReassessment(asOfDate: Date): Promise<FitToWorkAssessment[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.fitToWorkAssessment.findMany({
        where: { tenantId, status: "ACTIVE", nextReassessmentDate: { lte: asOfDate }, reassessmentReminderSentAt: null },
      }),
    );
  }

  async markReassessmentReminderSent(id: string, sentAt: Date): Promise<void> {
    await this.prisma.withRls((tx) => tx.fitToWorkAssessment.update({ where: { id }, data: { reassessmentReminderSentAt: sentAt } }));
  }

  private async toDecrypted(tenantId: string, record: FitToWorkAssessment, restrictionDetailsHint?: string | null): Promise<DecryptedFitToWorkAssessment> {
    const { restrictionDetailsEncrypted, ...rest } = record;
    const restrictionDetails = restrictionDetailsHint !== undefined ? restrictionDetailsHint : await this.fieldEncryption.decrypt(tenantId, restrictionDetailsEncrypted);
    return { ...rest, restrictionDetails };
  }
}
