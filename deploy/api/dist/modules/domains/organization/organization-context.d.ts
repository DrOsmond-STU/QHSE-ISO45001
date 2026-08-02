export declare function requireActorUserId(): string;
/** withRls() SENDIRI sudah fail-closed kalau tenant context kosong (dicek
 * SEBELUM callback ini bahkan jalan) — helper ini cuma mengambil NILAI-nya
 * utk disertakan eksplisit di data create() (RLS bukan pengganti kolom
 * tenant_id di INSERT, keduanya wajib, pola sama modul lain). */
export declare function requireTenantId(): string;
/** BR-02 (PRD Modul 01 §6) diegakkan lewat unique index DB (schema.prisma) —
 * helper ini cuma menerjemahkan P2002 jadi error yang jelas maksudnya,
 * bukan constraint tambahan di sini. */
export declare function withCleanUniqueViolation<T>(fn: () => Promise<T>, message: string): Promise<T>;
