-- Task 5.2 — memperluas CapaSourceType (dibuat task 4.2) dgn DUA nilai
-- BARU utk Modul 12 Environmental Management, migrasi TERPISAH dari
-- init_environmental_tables krn mengubah enum yang SUDAH ADA sebelum
-- task ini (bukan enum baru), pola sama migrasi FK retroaktif 4.2.

ALTER TYPE "CapaSourceType" ADD VALUE 'ENVIRONMENTAL_ASPECT_IMPACT';
ALTER TYPE "CapaSourceType" ADD VALUE 'ENVIRONMENTAL_MONITORING';
