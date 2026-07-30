import { Injectable } from "@nestjs/common";
import { McuSchedule, OhMcuScheduleStatus, OhMcuType } from "@prisma/client";
import { FieldEncryptionService } from "../../../platform/field-encryption/field-encryption.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { validateMcuScheduleStatusTransition } from "./mcu-lifecycle";
import { requireActorUserId, requireTenantId } from "./occupational-health-context";

export interface CreateMcuScheduleInput {
  siteId: string;
  departmentId?: string;
  employeeUserId: string;
  mcuType: OhMcuType;
  scheduledDate: Date;
  mcuPackageCode?: string;
  mcuPackageName?: string;
  reasonForSpecial?: string;
  providerClinicName?: string;
  linkedHealthSurveillanceProgramId?: string;
}

export type DecryptedMcuSchedule = Omit<McuSchedule, "reasonForSpecialEncrypted"> & { reasonForSpecial: string | null };

// mcu_schedules SENGAJA TIDAK melalui dual-gate BR-02/access-log BR-01 —
// enum accessed_entity_type (§5) TIDAK menyertakan mcu_schedules (hanya
// MEDICAL_RECORD/MCU_RESULT/FIT_TO_WORK_ASSESSMENT/PAK_CASE/CLINIC_VISIT),
// metadata jadwal (tanggal/tipe/paket) jauh lebih tidak sensitif drpd hasil
// klinis. reasonForSpecial TETAP [ENCRYPTED] (BR-05 berlaku ke SEMUA kolom
// bertanda itu terlepas dari gating entitasnya) — enkripsi != gating akses,
// dua kontrol independen.
@Injectable()
export class McuScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fieldEncryption: FieldEncryptionService,
  ) {}

  async create(input: CreateMcuScheduleInput): Promise<DecryptedMcuSchedule> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();
    const reasonForSpecialEncrypted = await this.fieldEncryption.encrypt(tenantId, input.reasonForSpecial);

    const record = await this.prisma.withRls((tx) =>
      tx.mcuSchedule.create({
        data: {
          tenantId,
          siteId: input.siteId,
          departmentId: input.departmentId,
          employeeUserId: input.employeeUserId,
          mcuType: input.mcuType,
          scheduledDate: input.scheduledDate,
          mcuPackageCode: input.mcuPackageCode,
          mcuPackageName: input.mcuPackageName,
          reasonForSpecialEncrypted,
          providerClinicName: input.providerClinicName,
          linkedHealthSurveillanceProgramId: input.linkedHealthSurveillanceProgramId,
          status: "SCHEDULED",
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
    return this.toDecrypted(tenantId, record, input.reasonForSpecial ?? null);
  }

  async transitionStatus(id: string, to: OhMcuScheduleStatus): Promise<DecryptedMcuSchedule> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();
    const existing = await this.prisma.withRls((tx) => tx.mcuSchedule.findUniqueOrThrow({ where: { id } }));
    validateMcuScheduleStatusTransition(existing.status, to);

    const record = await this.prisma.withRls((tx) =>
      tx.mcuSchedule.update({ where: { id }, data: { status: to, updatedBy: actorUserId } }),
    );
    return this.toDecrypted(tenantId, record);
  }

  async reschedule(id: string, newScheduledDate: Date): Promise<DecryptedMcuSchedule> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();
    const existing = await this.prisma.withRls((tx) => tx.mcuSchedule.findUniqueOrThrow({ where: { id } }));
    validateMcuScheduleStatusTransition(existing.status, "RESCHEDULED");

    const record = await this.prisma.withRls((tx) =>
      tx.mcuSchedule.update({
        where: { id },
        data: { status: "RESCHEDULED", scheduledDate: newScheduledDate, updatedBy: actorUserId },
      }),
    );
    return this.toDecrypted(tenantId, record);
  }

  async markReminderSent(id: string): Promise<void> {
    await this.prisma.withRls((tx) => tx.mcuSchedule.update({ where: { id }, data: { reminderSentAt: new Date() } }));
  }

  async getById(id: string): Promise<DecryptedMcuSchedule> {
    const tenantId = requireTenantId();
    const record = await this.prisma.withRls((tx) => tx.mcuSchedule.findUniqueOrThrow({ where: { id } }));
    return this.toDecrypted(tenantId, record);
  }

  async listByEmployee(employeeUserId: string): Promise<DecryptedMcuSchedule[]> {
    const tenantId = requireTenantId();
    const rows = await this.prisma.withRls((tx) =>
      tx.mcuSchedule.findMany({ where: { tenantId, employeeUserId }, orderBy: { scheduledDate: "desc" } }),
    );
    return Promise.all(rows.map((row) => this.toDecrypted(tenantId, row)));
  }

  async listBySite(siteId: string, status?: OhMcuScheduleStatus): Promise<DecryptedMcuSchedule[]> {
    const tenantId = requireTenantId();
    const rows = await this.prisma.withRls((tx) =>
      tx.mcuSchedule.findMany({ where: { tenantId, siteId, status }, orderBy: { scheduledDate: "asc" } }),
    );
    return Promise.all(rows.map((row) => this.toDecrypted(tenantId, row)));
  }

  private async toDecrypted(tenantId: string, record: McuSchedule, reasonForSpecialHint?: string | null): Promise<DecryptedMcuSchedule> {
    const { reasonForSpecialEncrypted, ...rest } = record;
    const reasonForSpecial = reasonForSpecialHint !== undefined ? reasonForSpecialHint : await this.fieldEncryption.decrypt(tenantId, reasonForSpecialEncrypted);
    return { ...rest, reasonForSpecial };
  }
}
