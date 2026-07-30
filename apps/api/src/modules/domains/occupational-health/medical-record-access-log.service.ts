import { Injectable } from "@nestjs/common";
import { OhAccessEntityType, OhAccessReason, OhAccessType } from "@prisma/client";
import { getCurrentIpAddress, getCurrentUserAgent } from "../../../platform/observability/request-context";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./occupational-health-context";

export interface RecordAccessInput {
  subjectEmployeeUserId: string;
  accessedEntityType: OhAccessEntityType;
  accessedEntityId: string;
  accessType: OhAccessType;
  reasonForAccess: OhAccessReason;
  reasonNotes?: string;
}

// BR-01 — "Setiap akses baca (VIEW/EXPORT/PRINT)... wajib tercatat...
// sistem MENOLAK MERENDER DATA jika penulisan log gagal (fail-closed)."
// Method ini TIDAK menangkap error sendiri — kalau INSERT gagal, exception
// menjalar apa adanya ke caller (mis. MedicalRecordService.getById()), yang
// harus memanggil recordAccess() SEBELUM mendekripsi/mengembalikan data:
// urutan "log dulu, baru render" ITU SENDIRI yang menegakkan fail-closed,
// bukan try/catch di sini.
@Injectable()
export class MedicalRecordAccessLogService {
  constructor(private readonly prisma: PrismaService) {}

  async recordAccess(input: RecordAccessInput): Promise<void> {
    const tenantId = requireTenantId();
    const accessedByUserId = requireActorUserId();

    await this.prisma.withRls((tx) =>
      tx.medicalRecordAccessLog.create({
        data: {
          tenantId,
          accessedByUserId,
          subjectEmployeeUserId: input.subjectEmployeeUserId,
          accessedEntityType: input.accessedEntityType,
          accessedEntityId: input.accessedEntityId,
          accessType: input.accessType,
          reasonForAccess: input.reasonForAccess,
          reasonNotes: input.reasonNotes,
          ipAddress: getCurrentIpAddress(),
          userAgent: getCurrentUserAgent(),
        },
      }),
    );
  }
}
