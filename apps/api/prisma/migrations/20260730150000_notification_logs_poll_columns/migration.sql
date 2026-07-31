-- Shared-hosting adaptation (REDIS_ENABLED=false) — kolom baru murni
-- nullable, backward-compatible (deployment Redis/BullMQ existing tidak
-- perlu berubah apa pun). Lihat banner comment NotificationLog di
-- schema.prisma.
ALTER TABLE "notification_logs" ADD COLUMN "recipient_address" VARCHAR(320);
ALTER TABLE "notification_logs" ADD COLUMN "subject" VARCHAR(250);
ALTER TABLE "notification_logs" ADD COLUMN "body" TEXT;
ALTER TABLE "notification_logs" ADD COLUMN "next_attempt_at" TIMESTAMPTZ;
