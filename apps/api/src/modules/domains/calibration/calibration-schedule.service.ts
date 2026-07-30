import { Injectable } from "@nestjs/common";
import { CalibrationSchedule, CalibrationScheduleStatus, NumberingConfig } from "@prisma/client";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./calibration-context";

const CALIBRATION_SCHEDULE_NUMBERING_MODULE_CODE = "CALIBRATION_WO";
const CALIBRATION_SCHEDULE_NUMBERING_PATTERN = "WO-CAL/{SITE_CODE}/{YYYY}/{SEQ:4}";

export interface CreateCalibrationScheduleInput {
  calibrationItemId: string;
  scheduledDate?: Date;
  dueDate: Date;
  assignedProviderId?: string;
  notes?: string;
}

export interface UpdateCalibrationScheduleInput {
  scheduledDate?: Date;
  dueDate?: Date;
  assignedProviderId?: string;
  status?: CalibrationScheduleStatus;
  notes?: string;
}

@Injectable()
export class CalibrationScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
  ) {}

  async ensureNumberingConfig(siteId: string): Promise<NumberingConfig> {
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      const existing = await tx.numberingConfig.findFirst({ where: { tenantId, moduleCode: CALIBRATION_SCHEDULE_NUMBERING_MODULE_CODE, scopeId: siteId } });
      if (existing) return existing;
      return tx.numberingConfig.create({
        data: {
          tenantId,
          moduleCode: CALIBRATION_SCHEDULE_NUMBERING_MODULE_CODE,
          pattern: CALIBRATION_SCHEDULE_NUMBERING_PATTERN,
          prefix: "WO-CAL",
          resetPeriod: "YEARLY",
          scopeLevel: "SITE",
          scopeId: siteId,
        },
      });
    });
  }

  async create(input: CreateCalibrationScheduleInput): Promise<CalibrationSchedule> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    const item = await this.prisma.withRls((tx) => tx.calibrationItem.findUniqueOrThrow({ where: { id: input.calibrationItemId }, select: { siteId: true } }));

    await this.ensureNumberingConfig(item.siteId);
    // Pelajaran task 6.1 (gap TDD §26) — {SITE_CODE} WAJIB disuplai lewat
    // variables, TIDAK PERNAH silently gagal render kalau lupa.
    const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: item.siteId }, select: { siteCode: true } }));
    const calibrationWoNo = await this.numbering.generateNext(CALIBRATION_SCHEDULE_NUMBERING_MODULE_CODE, {
      scopeId: item.siteId,
      variables: { SITE_CODE: site.siteCode },
    });

    return this.prisma.withRls((tx) =>
      tx.calibrationSchedule.create({
        data: {
          tenantId,
          calibrationItemId: input.calibrationItemId,
          calibrationWoNo,
          scheduledDate: input.scheduledDate,
          dueDate: input.dueDate,
          assignedProviderId: input.assignedProviderId,
          notes: input.notes,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async update(id: string, input: UpdateCalibrationScheduleInput): Promise<CalibrationSchedule> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.calibrationSchedule.update({
        where: { id },
        data: {
          scheduledDate: input.scheduledDate,
          dueDate: input.dueDate,
          // due_date diubah manual (mis. ditunda) — SELURUH kolom
          // idempotency reminder + overdue ikut reset, pola sama
          // MaintenanceScheduleService.update() 6.1 (gap TDD §26).
          reminderSentAtDay30: input.dueDate ? null : undefined,
          reminderSentAtDay14: input.dueDate ? null : undefined,
          reminderSentAtDay7: input.dueDate ? null : undefined,
          reminderSentAtDay1: input.dueDate ? null : undefined,
          overdueNotifiedAt: input.dueDate ? null : undefined,
          assignedProviderId: input.assignedProviderId,
          status: input.status,
          notes: input.notes,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async getById(id: string): Promise<CalibrationSchedule> {
    return this.prisma.withRls((tx) => tx.calibrationSchedule.findUniqueOrThrow({ where: { id } }));
  }

  async listByItem(calibrationItemId: string): Promise<CalibrationSchedule[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.calibrationSchedule.findMany({ where: { tenantId, calibrationItemId, deletedAt: null }, orderBy: { dueDate: "desc" } }),
    );
  }
}
