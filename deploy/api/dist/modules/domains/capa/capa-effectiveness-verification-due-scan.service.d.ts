import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * PRD §8 "Verifikasi efektivitas jatuh tempo | Verifier, HSE Manager".
 * Struktur pola PERSIS CapaRootCauseSlaScanService/LicenseExpiryScanService.
 */
export declare class CapaEffectivenessVerificationDueScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, notificationService: NotificationService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
}
