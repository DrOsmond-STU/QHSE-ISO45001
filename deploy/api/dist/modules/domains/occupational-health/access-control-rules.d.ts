import { OhAuthorizationStatus } from "@prisma/client";
export interface AuthorizedUserRow {
    status: OhAuthorizationStatus;
    expiryDate: Date | null;
    revokedAt: Date | null;
}
export declare function isAuthorizationActive(row: AuthorizedUserRow, asOfDate: Date): boolean;
