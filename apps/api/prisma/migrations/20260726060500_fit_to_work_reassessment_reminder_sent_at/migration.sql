-- Task 5.3 (task 265) — idempotency occupational-health-reassessment-scan,
-- pola sama mcu_schedules.reminder_sent_at/waste_generation_log.
-- storage_duration_warning_sent_at.

ALTER TABLE "fit_to_work_assessments" ADD COLUMN     "reassessment_reminder_sent_at" TIMESTAMPTZ;
