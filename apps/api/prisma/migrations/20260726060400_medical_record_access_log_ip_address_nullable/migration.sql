-- Task 5.3 (task 256 koreksi) — medical_record_access_logs.ip_address
-- dibuat NOT NULL di migrasi init (20260726060100), TERNYATA bentrok
-- dgn getCurrentIpAddress() (platform/observability/request-context.ts)
-- yang legitimately undefined di luar HTTP request (test/scheduled job),
-- DAN system_audit_logs.ip_address/user_sessions.ip_address SUDAH
-- nullable duluan (preseden platform) — dikoreksi jadi nullable, konsisten.

ALTER TABLE "medical_record_access_logs" ALTER COLUMN "ip_address" DROP NOT NULL;
