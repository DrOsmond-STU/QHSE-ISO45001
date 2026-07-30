import { Module } from "@nestjs/common";
import { ObservabilityModule } from "../../../../platform/observability/observability.module";
import { TenancyModule } from "../../../../platform/tenancy/tenancy.module";
import { HazardRegisterService } from "./hazard-register.service";
import { RiskMatrixBootstrapService } from "./risk-matrix-bootstrap.service";
import { RiskMatrixConfigService } from "./risk-matrix-config.service";

// Task 3.1 (Modul 05), modul DOMAIN KETUJUH. BELUM ada controller HTTP
// (pola sama seluruh modul domain Phase 2+ sejauh ini). TIDAK impor
// WorkflowEngineModule/NumberingModule (beda dari DMS 2.1/Compliance 2.2)
// — cakupan task ini (matriks konfigurasi + hazard register) tidak py
// approval workflow maupun nomor terformat, keduanya baru relevan task 3.2
// (hira_assessments.hira_number dst).
@Module({
  imports: [TenancyModule, ObservabilityModule],
  providers: [RiskMatrixBootstrapService, RiskMatrixConfigService, HazardRegisterService],
  exports: [RiskMatrixBootstrapService, RiskMatrixConfigService, HazardRegisterService],
})
export class RiskMatrixModule {}
