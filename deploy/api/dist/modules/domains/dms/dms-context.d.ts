export declare function requireActorUserId(): string;
export declare function requireTenantId(): string;
/** BR-02 (Modul 03 §6, mis. document_categories unik per tenant) ditegakkan
 * lewat unique index DB (schema.prisma) — helper ini cuma menerjemahkan
 * P2002 jadi error yang jelas maksudnya, bukan constraint tambahan di sini. */
export declare function withCleanUniqueViolation<T>(fn: () => Promise<T>, message: string): Promise<T>;
