import { OccupationalHealthAuthorizedUser, OhAuthorizedScopeType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface GrantAuthorizationInput {
    userId: string;
    authorizedScopeType: OhAuthorizedScopeType;
    authorizedScopeId: string;
    medicalPractitionerLicenseNo?: string;
    authorizationReason: string;
    expiryDate?: Date;
}
export declare class OccupationalHealthAuthorizedUserService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    grant(input: GrantAuthorizationInput): Promise<OccupationalHealthAuthorizedUser>;
    revoke(id: string, revokeReason: string): Promise<OccupationalHealthAuthorizedUser>;
    markExpired(id: string): Promise<OccupationalHealthAuthorizedUser>;
    getById(id: string): Promise<OccupationalHealthAuthorizedUser>;
    listByUser(userId: string): Promise<OccupationalHealthAuthorizedUser[]>;
    /** Dipakai occupational-health-authorization-expiry-scan.service.ts (task
     * 265) — kandidat ACTIVE yang expiryDate-nya sudah lewat, TAPI status
     * kolomnya belum ditransisikan (fail-closed di isAuthorizationActive()
     * TIDAK bergantung ke scan ini, scan HANYA menjaga kolom status tetap
     * akurat utk pelaporan/UI). */
    listActiveExpired(asOfDate: Date): Promise<OccupationalHealthAuthorizedUser[]>;
}
