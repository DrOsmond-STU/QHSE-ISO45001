export interface EmployeeImportRow {
    fullName: string;
    email: string;
    employeeId?: string;
    jobTitle?: string;
}
export type EmployeeRowValidationResult = {
    valid: true;
    row: EmployeeImportRow;
} | {
    valid: false;
    errorMessage: string;
};
export declare const EMPLOYEE_IMPORT_COLUMNS: readonly ["full_name", "email", "employee_id", "job_title"];
export declare function validateEmployeeImportRow(raw: Record<string, unknown>): EmployeeRowValidationResult;
