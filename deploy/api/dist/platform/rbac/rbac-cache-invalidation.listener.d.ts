import { PermissionChangedEvent, RoleChangedEvent } from "./rbac-events";
import { PermissionService } from "./permission.service";
export declare class RbacCacheInvalidationListener {
    private readonly permissionService;
    constructor(permissionService: PermissionService);
    onRoleChanged(payload: RoleChangedEvent): Promise<void>;
    onPermissionChanged(payload: PermissionChangedEvent): Promise<void>;
}
