import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../observability/app-logger.service";
export declare class AuditLogPartitionMaintenanceService implements OnModuleDestroy {
    private readonly logger;
    private readonly adminPrisma;
    constructor(logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    /**
     * Idempotent — aman dipanggil berkali-kali (TDD §13.2, semua job wajib
     * idempotent). Memastikan partisi bulan INI dan bulan BERIKUTNYA ada
     * (bukan cuma "bulan berikutnya" harfiah) — buffer 2 bulan supaya sekali
     * gagal/telat jalan (mis. proses worker down beberapa hari) tidak
     * langsung membuat INSERT gagal karena tidak ada partisi yang cocok.
     */
    run(now?: Date): Promise<void>;
    private ensurePartition;
    private partitionExists;
}
