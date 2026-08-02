import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../../platform/observability/app-logger.service";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
export declare class DelegationScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
    private activateScheduled;
    private expireActive;
    /**
     * roleId NULL ("seluruh role delegator", PRD §5) me-reroute SEMUA task
     * PENDING milik delegator di stage manapun yang allowDelegation=true —
     * intent-nya "serahkan seluruh pekerjaan approval saya" (mis. cuti),
     * bukan cuma satu role. roleId TERISI mempersempit ke stage yang
     * approver_role_id-nya PERSIS cocok (delegasi eksplisit dibatasi satu
     * role, PRD §5 "batasi delegasi hanya untuk role tertentu").
     *
     * TIDAK mempersempit dgn scope_type/scope_id — workflow_tasks tidak
     * membawa referensi scope organisasi langsung (cuma
     * workflow_instances.entityType/entityId polymorphic ke tabel domain,
     * platform TIDAK BOLEH tahu bentuknya per modul) — gap didokumentasikan
     * TDD §26, pola sama keterbatasan scope ApproverResolutionService
     * (gap #23) yang sudah ada sejak 1.1.
     */
    private rerouteExistingPendingTasks;
}
