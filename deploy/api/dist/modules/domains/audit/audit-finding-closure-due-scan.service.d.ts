import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * TDD §13.1/§9 pola job cross-tenant. PRD §8 "Tenggat closure NC mendekat |
 * PIC CAPA terkait, Audit Program Owner" — Modul 10 (CAPA, task 4.2) BELUM
 * ADA, jadi TIDAK ADA "PIC CAPA" genuinely tersimpan di mana pun (gap TDD
 * §26) — disubstitusi audits.lead_auditor_id (kandidat paling plausible
 * yang TAHU status temuan sebelum CAPA formal ada) + HSE_MANAGER tenant-wide
 * (Audit Program Owner stand-in, pola sama seluruh modul lain).
 */
export declare class AuditFindingClosureDueScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, notificationService: NotificationService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
}
