import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { NumberingService } from "./numbering.service";

@Module({
  imports: [TenancyModule],
  providers: [NumberingService],
  exports: [NumberingService],
})
export class NumberingModule {}
