import { AsyncLocalStorage } from "node:async_hooks";
export interface TenantContextStore {
    tenantId: string;
    userId?: string;
}
export declare const tenantContextStorage: AsyncLocalStorage<TenantContextStore>;
export declare function getCurrentTenantId(): string | undefined;
export declare function getCurrentUserId(): string | undefined;
