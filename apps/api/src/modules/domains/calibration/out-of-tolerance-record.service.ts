import { BadRequestException, Injectable } from "@nestjs/common";
import { CalibrationCertificate, CalibrationItem, OotImpactLevel, OutOfToleranceRecord } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./calibration-context";
import { canCloseOutOfToleranceRecord, isCapaRequiredAfterImpactAssessment, isCapaRequiredAtOotCreation } from "./calibration-lifecycle";

export interface AssessImpactInput {
  potentialImpactAssessment?: string;
  affectedPeriodFrom?: Date;
  affectedPeriodTo?: Date;
  impactLevel: OotImpactLevel;
  // §4.2 poin 3 — "mengindikasikan hasil pengukuran K3 sudah dipakai utk
  // keputusan lapangan" bersifat KUALITATIF/evaluatif (PRD tidak beri
  // formula deterministik spt requires_capa), jadi TIDAK diturunkan
  // otomatis — assessor (HSE/Quality Officer) yang menentukan, gap TDD §26.
  requiresIncidentReport?: boolean;
}

@Injectable()
export class OutOfToleranceRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  // BR-04 — dipanggil CalibrationCertificateService.create() saat
  // calibration_result=FAIL, OTOMATIS TIDAK BISA di-skip caller.
  async createFromFailedCertificate(certificate: CalibrationCertificate, item: CalibrationItem): Promise<OutOfToleranceRecord> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    const record = await this.prisma.withRls((tx) =>
      tx.outOfToleranceRecord.create({
        data: {
          tenantId,
          calibrationCertificateId: certificate.id,
          calibrationItemId: item.id,
          deviationDescription: `Hasil kalibrasi FAIL — sertifikat ${certificate.certificateNo}, item ${item.equipmentTagNo ?? item.id}.`,
          // BR-06 (§6 literal, saat create — lihat banner comment
          // calibration-lifecycle.ts).
          requiresCapa: isCapaRequiredAtOotCreation(item.isCriticalMeasurement),
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );

    const recipients = await this.prisma.withRls((tx) =>
      tx.user.findMany({
        where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: { in: ["HSE_MANAGER", "HSE_OFFICER"] } } } } },
        select: { id: true },
      }),
    );
    for (const recipient of recipients) {
      await this.notificationService.enqueue({
        eventType: "CALIBRATION_RESULT_FAIL",
        entityType: "OUT_OF_TOLERANCE_RECORD",
        entityId: record.id,
        recipientUserId: recipient.id,
        priority: "HIGH",
        eventCategory: "CALIBRATION",
        variables: { equipmentTagNo: item.equipmentTagNo ?? "", certificateNo: certificate.certificateNo },
      });
    }

    return record;
  }

  // §4.2 poin 2 — penilaian dampak, status -> ASSESSED. Re-evaluasi
  // requires_capa via OR penuh (kritis DAN/ATAU impact MEDIUM/HIGH/CRITICAL).
  async assessImpact(id: string, input: AssessImpactInput): Promise<OutOfToleranceRecord> {
    const actorUserId = requireActorUserId();
    const record = await this.prisma.withRls((tx) => tx.outOfToleranceRecord.findUniqueOrThrow({ where: { id } }));
    const item = await this.prisma.withRls((tx) => tx.calibrationItem.findUniqueOrThrow({ where: { id: record.calibrationItemId } }));

    return this.prisma.withRls((tx) =>
      tx.outOfToleranceRecord.update({
        where: { id },
        data: {
          potentialImpactAssessment: input.potentialImpactAssessment,
          affectedPeriodFrom: input.affectedPeriodFrom,
          affectedPeriodTo: input.affectedPeriodTo,
          impactLevel: input.impactLevel,
          requiresCapa: isCapaRequiredAfterImpactAssessment(item.isCriticalMeasurement, input.impactLevel),
          requiresIncidentReport: input.requiresIncidentReport ?? false,
          status: "ASSESSED",
          updatedBy: actorUserId,
        },
      }),
    );
  }

  // §4.2 poin 3 — CAPA wajib dibuat (caller: UI tombol "Buat CAPA", bawa
  // konteks OOT — di luar cakupan task ini krn belum ada controller HTTP
  // manapun sesi ini, pola sama seluruh modul domain lain). Status ->
  // CAPA_INITIATED (linking CAPA ADALAH milestone-nya).
  async linkCapaRegister(id: string, capaRegisterId: string): Promise<OutOfToleranceRecord> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.outOfToleranceRecord.update({
        where: { id },
        data: { capaRegisterId, status: "CAPA_INITIATED", updatedBy: actorUserId },
      }),
    );
  }

  async linkIncidentReport(id: string, incidentReportId: string): Promise<OutOfToleranceRecord> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) => tx.outOfToleranceRecord.update({ where: { id }, data: { incidentReportId, updatedBy: actorUserId } }));
  }

  // BR-07 — TIDAK BISA CLOSED kalau requires_capa=true tapi linked_capa_id kosong.
  async close(id: string): Promise<OutOfToleranceRecord> {
    const actorUserId = requireActorUserId();
    const record = await this.prisma.withRls((tx) => tx.outOfToleranceRecord.findUniqueOrThrow({ where: { id } }));

    if (!canCloseOutOfToleranceRecord(record.requiresCapa, record.capaRegisterId)) {
      throw new BadRequestException("BR-07 — out_of_tolerance_records tidak dapat CLOSED: requires_capa=true tapi linked_capa_id masih kosong.");
    }

    return this.prisma.withRls((tx) =>
      tx.outOfToleranceRecord.update({
        where: { id },
        data: { status: "CLOSED", closedBy: actorUserId, closedAt: new Date(), updatedBy: actorUserId },
      }),
    );
  }

  async getById(id: string): Promise<OutOfToleranceRecord> {
    return this.prisma.withRls((tx) => tx.outOfToleranceRecord.findUniqueOrThrow({ where: { id } }));
  }
}
