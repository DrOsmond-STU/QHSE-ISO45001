"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tenant_context_1 = require("../tenancy/tenant-context");
const app_logger_service_1 = require("./app-logger.service");
const request_context_1 = require("./request-context");
// TDD §15 — "setiap log wajib menyertakan tenant_id, user_id, correlation_id,
// module, action". Unit test murni terhadap konstruksi field (spy pino
// instance internal, bukan uji format wire JSON Pino itu sendiri — itu
// tanggung jawab Pino, sudah teruji upstream).
describe("AppLoggerService", () => {
    let logger;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pinoInfoSpy;
    beforeEach(() => {
        logger = new app_logger_service_1.AppLoggerService();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pinoInfoSpy = jest.spyOn(logger.pino, "info").mockImplementation(() => undefined);
    });
    afterEach(() => {
        pinoInfoSpy.mockRestore();
    });
    it("event() menyertakan tenant_id/user_id/correlation_id dari AsyncLocalStorage otomatis", () => {
        tenant_context_1.tenantContextStorage.run({ tenantId: "tenant-1", userId: "user-1" }, () => {
            request_context_1.observabilityContextStorage.run({ correlationId: "corr-1" }, () => {
                logger.event("info", "sesuatu terjadi", { module: "audit-log", action: "partition.created" });
            });
        });
        expect(pinoInfoSpy).toHaveBeenCalledWith(expect.objectContaining({
            tenant_id: "tenant-1",
            user_id: "user-1",
            correlation_id: "corr-1",
            module: "audit-log",
            action: "partition.created",
        }), "sesuatu terjadi");
    });
    it("event() di luar request context -> tenant_id/user_id/correlation_id null (bukan undefined/crash)", () => {
        logger.event("info", "job cross-tenant", { module: "audit-log", action: "partition.created" });
        expect(pinoInfoSpy).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: null, user_id: null, correlation_id: null }), "job cross-tenant");
    });
    it("meta tambahan (mis. partition_table) ikut disertakan apa adanya", () => {
        logger.event("info", "partisi dibuat", { module: "audit-log", action: "partition.created", partition_table: "system_audit_logs_y2027m01" });
        expect(pinoInfoSpy).toHaveBeenCalledWith(expect.objectContaining({ partition_table: "system_audit_logs_y2027m01" }), "partisi dibuat");
    });
});
