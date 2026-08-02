export declare function requireActorUserId(): string;
export declare function requireTenantId(): string;
export declare function withCleanUniqueViolation<T>(fn: () => Promise<T>, message: string): Promise<T>;
