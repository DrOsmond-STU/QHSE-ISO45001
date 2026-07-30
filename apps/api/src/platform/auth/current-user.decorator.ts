import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export interface RequestUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  scopeRoles: string[];
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser => {
  const req = ctx.switchToHttp().getRequest<Request & { user?: RequestUser }>();
  return req.user as RequestUser;
});
