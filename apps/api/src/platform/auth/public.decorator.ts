import { SetMetadata } from "@nestjs/common";

// Fail-closed-by-default (JwtAuthGuard terpasang global via APP_GUARD di
// app.module.ts) — route yang butuh diakses tanpa access token menandai diri
// eksplisit dengan @Public(), bukan sebaliknya.
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
