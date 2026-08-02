import { CanActivate, ExecutionContext } from "@nestjs/common";
import { RedisProvider } from "./redis.provider";
export declare class RateLimitGuard implements CanActivate {
    private readonly redis;
    private readonly memoryCounters;
    constructor(redis: RedisProvider);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private incrRedis;
    private incrMemory;
}
