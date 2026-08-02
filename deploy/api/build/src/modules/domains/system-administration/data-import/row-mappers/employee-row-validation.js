"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPLOYEE_IMPORT_COLUMNS = void 0;
exports.validateEmployeeImportRow = validateEmployeeImportRow;
exports.EMPLOYEE_IMPORT_COLUMNS = ["full_name", "email", "employee_id", "job_title"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validateEmployeeImportRow(raw) {
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
function normalizeString(value) {
    if (value === null || value === undefined)
        return "";
    return String(value).trim();
}
