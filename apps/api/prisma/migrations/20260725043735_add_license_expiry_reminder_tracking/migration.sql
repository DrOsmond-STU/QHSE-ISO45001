-- AlterTable
ALTER TABLE "licenses_permits" ADD COLUMN     "expiry_reminder_30_sent_at" TIMESTAMPTZ,
ADD COLUMN     "expiry_reminder_7_sent_at" TIMESTAMPTZ,
ADD COLUMN     "expiry_reminder_90_sent_at" TIMESTAMPTZ;
