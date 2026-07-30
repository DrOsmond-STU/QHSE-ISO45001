-- AlterTable
ALTER TABLE "compliance_obligations" ADD COLUMN     "due_reminder_sent_at" TIMESTAMPTZ,
ADD COLUMN     "overdue_notified_at" TIMESTAMPTZ;
