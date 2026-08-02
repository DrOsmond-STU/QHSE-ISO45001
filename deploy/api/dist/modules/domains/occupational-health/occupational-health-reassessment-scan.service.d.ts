import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * PRD §8 baris 5 — "restricted_duty_assignments mendekati end_date | OH
 * Staff, Supervisor terkait | In-app" — diimplementasikan berbasis
 * fit_to_work_assessments.next_reassessment_date (§4.2 poin 4: "next_
 * reassessment_date memicu reminder otomatis") krn restricted_duty_
 * assignments SENDIRI tidak punya kolom reassessment (hanya start_date/
 * end_date operasional) — nextReassessmentDate ADALAH sumber tunggal
 * tanggal reassessment kelaikan kerja di skema ini, gap TDD §26. Supervisor
 * "terkait" = assignedBy pada restricted_duty_assignments TERTAUT (kalau ada).
 */
export declare class OccupationalHealthReassessmentScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, notificationService: NotificationService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
}
