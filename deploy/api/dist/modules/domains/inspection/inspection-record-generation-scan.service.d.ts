import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { InspectionRecordService } from "./inspection-record.service";
/**
 * TDD §13.1/§9 pola job cross-tenant. PRD §4 poin 2-3 — generator instance
 * inspection_records dari inspection_schedules aktif. Aktor "createdBy"
 * baris inspection_records yang digenerate = createdBy BARIS JADWAL itu
 * sendiri (siapa pun HSE Manager yang membuat jadwal) — job cross-tenant
 * TIDAK punya aktor manusia sungguhan, pola INI (bukan admin/system user
 * generik yang tidak ada di skema) dipilih krn createdBy/updatedBy WAJIB
 * FK valid ke users, gap TDD §26. Jadwal TANPA default_assigned_inspector_id
 * DILEWATI (inspector_id kolom NOT NULL, tidak bisa digenerate otomatis).
 * CUSTOM_CRON DILEWATI SELURUHNYA (bukan cuma next_generation_date-nya
 * tidak di-advance) — kalau tetap digenerate tanpa next_generation_date
 * maju, jadwal itu akan "due" lagi di scan BERIKUTNYA dan menghasilkan
 * record BARU SETIAP HARI tanpa henti; melewati generation-nya sepenuhnya
 * lebih aman drpd bug generation tak terbatas, gap TDD §26 (butuh
 * cron-expression parser, di luar cakupan task ini).
 */
export declare class InspectionRecordGenerationScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly recordService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, recordService: InspectionRecordService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
}
