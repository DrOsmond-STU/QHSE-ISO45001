import { SiteCategory, SiteStatus, SiteType } from "@prisma/client";
export declare class SiteLifecycleError extends Error {
}
export declare function validateSiteLifecycle(input: {
    siteType: SiteType;
    startDate: Date | null;
    endDate: Date | null;
    status: SiteStatus;
}): void;
export declare function shouldWarnMissingGeoCoordinates(category: SiteCategory, geoLat: unknown, geoLong: unknown): boolean;
