import { UsageCounter } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
export declare class UsageCounterService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    /** ACTIVE_USERS/ACTIVE_SITES — literal PRD §5 (2 metric_type). count()
     * murni menghitung ULANG saat ini (bukan increment/decrement stateful) —
     * snapshot independen tiap panggilan, pola sama semangat
     * system_audit_logs (fakta pada satu titik waktu). */
    snapshot(tenantId: string): Promise<UsageCounter[]>;
    latestForTenant(tenantId: string): Promise<UsageCounter[]>;
}
