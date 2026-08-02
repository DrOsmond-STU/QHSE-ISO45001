export interface SessionRecord {
    tenantId: string;
    currentSecretHash: string;
}
export interface SessionStore {
    get(userId: string, sessionId: string): Promise<SessionRecord | null>;
    set(userId: string, sessionId: string, record: SessionRecord, ttlSeconds: number): Promise<void>;
    delete(userId: string, sessionId: string): Promise<void>;
    deleteAllForUser(userId: string): Promise<void>;
}
export declare const SESSION_STORE: unique symbol;
