import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { TenancySmokeTestController } from "./tenancy-smoke-test.controller";
import { TenantContextMiddleware } from "./tenant-context.middleware";
import { TenantCorsResolverService } from "./tenant-cors-resolver.service";

@Module({
  controllers: [TenancySmokeTestController],
  providers: [PrismaService, TenantCorsResolverService],
  exports: [PrismaService, TenantCorsResolverService],
})
export class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes("*");
  }
}
