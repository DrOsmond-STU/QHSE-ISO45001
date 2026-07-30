-- CreateEnum
CREATE TYPE "WorkflowApproverType" AS ENUM ('SPECIFIC_USER', 'ROLE_IN_SCOPE', 'REPORTING_LINE');

-- CreateEnum
CREATE TYPE "WorkflowEscalationAction" AS ENUM ('NOTIFY_SUPERIOR', 'AUTO_ESCALATE', 'NONE');

-- CreateEnum
CREATE TYPE "WorkflowParallelCompletionRule" AS ENUM ('ALL_APPROVE', 'ANY_ONE_APPROVE');

-- CreateEnum
CREATE TYPE "WorkflowInstanceStatus" AS ENUM ('IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkflowTaskStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DELEGATED');

-- CreateEnum
CREATE TYPE "WorkflowTaskAction" AS ENUM ('APPROVE', 'REJECT', 'RETURN');

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "workflow_definition_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "module_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("workflow_definition_id")
);

-- CreateTable
CREATE TABLE "workflow_stages" (
    "stage_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "workflow_definition_id" UUID NOT NULL,
    "sequence_no" INTEGER NOT NULL,
    "stage_name" VARCHAR(100) NOT NULL,
    "approver_type" "WorkflowApproverType" NOT NULL,
    "approver_role_id" UUID,
    "approver_user_id" UUID,
    "sla_hours" INTEGER NOT NULL,
    "escalation_action" "WorkflowEscalationAction" NOT NULL,
    "escalation_role_id" UUID,
    "allow_delegation" BOOLEAN NOT NULL DEFAULT false,
    "is_parallel_group" BOOLEAN NOT NULL DEFAULT false,
    "parallel_completion_rule" "WorkflowParallelCompletionRule" DEFAULT 'ALL_APPROVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workflow_stages_pkey" PRIMARY KEY ("stage_id")
);

-- CreateTable
CREATE TABLE "workflow_transitions" (
    "transition_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "workflow_definition_id" UUID NOT NULL,
    "from_stage_id" UUID NOT NULL,
    "to_stage_id" UUID,
    "trigger_action" "WorkflowTaskAction" NOT NULL,
    "condition" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "result_status" "WorkflowInstanceStatus",
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("transition_id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "instance_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "workflow_definition_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "current_stage_id" UUID,
    "status" "WorkflowInstanceStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "context_data" JSONB,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("instance_id")
);

-- CreateTable
CREATE TABLE "workflow_tasks" (
    "task_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "assigned_to" UUID NOT NULL,
    "status" "WorkflowTaskStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "acted_at" TIMESTAMPTZ,
    "acted_by" UUID,
    "delegated_to" UUID,
    "escalated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workflow_tasks_pkey" PRIMARY KEY ("task_id")
);

-- CreateIndex
CREATE INDEX "workflow_definitions_tenant_id_module_code_is_active_idx" ON "workflow_definitions"("tenant_id", "module_code", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_stages_workflow_definition_id_sequence_no_key" ON "workflow_stages"("workflow_definition_id", "sequence_no");

-- CreateIndex
CREATE INDEX "workflow_transitions_from_stage_id_trigger_action_priority_idx" ON "workflow_transitions"("from_stage_id", "trigger_action", "priority");

-- CreateIndex
CREATE INDEX "workflow_instances_tenant_id_entity_type_entity_id_idx" ON "workflow_instances"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "workflow_tasks_instance_id_idx" ON "workflow_tasks"("instance_id");

-- CreateIndex
CREATE INDEX "workflow_tasks_status_escalated_at_idx" ON "workflow_tasks"("status", "escalated_at");

-- AddForeignKey
ALTER TABLE "workflow_stages" ADD CONSTRAINT "workflow_stages_workflow_definition_id_fkey" FOREIGN KEY ("workflow_definition_id") REFERENCES "workflow_definitions"("workflow_definition_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_stages" ADD CONSTRAINT "workflow_stages_approver_role_id_fkey" FOREIGN KEY ("approver_role_id") REFERENCES "roles"("role_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_stages" ADD CONSTRAINT "workflow_stages_escalation_role_id_fkey" FOREIGN KEY ("escalation_role_id") REFERENCES "roles"("role_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_stages" ADD CONSTRAINT "workflow_stages_approver_user_id_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_workflow_definition_id_fkey" FOREIGN KEY ("workflow_definition_id") REFERENCES "workflow_definitions"("workflow_definition_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "workflow_stages"("stage_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "workflow_stages"("stage_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflow_definition_id_fkey" FOREIGN KEY ("workflow_definition_id") REFERENCES "workflow_definitions"("workflow_definition_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_current_stage_id_fkey" FOREIGN KEY ("current_stage_id") REFERENCES "workflow_stages"("stage_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("instance_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "workflow_stages"("stage_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_acted_by_fkey" FOREIGN KEY ("acted_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_delegated_to_fkey" FOREIGN KEY ("delegated_to") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
