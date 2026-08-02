import { RedisProvider } from "./redis.provider";
import { SessionRecord, SessionStore } from "./session-store.interface";
export declare class RedisSessionStore implements SessionStore {
    private readonly redis;
    constructor(redis: RedisProvider);
    private key;
    get(userId: string, sessionId: string): Promise<SessionRecord | null>;
    set(userId: string, sessionId: string, record: SessionRecord, ttlSeconds: number): Promise<void>;
    delete(userId: string, sessionId: string): Promise<void>;
    deleteAllForUser(userId: string): Promise<void>;
}
