// TDD §13.1 — nama queue/job persis "workflow-sla-scan".
export const WORKFLOW_SLA_SCAN_QUEUE = "workflow-sla-scan";
export const WORKFLOW_SLA_SCAN_JOB_NAME = "scan";

// TDD §9 — "cek tiap 15 menit". Env-overridable HANYA untuk uji manual
// (lihat DEPLOYMENT/plan task 0.9 §Verification) — default produksi 15 menit.
export const WORKFLOW_SLA_SCAN_INTERVAL_MS = process.env.WORKFLOW_SLA_SCAN_INTERVAL_MS
  ? parseInt(process.env.WORKFLOW_SLA_SCAN_INTERVAL_MS, 10)
  : 15 * 60 * 1000;

export const WORKFLOW_TASK_ESCALATED_EVENT = "workflow.task.escalated";
export const WORKFLOW_INSTANCE_COMPLETED_EVENT = "workflow.instance.completed";
