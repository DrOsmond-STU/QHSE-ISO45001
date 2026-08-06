import { apiFetch } from "./api-client";

// Lapisan data untuk operasi tulis dan persetujuan.
//
// BENTUK FORMULIR DIAMBIL DARI SERVER, tidak didaftarkan di sini. Server
// menurunkannya dari information_schema, jadi kolom yang berubah jadi wajib
// di sebuah migrasi langsung tampil sebagai field wajib di layar — tanpa
// satu baris pun diubah di apps/web. Alternatifnya adalah dua daftar kolom
// yang harus dijaga sinkron, dan yang kedua selalu ketinggalan.

export type FieldType = "text" | "longtext" | "number" | "boolean" | "date" | "datetime" | "enum" | "ref";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FormField {
  column: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  maxLength: number | null;
  options?: FieldOption[];
  truncated?: boolean;
}

export interface ModuleSchema {
  slug: string;
  fields: FormField[];
  statusColumn: string | null;
  lifecycle: Record<string, string[]> | null;
  initialStatus: string | null;
  approval: {
    fromStatus: string;
    pendingStatus: string;
    approvedStatus: string;
    rejectedStatus: string;
    /** Status di dalam pipa persetujuan — tidak boleh jadi tombol transisi. */
    pipelineStatuses: string[];
  } | null;
}

export interface WorkflowTask {
  taskId: string;
  instanceId: string;
  stageId: string;
  stageName: string;
  sequenceNo: number;
  status: string;
  assignedTo: string;
  assigneeName: string | null;
  actorName: string | null;
  comment: string | null;
  actedAt: string | null;
  createdAt: string;
}

export interface ApprovalPanel {
  instance: {
    instanceId: string;
    status: string;
    definitionName: string;
    currentStageName: string | null;
    currentStageNo: number | null;
    currentStageId: string | null;
    startedAt: string | null;
    completedAt: string | null;
  };
  stages: Array<{ stageId: string; stageName: string; sequenceNo: number; slaHours: number }>;
  tasks: WorkflowTask[];
  myPendingTaskId: string | null;
}

export interface InboxTask {
  taskId: string;
  entityType: string;
  entityId: string;
  stageName: string;
  sequenceNo: number;
  slaHours: number;
  definitionName: string;
  moduleCode: string;
  createdAt: string;
  startedAt: string | null;
}

export function fetchSchema(slug: string): Promise<ModuleSchema> {
  return apiFetch<ModuleSchema>(`/${slug}/schema`);
}

export function createRecord(slug: string, values: Record<string, unknown>): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/${slug}`, { method: "POST", body: values });
}

export function updateRecord(slug: string, id: string, values: Record<string, unknown>): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/${slug}/${id}`, { method: "PUT", body: values });
}

export function deleteRecord(slug: string, id: string): Promise<unknown> {
  return apiFetch(`/${slug}/${id}`, { method: "DELETE" });
}

export function transitionRecord(slug: string, id: string, status: string): Promise<unknown> {
  return apiFetch(`/${slug}/${id}/transition`, { method: "POST", body: { status } });
}

export function submitRecord(slug: string, id: string): Promise<{ approvers: number }> {
  return apiFetch<{ approvers: number }>(`/${slug}/${id}/submit`, { method: "POST" });
}

export function fetchApproval(slug: string, id: string): Promise<ApprovalPanel | null> {
  return apiFetch<ApprovalPanel | null>(`/${slug}/${id}/approval`);
}

export function fetchInbox(): Promise<InboxTask[]> {
  return apiFetch<InboxTask[]>("/approvals");
}

export function actOnTask(taskId: string, action: "APPROVE" | "REJECT", comment: string): Promise<unknown> {
  return apiFetch(`/approvals/${taskId}/act`, { method: "POST", body: { action, comment } });
}

/**
 * Pesan galat validasi datang sebagai JSON di `detail` (server mengirim
 * `{"judul":"wajib diisi"}`). Diurai di sini supaya formulir bisa menandai
 * field yang bermasalah, bukan menampilkan satu baris JSON mentah kepada
 * orang yang cuma lupa mengisi satu kotak.
 */
export function parseFieldErrors(detail: string | undefined): Record<string, string> | null {
  if (!detail) return null;
  try {
    const parsed = JSON.parse(detail);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, string>;
  } catch {
    return null;
  }
  return null;
}

/** Nilai awal formulir dari sebuah baris yang sudah ada (mode ubah). */
export function initialValues(fields: FormField[], row: Record<string, unknown> | null): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    const raw = row?.[field.key];
    if (raw === null || raw === undefined) {
      values[field.key] = "";
      continue;
    }
    if (field.type === "datetime") {
      // <input type="datetime-local"> menuntut YYYY-MM-DDTHH:mm tanpa zona.
      // Nilai dari server bertipe timestamptz; dipotong ke menit di zona
      // lokal peramban, yang memang zona tempat orang membacanya.
      const date = new Date(String(raw));
      if (Number.isNaN(date.getTime())) {
        values[field.key] = "";
      } else {
        const offset = date.getTimezoneOffset() * 60000;
        values[field.key] = new Date(date.getTime() - offset).toISOString().slice(0, 16);
      }
      continue;
    }
    if (field.type === "date") {
      values[field.key] = String(raw).slice(0, 10);
      continue;
    }
    values[field.key] = String(raw);
  }
  return values;
}
