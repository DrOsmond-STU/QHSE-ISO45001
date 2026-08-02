"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSION_CHANGED_EVENT = exports.ROLE_CHANGED_EVENT = exports.PERMISSION_CACHE_TTL_SECONDS = void 0;
// TDD §8.2/§12 — cache role→permission resolution, TTL 5 menit ATAU
// invalidasi eksplisit event-driven (bukan cuma TTL).
exports.PERMISSION_CACHE_TTL_SECONDS = 5 * 60; // 300
exports.ROLE_CHANGED_EVENT = "role.changed";
exports.PERMISSION_CHANGED_EVENT = "permission.changed";
