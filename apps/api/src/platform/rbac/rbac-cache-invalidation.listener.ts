import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PERMISSION_CHANGED_EVENT, ROLE_CHANGED_EVENT } from "./rbac.constants";
import { PermissionChangedEvent, RoleChangedEvent } from "./rbac-events";
import { PermissionService } from "./permission.service";

@Injectable()
export class RbacCacheInvalidationListener {
  constructor(private readonly permissionService: PermissionService) {}

  @OnEvent(ROLE_CHANGED_EVENT)
  async onRoleChanged(payload: RoleChangedEvent): Promise<void> {
    await this.permissionService.invalidateCache(payload.userId);
  }

  @OnEvent(PERMISSION_CHANGED_EVENT)
  async onPermissionChanged(payload: PermissionChangedEvent): Promise<void> {
    await this.permissionService.invalidateForRole(payload.roleId, payload.tenantId);
  }
}
