import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * TDD §13.1/§9 pola job cross-tenant (sama persis LicenseExpiryScanService
 * 2.2, versi lebih sederhana — TANPA tier reminder krn auditor_competency_records
 * tidak punya kolom idempotency, lihat banner comment auditor-competency-
 * expiry-scan.ts). PRD §8 "Kompetensi auditor akan kedaluwarsa | Auditor
 * terkait, Tenant Admin" — Auditor terkait = competency_records.user_id
 * sendiri, "Tenant Admin" dibaca literal role TENANT_ADMIN (BEDA dari
 * pemetaan "Tenant Admin/HR" -> TENANT_ADMIN di RBAC, di sini PRD §8
 * SUDAH eksplisit sebut "Tenant Admin" tanpa "/HR", jadi tanpa interpretasi
 * tambahan).
 */
export declare class AuditorCompetencyExpiryScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, notificationService: NotificationService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
}
