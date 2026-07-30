-- Task 5.3 — memperluas CapaSourceType (dibuat task 4.2, sebelumnya
-- diperluas task 5.2) dgn SATU nilai BARU utk Modul 13 Occupational
-- Health, migrasi TERPISAH dari init_occupational_health_tables krn
-- mengubah enum yang SUDAH ADA sebelum task ini (bukan enum baru), pola
-- sama migrasi 20260726050000 (task 5.2).

ALTER TYPE "CapaSourceType" ADD VALUE 'OCCUPATIONAL_DISEASE_CASE';
