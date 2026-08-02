import { OnModuleDestroy } from "@nestjs/common";
import { SessionRecord, SessionStore } from "./session-store.interface";
export declare class DbSessionStore implements SessionStore, OnModuleDestroy {
    private readonly adminPrisma;
    constructor();
    onModuleDestroy(): Promise<void>;
    get(userId: string, sessionId: string): Promise<SessionRecord | null>;
    set(userId: string, sessionId: string, record: SessionRecord, ttlSeconds: number): Promise<void>;
    delete(userId: string, sessionId: string): Promise<void>;
    deleteAllForUser(userId: string): Promise<void>;
}
