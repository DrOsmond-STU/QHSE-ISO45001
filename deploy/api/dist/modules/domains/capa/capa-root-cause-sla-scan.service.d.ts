import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * PRD §8 "Root cause belum diisi mendekati SLA | PIC, HSE Manager". CAPA
 * TIDAK py kolom "PIC" tersendiri di capa_register (BEDA dari capa_action_plans.
 * pic_user_id) — disubstitusi capa_register.initiated_by (kandidat paling
 * plausible, orang yang membuat CAPA), pola sama AuditFindingClosureDueScanService
 * (4.1) mensubstitusi "PIC CAPA" dgn lead_auditor_id saat CAPA belum ada.
 * Struktur pola PERSIS LicenseExpiryScanService (2.2): idempotency
 * updateMany DI DALAM transaksi withRls, enqueue() loop DI LUAR (notification
 * service buka transaksinya sendiri — hindari nested $transaction, lihat
 * memory).
 */
export declare class CapaRootCauseSlaScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, notificationService: NotificationService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
}
