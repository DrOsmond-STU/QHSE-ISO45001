import { UserStatus, UserType } from "@prisma/client";
export declare class UserLifecycleError extends Error {
}
export declare function validateUserStatusTransition(from: UserStatus, to: UserStatus): void;
export declare function validateTenantIdForUserType(userType: UserType, tenantId: string | null): void;
