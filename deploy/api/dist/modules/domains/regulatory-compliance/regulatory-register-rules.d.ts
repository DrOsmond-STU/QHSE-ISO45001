import { ComplianceApplicableScope, RegulatoryRegisterStatus } from "@prisma/client";
export declare function assertRegisterAcceptsNewObligation(status: RegulatoryRegisterStatus): void;
export declare function assertApplicableScopeConsistency(scope: ComplianceApplicableScope, applicableCompanyId: string | null, applicableSiteId: string | null): void;
