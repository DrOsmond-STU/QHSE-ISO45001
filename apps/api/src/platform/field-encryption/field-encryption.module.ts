import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { FieldEncryptionService } from "./field-encryption.service";

@Module({
  imports: [TenancyModule],
  providers: [FieldEncryptionService],
  exports: [FieldEncryptionService],
})
export class FieldEncryptionModule {}
