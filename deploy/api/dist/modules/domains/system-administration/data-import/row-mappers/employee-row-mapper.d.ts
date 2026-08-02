import { UserService } from "../../../user-role/user.service";
import { DataImportRowMapper, RowValidationOutcome } from "./data-import-row-mapper.interface";
export declare class EmployeeRowMapper implements DataImportRowMapper {
    private readonly userService;
    readonly targetModuleCode = "EMPLOYEE";
    readonly columns: readonly ["full_name", "email", "employee_id", "job_title"];
    constructor(userService: UserService);
    validateRow(raw: Record<string, unknown>): RowValidationOutcome;
    importRow(raw: Record<string, unknown>): Promise<void>;
}
