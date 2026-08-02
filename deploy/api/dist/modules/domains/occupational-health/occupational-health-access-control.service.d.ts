import { ScopeType } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { ScopeHierarchyResolver } from "../../../platform/rbac/scope-hierarchy-resolver.interface";
export interface PhiAccessTargetScope {
    scopeType: ScopeType;
    scopeId: string;
}
export declare class OccupationalHealthAccessControlService {
    private readonly prisma;
    private readonly hierarchyResolver;
    private readonly notificationService;
    constructor(prisma: PrismaService, hierarchyResolver: ScopeHierarchyResolver, notificationService: NotificationService);
    /** Throws ForbiddenException kalau actor user (context ambient) TIDAK
     * punya entri AKTIF yang scope-nya mencakup targetScope. Caller (mis.
     * MedicalRecordService.getById()) WAJIB memanggil ini SEBELUM
     * mendekripsi/mengembalikan data PHI apa pun. */
    assertPhiAccessAuthorized(targetScope: PhiAccessTargetScope): Promise<void>;
    private alertDeniedAttempt;
}
