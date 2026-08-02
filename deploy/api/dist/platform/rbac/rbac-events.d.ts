export interface RoleChangedEvent {
    userId: string;
}
export interface PermissionChangedEvent {
    roleId: string;
    tenantId: string;
}
