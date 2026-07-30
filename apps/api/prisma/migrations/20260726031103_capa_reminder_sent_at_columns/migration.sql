-- AlterTable
ALTER TABLE "capa_effectiveness_verification" ADD COLUMN     "due_reminder_sent_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "capa_register" ADD COLUMN     "root_cause_sla_reminder_sent_at" TIMESTAMPTZ;
