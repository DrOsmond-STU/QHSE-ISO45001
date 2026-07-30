-- AlterTable
ALTER TABLE "maintenance_schedules" ADD COLUMN     "due_soon_reminder_sent_at" TIMESTAMPTZ,
ADD COLUMN     "overdue_notified_at" TIMESTAMPTZ;
