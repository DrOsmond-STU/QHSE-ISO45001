"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirePermission = exports.REQUIRE_PERMISSION_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.REQUIRE_PERMISSION_KEY = "requirePermission";
// TDD §8.2 — @RequirePermission('work_permit.permit.approve') di level route.
// Tanpa decorator ini, PermissionGuard (APP_GUARD global) no-op — route
// otomatis lolos (tidak menambah proteksi, hanya route yang eksplisit
// menandai diri yang di-gate).
const RequirePermission = (code, options = {}) => (0, common_1.SetMetadata)(exports.REQUIRE_PERMISSION_KEY, { code, ...options });
exports.RequirePermission = RequirePermission;
//# sourceMappingURL=require-permission.decorator.js.map