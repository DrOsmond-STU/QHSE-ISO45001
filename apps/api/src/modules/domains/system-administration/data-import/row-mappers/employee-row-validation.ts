// TDD §20 — "tahap VALIDATING murni read-only". Fungsi murni ini adalah
// isi tahap itu utk targetModuleCode=EMPLOYEE: TIDAK menyentuh DB/tabel
// domain sama sekali, cuma memeriksa bentuk 1 baris Excel mentah. Header
// kolom yang diharapkan (row pertama sheet): full_name, email,
// employee_id (opsional), job_title (opsional) — subset InviteUserInput
// (user-role/user.service.ts) yang masuk akal diisi lewat template Excel
// bulk-onboarding (PRD §4.3 "template per entitas").
export interface EmployeeImportRow {
  fullName: string;
  email: string;
  employeeId?: string;
  jobTitle?: string;
}

export type EmployeeRowValidationResult =
  | { valid: true; row: EmployeeImportRow }
  | { valid: false; errorMessage: string };

export const EMPLOYEE_IMPORT_COLUMNS = ["full_name", "email", "employee_id", "job_title"] as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmployeeImportRow(raw: Record<string, unknown>): EmployeeRowValidationResult {
  const fullName = normalizeString(raw.full_name);
  const email = normalizeString(raw.email).toLowerCase();
  const employeeId = normalizeString(raw.employee_id);
  const jobTitle = normalizeString(raw.job_title);

  if (!fullName) {
    return { valid: false, errorMessage: "Kolom full_name wajib diisi." };
  }
  if (!email) {
    return { valid: false, errorMessage: "Kolom email wajib diisi." };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, errorMessage: `Format email tidak valid: "${email}".` };
  }

  return {
    valid: true,
    row: { fullName, email, employeeId: employeeId || undefined, jobTitle: jobTitle || undefined },
  };
}

function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}
