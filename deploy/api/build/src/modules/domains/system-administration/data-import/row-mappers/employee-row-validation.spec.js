"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const employee_row_validation_1 = require("./employee-row-validation");
describe("validateEmployeeImportRow() — TDD §20 fase VALIDATING (read-only)", () => {
    it("baris lengkap valid -> row ternormalisasi", () => {
        const result = (0, employee_row_validation_1.validateEmployeeImportRow)({
            full_name: "  Budi Santoso  ",
            email: "Budi.Santoso@Example.com",
            employee_id: "EMP-001",
            job_title: "HSE Officer",
        });
        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.row).toEqual({
                fullName: "Budi Santoso",
                email: "budi.santoso@example.com",
                employeeId: "EMP-001",
                jobTitle: "HSE Officer",
            });
        }
    });
    it("kolom opsional kosong -> tetap valid, employeeId/jobTitle undefined", () => {
        const result = (0, employee_row_validation_1.validateEmployeeImportRow)({ full_name: "Ani", email: "ani@example.com" });
        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.row.employeeId).toBeUndefined();
            expect(result.row.jobTitle).toBeUndefined();
        }
    });
    it("full_name kosong -> invalid", () => {
        const result = (0, employee_row_validation_1.validateEmployeeImportRow)({ full_name: "", email: "ani@example.com" });
        expect(result.valid).toBe(false);
        if (!result.valid)
            expect(result.errorMessage).toMatch(/full_name/);
    });
    it("full_name tidak ada sama sekali (kolom hilang) -> invalid", () => {
        const result = (0, employee_row_validation_1.validateEmployeeImportRow)({ email: "ani@example.com" });
        expect(result.valid).toBe(false);
    });
    it("email kosong -> invalid", () => {
        const result = (0, employee_row_validation_1.validateEmployeeImportRow)({ full_name: "Ani", email: "" });
        expect(result.valid).toBe(false);
        if (!result.valid)
            expect(result.errorMessage).toMatch(/email/);
    });
    it("email format tidak valid -> invalid", () => {
        const result = (0, employee_row_validation_1.validateEmployeeImportRow)({ full_name: "Ani", email: "bukan-email" });
        expect(result.valid).toBe(false);
        if (!result.valid)
            expect(result.errorMessage).toMatch(/Format email/);
    });
    it("nilai numerik dari sel Excel (mis. employee_id terbaca number) tidak crash", () => {
        const result = (0, employee_row_validation_1.validateEmployeeImportRow)({ full_name: "Ani", email: "ani@example.com", employee_id: 12345 });
        expect(result.valid).toBe(true);
        if (result.valid)
            expect(result.row.employeeId).toBe("12345");
    });
});
