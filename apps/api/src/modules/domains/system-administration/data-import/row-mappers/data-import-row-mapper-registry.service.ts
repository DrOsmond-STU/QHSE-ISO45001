import { Inject, Injectable } from "@nestjs/common";
import { DATA_IMPORT_ROW_MAPPERS, DataImportRowMapper } from "./data-import-row-mapper.interface";

// Indeks mapper by targetModuleCode. Menambah mapper baru: implement
// DataImportRowMapper, lalu tambahkan ke factory array di
// data-import.module.ts (lihat komentar di sana) — kelas ini sendiri
// TIDAK perlu diubah.
@Injectable()
export class DataImportRowMapperRegistry {
  private readonly byModuleCode = new Map<string, DataImportRowMapper>();

  constructor(@Inject(DATA_IMPORT_ROW_MAPPERS) mappers: DataImportRowMapper[]) {
    for (const mapper of mappers) {
      this.byModuleCode.set(mapper.targetModuleCode, mapper);
    }
  }

  get(targetModuleCode: string): DataImportRowMapper | undefined {
    return this.byModuleCode.get(targetModuleCode);
  }

  isSupported(targetModuleCode: string): boolean {
    return this.byModuleCode.has(targetModuleCode);
  }

  supportedTargetModuleCodes(): string[] {
    return [...this.byModuleCode.keys()];
  }
}
