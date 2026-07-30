import { BadRequestException, Injectable } from "@nestjs/common";
import { EmergencyPersonType, MusterPointCheckin, UserType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./emergency-response-context";

export interface SelfCheckinInput {
  siteId: string;
  musterPointId: string;
  emergencyActivationId: string;
  gpsLat?: number;
  gpsLong?: number;
  deviceInfo?: string;
}

export interface MarshalCheckinInput {
  siteId: string;
  musterPointId: string;
  emergencyActivationId: string;
  checkinPersonName: string;
  checkinPersonType?: EmergencyPersonType;
}

// UserType (Modul 02) INTERNAL_EMPLOYEE/CONTRACTOR/VISITOR/PLATFORM_ADMIN
// vs EmergencyPersonType (Modul 14, sengaja disederhanakan lintas 2 tabel
// PRD §5 sendiri, lihat schema.prisma) EMPLOYEE/CONTRACTOR/VISITOR — beda
// literal string utk konsep yang sama, dipetakan di sini.
const USER_TYPE_TO_EMERGENCY_PERSON_TYPE: Partial<Record<UserType, EmergencyPersonType>> = {
  INTERNAL_EMPLOYEE: "EMPLOYEE",
  CONTRACTOR: "CONTRACTOR",
  VISITOR: "VISITOR",
};

// Task 3.7 (Modul 14 §4.4 poin 2/§6 BR-05). Inti kebutuhan "digital penuh"
// modul ini (PRD §5 banner "self check-in via aplikasi"). BELUM ada
// controller HTTP.
@Injectable()
export class MusterPointCheckinService {
  constructor(private readonly prisma: PrismaService) {}

  /** BR-05 — checkin_timestamp direkam SERVER (new Date()) saat submit,
   * TIDAK PERNAH menerima nilai dari caller/body request (anti-manipulasi
   * waktu) — SATU-SATUNYA jalur checkin_method=SELF_APP_CHECKIN. */
  async selfCheckin(input: SelfCheckinInput): Promise<MusterPointCheckin> {
    const userId = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { userType: true } });
      return tx.musterPointCheckin.create({
        data: {
          tenantId,
          siteId: input.siteId,
          musterPointId: input.musterPointId,
          emergencyActivationId: input.emergencyActivationId,
          userId,
          checkinPersonType: USER_TYPE_TO_EMERGENCY_PERSON_TYPE[user.userType],
          checkinTimestamp: new Date(),
          checkinMethod: "SELF_APP_CHECKIN",
          gpsLat: input.gpsLat,
          gpsLong: input.gpsLong,
          deviceInfo: input.deviceInfo,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    });
  }

  /** BR-05 — "checkin_method=MARSHAL_MANUAL_ENTRY wajib mencatat
   * recorded_by" — recordedBy diambil LANGSUNG dari actor context (Marshal
   * yang login memanggil method ini), bukan parameter caller-supplied
   * (mencegah pencatatan atas nama orang lain). PRD §6 BR-09 — pencocokan
   * status registrasi visitor aktif (Modul 18) TIDAK diimplementasikan
   * (Modul 18 belum ada, task 6.4) — checkinPersonName diisi manual Marshal
   * TANPA validasi silang, gap TDD §26. */
  async marshalCheckin(input: MarshalCheckinInput): Promise<MusterPointCheckin> {
    const recordedBy = requireActorUserId();
    const tenantId = requireTenantId();
    if (!input.checkinPersonName.trim()) {
      throw new BadRequestException("checkin_person_name wajib diisi utk checkin_method=MARSHAL_MANUAL_ENTRY.");
    }
    return this.prisma.withRls((tx) =>
      tx.musterPointCheckin.create({
        data: {
          tenantId,
          siteId: input.siteId,
          musterPointId: input.musterPointId,
          emergencyActivationId: input.emergencyActivationId,
          checkinPersonName: input.checkinPersonName,
          checkinPersonType: input.checkinPersonType,
          checkinTimestamp: new Date(),
          checkinMethod: "MARSHAL_MANUAL_ENTRY",
          recordedBy,
          createdBy: recordedBy,
          updatedBy: recordedBy,
        },
      }),
    );
  }

  async listByActivation(emergencyActivationId: string): Promise<MusterPointCheckin[]> {
    return this.prisma.withRls((tx) =>
      tx.musterPointCheckin.findMany({ where: { emergencyActivationId }, orderBy: { checkinTimestamp: "asc" } }),
    );
  }

  async listByActivationAndMusterPoint(emergencyActivationId: string, musterPointId: string): Promise<MusterPointCheckin[]> {
    return this.prisma.withRls((tx) =>
      tx.musterPointCheckin.findMany({ where: { emergencyActivationId, musterPointId }, orderBy: { checkinTimestamp: "asc" } }),
    );
  }
}
