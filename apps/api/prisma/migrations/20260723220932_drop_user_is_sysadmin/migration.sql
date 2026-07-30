-- Task 0.8 — retirement placeholder task 0.7. Digantikan pengecekan role
-- sungguhan (UserRole -> Role.roleCode = 'SUPER_ADMIN_PLATFORM'), lihat
-- auth.service.ts. Kolom ini punya baris non-null (fixture dev/test lama)
-- tapi tidak apa dibuang — bukan data produksi.
ALTER TABLE "users" DROP COLUMN "is_sysadmin";
