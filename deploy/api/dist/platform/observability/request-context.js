"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.observabilityContextStorage = void 0;
exports.getCurrentCorrelationId = getCurrentCorrelationId;
exports.getCurrentIpAddress = getCurrentIpAddress;
exports.getCurrentUserAgent = getCurrentUserAgent;
const node_async_hooks_1 = require("node:async_hooks");
exports.observabilityContextStorage = new node_async_hooks_1.AsyncLocalStorage();
function getCurrentCorrelationId() {
    return exports.observabilityContextStorage.getStore()?.correlationId;
}
function getCurrentIpAddress() {
    return exports.observabilityContextStorage.getStore()?.ipAddress;
}
function getCurrentUserAgent() {
    return exports.observabilityContextStorage.getStore()?.userAgent;
}
//# sourceMappingURL=request-context.js.map