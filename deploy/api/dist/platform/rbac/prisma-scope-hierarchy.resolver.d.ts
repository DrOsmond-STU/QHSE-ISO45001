import { ScopeType } from "@prisma/client";
import { PrismaService } from "../tenancy/prisma.service";
import { ScopeAncestors } from "./scope-hierarchy";
import { ScopeHierarchyResolver } from "./scope-hierarchy-resolver.interface";
export declare class PrismaScopeHierarchyResolver implements ScopeHierarchyResolver {
    private readonly prisma;
    constructor(prisma: PrismaService);
    resolveAncestors(tenantId: string, scopeType: ScopeType, scopeId: string): Promise<ScopeAncestors | undefined>;
    resolveDescendantIds(tenantId: string, scopeType: ScopeType, scopeId: string, targetLevel: ScopeType): Promise<string[]>;
}
