"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Public = exports.IS_PUBLIC_KEY = void 0;
const common_1 = require("@nestjs/common");
// Fail-closed-by-default (JwtAuthGuard terpasang global via APP_GUARD di
// app.module.ts) — route yang butuh diakses tanpa access token menandai diri
// eksplisit dengan @Public(), bukan sebaliknya.
exports.IS_PUBLIC_KEY = "isPublic";
const Public = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
exports.Public = Public;
//# sourceMappingURL=public.decorator.js.map