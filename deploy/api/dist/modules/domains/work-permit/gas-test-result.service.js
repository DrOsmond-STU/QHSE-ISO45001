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
exports.GasTestResultService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const work_permit_context_1 = require("./work-permit-context");
// Task 3.3 (Modul 06 §4 poin 6/§5/§6 BR-02). BELUM ada controller HTTP —
// work_permit.gas_test.record sudah di-seed RBAC baseline (task 129).
let GasTestResultService = class GasTestResultService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
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
    async record(input) {
        const createdBy = (0, work_permit_context_1.requireActorUserId)();
        const tenantId = (0, work_permit_context_1.requireTenantId)();
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
    async listByPermit(workPermitId) {
        return this.prisma.withRls((tx) => tx.gasTestResult.findMany({ where: { workPermitId }, orderBy: { testDatetime: "desc" } }));
    }
};
exports.GasTestResultService = GasTestResultService;
exports.GasTestResultService = GasTestResultService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GasTestResultService);
//# sourceMappingURL=gas-test-result.service.js.map