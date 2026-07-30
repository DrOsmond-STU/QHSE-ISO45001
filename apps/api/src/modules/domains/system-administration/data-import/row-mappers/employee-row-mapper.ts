import { Injectable } from "@nestjs/common";
import { UserService } from "../../../user-role/user.service";
import { DataImportRowMapper, RowValidationOutcome } from "./data-import-row-mapper.interface";
import { EMPLOYEE_IMPORT_COLUMNS, validateEmployeeImportRow } from "./employee-row-validation";

// targetModuleCode="EMPLOYEE" — satu-satunya mapper konkret task 1.6 (lihat
// banner comment data-import-row-mapper.interface.ts utk alasan ORGANIZATION/
// ASSET/dst belum ada). Reuse UserService.inviteUser() (1.3) APA ADANYA —
// tidak dibongkar/diduplikasi validasi email-uniqueness-nya.
@Injectable()
export class EmployeeRowMapper implements DataImportRowMapper {
  readonly targetModuleCode = "EMPLOYEE";
  readonly columns = EMPLOYEE_IMPORT_COLUMNS;

  constructor(private readonly userService: UserService) {}

  validateRow(raw: Record<string, unknown>): RowValidationOutcome {
    const result = validateEmployeeImportRow(raw);
    return result.valid ? { valid: true } : { valid: false, errorMessage: result.errorMessage };
  }

  async importRow(raw: Record<string, unknown>): Promise<void> {
    const result = validateEmployeeImportRow(raw);
    if (!result.valid) {
      // Defensif — seharusnya sudah disaring fase VALIDATING, tidak pernah
      // tercapai lewat alur normal DataImportProcessingService.
      throw new Error(result.errorMessage);
    }

    await this.userService.inviteUser({
      email: result.row.email,
      fullName: result.row.fullName,
      employeeId: result.row.employeeId,
      jobTitle: result.row.jobTitle,
    });
  }
}
