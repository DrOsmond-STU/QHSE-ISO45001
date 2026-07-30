import { Injectable } from "@nestjs/common";
import { GasTestResult, GasTestResultValue, GasType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./work-permit-context";

export interface RecordGasTestInput {
  workPermitId: string;
  gasType: GasType;
  readingValue: number;
  unit: string;
  acceptableMin?: number;
  acceptableMax?: number;
  result: GasTestResultValue;
  testDatetime: Date;
  retestDueAt?: Date;
  instrumentName: string;
  instrumentCalibrationRef?: string;
  testedBy: string;
  locationDetail?: string;
  notes?: string;
}

// Task 3.3 (Modul 06 §4 poin 6/§5/§6 BR-02). BELUM ada controller HTTP —
// work_permit.gas_test.record sudah di-seed RBAC baseline (task 129).
@Injectable()
export class GasTestResultService {
  constructor(private readonly prisma: PrismaService) {}

  /** PRD §11 "Timestamp gas_test_results.test_datetime harus tersinkron dgn
   * waktu server, bukan hanya waktu perangkat klien" — TIDAK diimplementasikan
   * sbg override paksa server-side (caller tetap bebas mengisi test_datetime
   * apa pun) — mem-force `new Date()` di sini akan membuat skenario
   * lapangan offline-first (PRD §11 poin 4, input gas test lalu sync
   * belakangan) mustahil merekam waktu pengukuran ASLI. Dibaca sbg
   * kebutuhan operasional/infra (clock sync perangkat klien), bukan
   * validasi aplikasi yang bisa ditegakkan aman di sini — gap TDD §26.
   *
   * Task 3.4 — `retestDueAt` SEKARANG DIHITUNG OTOMATIS dari
   * `work_permit_types.gasRetestIntervalHours` kalau tipe permit itu
   * mengharuskan retest berkala (BR-05) — caller BOLEH tetap override
   * eksplisit lewat `input.retestDueAt` (mis. kebijakan interval khusus
   * per pengukuran), auto-compute HANYA jalan kalau caller TIDAK mengisinya.
   * `GasRetestDueScanService` (task 3.4) membaca kolom ini langsung.
   */
  async record(input: RecordGasTestInput): Promise<GasTestResult> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      let retestDueAt = input.retestDueAt ?? null;
      if (!retestDueAt) {
        const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: input.workPermitId }, select: { workPermitTypeId: true } });
        const type = await tx.workPermitType.findUniqueOrThrow({ where: { id: permit.workPermitTypeId }, select: { gasRetestIntervalHours: true } });
        if (type.gasRetestIntervalHours !== null) {
          retestDueAt = new Date(input.testDatetime.getTime() + type.gasRetestIntervalHours * 60 * 60 * 1000);
        }
      }

      return tx.gasTestResult.create({
        data: {
          tenantId,
          workPermitId: input.workPermitId,
          gasType: input.gasType,
          readingValue: input.readingValue,
          unit: input.unit,
          acceptableMin: input.acceptableMin,
          acceptableMax: input.acceptableMax,
          result: input.result,
          testDatetime: input.testDatetime,
          retestDueAt,
          instrumentName: input.instrumentName,
          instrumentCalibrationRef: input.instrumentCalibrationRef,
          testedBy: input.testedBy,
          locationDetail: input.locationDetail,
          notes: input.notes,
          createdBy,
          updatedBy: createdBy,
        },
      });
    });
  }

  async listByPermit(workPermitId: string): Promise<GasTestResult[]> {
    return this.prisma.withRls((tx) => tx.gasTestResult.findMany({ where: { workPermitId }, orderBy: { testDatetime: "desc" } }));
  }
}
