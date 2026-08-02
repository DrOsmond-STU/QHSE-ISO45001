import { EmergencyPersonType, MusterPointCheckin } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
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
export declare class MusterPointCheckinService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    /** BR-05 — checkin_timestamp direkam SERVER (new Date()) saat submit,
     * TIDAK PERNAH menerima nilai dari caller/body request (anti-manipulasi
     * waktu) — SATU-SATUNYA jalur checkin_method=SELF_APP_CHECKIN. */
    selfCheckin(input: SelfCheckinInput): Promise<MusterPointCheckin>;
    /** BR-05 — "checkin_method=MARSHAL_MANUAL_ENTRY wajib mencatat
     * recorded_by" — recordedBy diambil LANGSUNG dari actor context (Marshal
     * yang login memanggil method ini), bukan parameter caller-supplied
     * (mencegah pencatatan atas nama orang lain). PRD §6 BR-09 — pencocokan
     * status registrasi visitor aktif (Modul 18) TIDAK diimplementasikan
     * (Modul 18 belum ada, task 6.4) — checkinPersonName diisi manual Marshal
     * TANPA validasi silang, gap TDD §26. */
    marshalCheckin(input: MarshalCheckinInput): Promise<MusterPointCheckin>;
    listByActivation(emergencyActivationId: string): Promise<MusterPointCheckin[]>;
    listByActivationAndMusterPoint(emergencyActivationId: string, musterPointId: string): Promise<MusterPointCheckin[]>;
}
