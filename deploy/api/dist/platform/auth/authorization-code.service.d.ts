import { OnModuleDestroy } from "@nestjs/common";
import { RedisProvider } from "./redis.provider";
export interface AuthCodeRecord {
    userId: string;
    tenantId: string;
    codeChallenge: string;
    codeChallengeMethod: "S256";
}
export declare class AuthorizationCodeService implements OnModuleDestroy {
    private readonly redis;
    private readonly adminPrisma;
    constructor(redis: RedisProvider);
    onModuleDestroy(): Promise<void>;
    issue(record: AuthCodeRecord): Promise<string>;
    /**
     * Konsumsi sekali pakai. Redis 5.0.14 (portable Windows build dipakai dev
     * lokal) belum punya GETDEL (baru ada sejak Redis 6.2) — dipakai GET+DEL
     * manual. Race window ini diterima untuk auth code berumur 60 detik
     * (bukan secret jangka panjang seperti refresh token). Jalur DB
     * (REDIS_ENABLED=false) pakai deleteMany+return sebelum delete utk alasan
     * race window yang sama — bukan SELECT...FOR UPDATE, konsisten trade-off
     * yang sudah diterima jalur Redis.
     */
    consume(code: string): Promise<AuthCodeRecord | null>;
}
