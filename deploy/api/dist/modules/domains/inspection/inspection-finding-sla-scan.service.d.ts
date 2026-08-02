import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * TDD §13.1/§9 pola job cross-tenant. BR-04 — "temuan severity=HIGH wajib
 * memiliki action_tracking_id terisi dalam SLA 24 jam sejak identified_at,
 * ATAU sistem mengeskalasi notifikasi ke HSE Manager." BEDA dari 2 scan
 * lain modul ini — TIDAK ADA transisi status di sini (inspection_findings.status
 * TETAP OPEN/apa pun adanya), BR-04 murni eskalasi NOTIFIKASI. Konsekuensi:
 * TIDAK ADA kolom idempotency tracking (pola sama gap H-30-menit gas
 * retest Work Permit 3.4) — finding yang SAMA akan terus dinotifikasi
 * ULANG SETIAP SCAN sampai action_tracking_id terisi atau status=CLOSED,
 * dibaca sbg "nag harian" yang genuinely masuk akal utk severity HIGH yang
 * belum ditindaklanjuti (bukan bug, tapi beda dari precedent scan lain,
 * gap didokumentasikan TDD §26).
 */
export declare class InspectionFindingSlaScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, notificationService: NotificationService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
}
