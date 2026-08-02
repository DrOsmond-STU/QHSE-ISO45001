import { DataImportRowMapper } from "./data-import-row-mapper.interface";
export declare class DataImportRowMapperRegistry {
    private readonly byModuleCode;
    constructor(mappers: DataImportRowMapper[]);
    get(targetModuleCode: string): DataImportRowMapper | undefined;
    isSupported(targetModuleCode: string): boolean;
    supportedTargetModuleCodes(): string[];
}
