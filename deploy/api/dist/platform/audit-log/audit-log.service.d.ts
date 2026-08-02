import { Prisma } from "@prisma/client";
import { PrismaService } from "../tenancy/prisma.service";
export interface AuditLogEntry {
    action: string;
    entityType: string;
    entityId?: string;
    beforeValue?: Prisma.InputJsonValue;
    afterValue?: Prisma.InputJsonValue;
}
export declare class AuditLogService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    record(tx: Prisma.TransactionClient, entry: AuditLogEntry): Promise<void>;
    /**
     * Convenience untuk pemanggil yang BELUM berada di dalam withRls() milik
     * sendiri (mis. AuthService mencatat event LOGIN yang tidak selalu
     * memodifikasi baris lain). Membuka transaksi withRls() SENDIRI — kalau
     * caller SUDAH punya tx aktif, pakai record(tx, entry) langsung supaya
     * tetap dalam transaksi yang sama (atomicity), JANGAN panggil ini nested.
     */
    recordStandalone(entry: AuditLogEntry): Promise<void>;
}
