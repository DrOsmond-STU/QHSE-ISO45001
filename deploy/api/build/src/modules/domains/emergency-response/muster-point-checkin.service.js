"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusterPointCheckinService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const emergency_response_context_1 = require("./emergency-response-context");
// UserType (Modul 02) INTERNAL_EMPLOYEE/CONTRACTOR/VISITOR/PLATFORM_ADMIN
// vs EmergencyPersonType (Modul 14, sengaja disederhanakan lintas 2 tabel
// PRD §5 sendiri, lihat schema.prisma) EMPLOYEE/CONTRACTOR/VISITOR — beda
// literal string utk konsep yang sama, dipetakan di sini.
const USER_TYPE_TO_EMERGENCY_PERSON_TYPE = {
    INTERNAL_EMPLOYEE: "EMPLOYEE",
    CONTRACTOR: "CONTRACTOR",
    VISITOR: "VISITOR",
};
// Task 3.7 (Modul 14 §4.4 poin 2/§6 BR-05). Inti kebutuhan "digital penuh"
// modul ini (PRD §5 banner "self check-in via aplikasi"). BELUM ada
// controller HTTP.
let MusterPointCheckinService = class MusterPointCheckinService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /** BR-05 — checkin_timestamp direkam SERVER (new Date()) saat submit,
     * TIDAK PERNAH menerima nilai dari caller/body request (anti-manipulasi
     * waktu) — SATU-SATUNYA jalur checkin_method=SELF_APP_CHECKIN. */
    async selfCheckin(input) {
        const userId = (0, emergency_response_context_1.requireActorUserId)();
        const tenantId = (0, emergency_response_context_1.requireTenantId)();
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
    async marshalCheckin(input) {
        const recordedBy = (0, emergency_response_context_1.requireActorUserId)();
        const tenantId = (0, emergency_response_context_1.requireTenantId)();
        if (!input.checkinPersonName.trim()) {
            throw new common_1.BadRequestException("checkin_person_name wajib diisi utk checkin_method=MARSHAL_MANUAL_ENTRY.");
        }
        return this.prisma.withRls((tx) => tx.musterPointCheckin.create({
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
        }));
    }
    async listByActivation(emergencyActivationId) {
        return this.prisma.withRls((tx) => tx.musterPointCheckin.findMany({ where: { emergencyActivationId }, orderBy: { checkinTimestamp: "asc" } }));
    }
    async listByActivationAndMusterPoint(emergencyActivationId, musterPointId) {
        return this.prisma.withRls((tx) => tx.musterPointCheckin.findMany({ where: { emergencyActivationId, musterPointId }, orderBy: { checkinTimestamp: "asc" } }));
    }
};
exports.MusterPointCheckinService = MusterPointCheckinService;
exports.MusterPointCheckinService = MusterPointCheckinService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MusterPointCheckinService);
