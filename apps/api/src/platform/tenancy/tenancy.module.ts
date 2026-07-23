import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { TenantContextMiddleware } from "./tenant-context.middleware";
import { TenancySmokeTestController } from "./tenancy-smoke-test.controller";

@Module({
  controllers: [TenancySmokeTestController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class TenancyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes("*");
  }
}
