-- Task 6.2 (dokumentasi/task 292) — memperluas CapaSourceType (dibuat task
-- 4.2, diperluas task 5.2 dan 5.3) dgn SATU nilai BARU utk Modul 16
-- Calibration Management (out_of_tolerance_records.linked_capa_id, §4.2
-- poin 3), migrasi TERPISAH dari init_calibration_management_tables krn
-- mengubah enum yang SUDAH ADA sebelum task ini, pola sama migrasi
-- 20260726050000 (task 5.2) dan 20260726060000 (task 5.3).

ALTER TYPE "CapaSourceType" ADD VALUE 'CALIBRATION_OOT';
