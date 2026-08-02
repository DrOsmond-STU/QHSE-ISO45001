"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantContextStorage = void 0;
exports.getCurrentTenantId = getCurrentTenantId;
exports.getCurrentUserId = getCurrentUserId;
const node_async_hooks_1 = require("node:async_hooks");
exports.tenantContextStorage = new node_async_hooks_1.AsyncLocalStorage();
function getCurrentTenantId() {
    return exports.tenantContextStorage.getStore()?.tenantId;
}
function getCurrentUserId() {
    return exports.tenantContextStorage.getStore()?.userId;
}
//# sourceMappingURL=tenant-context.js.map