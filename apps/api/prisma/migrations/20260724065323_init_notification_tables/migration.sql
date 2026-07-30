-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationChannelCode" AS ENUM ('IN_APP', 'EMAIL', 'WHATSAPP', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "NotificationLogStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationDeliveryMode" AS ENUM ('REAL_TIME', 'DIGEST_DAILY', 'DIGEST_WEEKLY');

-- CreateEnum
CREATE TYPE "NotificationLanguage" AS ENUM ('ID', 'EN');

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "priority" "NotificationPriority" NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "notification_channels" (
    "notification_channel_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "channel_code" "NotificationChannelCode" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "provider_config_ref" UUID,

    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("notification_channel_id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "notification_template_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "event_type" VARCHAR(100) NOT NULL,
    "channel_code" "NotificationChannelCode" NOT NULL,
    "language" "NotificationLanguage" NOT NULL,
    "subject_template" VARCHAR(250),
    "body_template" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("notification_template_id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "notification_preference_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_category" VARCHAR(100) NOT NULL,
    "channel_code" "NotificationChannelCode" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "delivery_mode" "NotificationDeliveryMode" NOT NULL DEFAULT 'REAL_TIME',
    "quiet_hours_start" TIME,
    "quiet_hours_end" TIME,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("notification_preference_id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "notification_log_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "channel_code" "NotificationChannelCode" NOT NULL,
    "status" "NotificationLogStatus" NOT NULL DEFAULT 'QUEUED',
    "provider_message_id" VARCHAR(200),
    "provider_response" JSONB,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("notification_log_id")
);

-- CreateIndex
CREATE INDEX "notifications_tenant_id_recipient_user_id_is_read_idx" ON "notifications"("tenant_id", "recipient_user_id", "is_read");

-- CreateIndex
CREATE UNIQUE INDEX "notification_channels_tenant_id_channel_code_key" ON "notification_channels"("tenant_id", "channel_code");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_tenant_id_event_type_channel_code_la_key" ON "notification_templates"("tenant_id", "event_type", "channel_code", "language");

-- Postgres tidak menganggap dua NULL "sama" di unique index biasa (sama
-- kasus dengan numbering_configs scope_id, task 0.10) — tanpa ini, dua
-- baris template default sistem (tenant_id NULL) untuk event_type/channel/
-- language yang SAMA bisa coexist, dan resolusi template jadi ambigu.
CREATE UNIQUE INDEX "notification_templates_system_default_key" ON "notification_templates"("event_type", "channel_code", "language") WHERE "tenant_id" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_event_category_channel_cod_key" ON "notification_preferences"("user_id", "event_category", "channel_code");

-- CreateIndex
CREATE INDEX "notification_logs_notification_id_idx" ON "notification_logs"("notification_id");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("notification_id") ON DELETE RESTRICT ON UPDATE CASCADE;
