import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * PRD §8 baris 1-2 — "next_due_date mendekati (H-7)" + "Maintenance
 * terlambat (overdue)", KEDUANYA date-driven dari maintenance_schedules.next_due_date
 * yang SAMA, digabung SATU scan pass (pola beda dari modul lain yang selalu
 * satu event per scan job — di sini dua event literal PRD berbagi satu
 * kolom tanggal sumber, jadi satu query cukup). Struktur pola PERSIS
 * WasteStorageDurationScanService (5.2): idempotency updateMany DI DALAM
 * transaksi withRls, enqueue() loop DI LUAR (hindari nested $transaction).
 * Penerima "Facility Officer/PIC" (§8) dibaca sbg maintenance_schedules.responsible_role_id
 * kalau diisi (PRD §5 "Default PIC"), fallback SUPERVISOR (pemetaan
 * "Facility Officer" -> SUPERVISOR, pola sama Emergency Response 3.7) kalau
 * NULL — gap TDD §26 (PRD tidak eksplisit jelaskan resolusi ini).
 */
export declare class MaintenanceDueScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, notificationService: NotificationService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
}
