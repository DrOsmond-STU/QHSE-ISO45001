import { GasTestResult, GasTestResultValue, GasType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
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
export declare class GasTestResultService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    record(input: RecordGasTestInput): Promise<GasTestResult>;
    listByPermit(workPermitId: string): Promise<GasTestResult[]>;
}
