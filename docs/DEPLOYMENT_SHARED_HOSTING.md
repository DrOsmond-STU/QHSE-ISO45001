# DEPLOYMENT_SHARED_HOSTING.md — Panduan Pasang di Shared Hosting cPanel

## Dokumen Kontrol

| Item | Keterangan |
|---|---|
| Nama Produk | QHSE Enterprise Platform |
| Jenis Dokumen | Panduan praktis pasang di shared hosting cPanel — jalur ALTERNATIF dari [DEPLOYMENT.md](DEPLOYMENT.md) (yang mengasumsikan Kubernetes/VPS) |
| Versi | 0.1 |
| Status | Panduan operasional — ditulis untuk dieksekusi langsung, bukan draf kebijakan |
| Prasyarat wajib | cPanel dengan **"Setup Node.js App"** DAN **"PostgreSQL Databases"** — kalau salah satu tidak ada, panduan ini tidak berlaku, lihat §0 |

> **Kenapa dokumen terpisah, bukan bagian dari DEPLOYMENT.md**: DEPLOYMENT.md mengasumsikan tim DevOps mengoperasikan Kubernetes untuk SaaS multi-tenant skala besar — jauh lebih rumit dari yang dibutuhkan satu perusahaan yang menjalankan instance sendiri di shared hosting. Panduan ini murni operasional: langkah konkret dari hosting kosong sampai aplikasi jalan.

---

## §0. Sebelum Mulai — Verifikasi 2 Prasyarat

Login ke cPanel Anda, cari 2 ikon ini (biasanya di bagian **"Software"** dan **"Databases"**):

1. **"Setup Node.js App"** — tanpa ini, aplikasi TIDAK BISA jalan sama sekali, hosting Anda tidak cocok untuk platform ini.
2. **"PostgreSQL Databases"** — tanpa ini (cuma ada MySQL/MariaDB), hubungi provider hosting Anda dan tanyakan apakah PostgreSQL bisa diaktifkan. Kalau benar-benar tidak bisa, platform ini butuh VPS (lihat DEPLOYMENT.md §8 sebagai gambaran arsitektur Docker Compose yang lebih sederhana dari K8s penuh).

Kalau kedua ikon itu ADA, lanjutkan.

---

## §1. Apa yang Berbeda dari Deployment VPS/Docker

Aplikasi ini awalnya dirancang jalan dengan Redis (antrian job background) + proses worker terpisah. Shared hosting tidak punya keduanya. Perubahan yang sudah dibuat di kode (lihat README.md changelog bagian shared-hosting) supaya tetap jalan penuh:

| Komponen | Deployment normal (VPS/Docker) | Shared hosting |
|---|---|---|
| Database | PostgreSQL — **TIDAK BERUBAH** | PostgreSQL — **TIDAK BERUBAH**, termasuk Row-Level Security (keamanan multi-tenant tetap penuh) |
| Pengingat otomatis (kalibrasi jatuh tempo, dokumen kontraktor kadaluarsa, dst — 31 jenis) | BullMQ + Redis, proses worker terpisah | cPanel **Cron Job** memanggil satu endpoint HTTP tiap beberapa menit |
| Pengiriman notifikasi (email/WA/Telegram) | Antrian Redis | Sama seperti di atas — endpoint cron yang sama |
| Sesi login | Redis | Tabel PostgreSQL khusus (`session_cache_entries`) |
| Cache izin akses (permission) | Redis | Memori proses (cukup untuk 1 proses shared hosting) |
| Penyimpanan file lampiran | MinIO/S3 | Bisa tetap S3-compatible (Wasabi/Backblaze/dll, TANPA ubah kode) **atau** disk lokal server (opsi default panduan ini, tidak butuh akun tambahan) |

Semua ini diaktifkan lewat 3 baris di `.env`: `REDIS_ENABLED=false`, `STORAGE_MODE=local`, `CRON_SECRET=...` — lihat §5.

---

## §2. Buat Database PostgreSQL

1. cPanel → **PostgreSQL Databases**.
2. Buat database baru, catat nama lengkapnya (cPanel biasanya menambah awalan `namauser_`, mis. `namauser_qhse`).
3. Buat user PostgreSQL baru + password kuat, catat keduanya.
4. Tambahkan user itu ke database dengan privilege **ALL PRIVILEGES**.
5. Catat juga **host** dan **port** PostgreSQL (biasanya `localhost` dan `5432` — cek info di halaman yang sama, atau tanyakan support hosting kalau tidak tertera).

Susun **connection string**-nya (dipakai di §5):
```
postgresql://NAMA_USER:PASSWORD@localhost:5432/NAMA_DATABASE?schema=public
```

---

## §3. Unggah Kode ke Server

**Cara A — via Git (disarankan, kalau cPanel punya "Git Version Control")**:
1. cPanel → **Git Version Control** → Create.
2. Repository URL: `https://github.com/DrOsmond-STU/QHSE-ISO45001.git`, branch `master`.
3. Clone ke folder di luar `public_html` (mis. `~/qhse-platform`) — aplikasi Node.js TIDAK perlu ada di `public_html`.

**Cara B — upload manual (kalau tidak ada Git di cPanel)**:
1. Di komputer Anda: `git clone https://github.com/DrOsmond-STU/QHSE-ISO45001.git`, lalu kompres folder `qhse-platform` jadi `.zip`.
2. cPanel → **File Manager** → upload zip → extract ke `~/qhse-platform`.

---

## §4. Setup Node.js App — Backend (`apps/api`)

1. cPanel → **Setup Node.js App** → **Create Application**.
2. **Node.js version**: pilih versi 20.x atau lebih baru yang tersedia.
3. **Application root**: `qhse-platform/apps/api`
4. **Application URL**: subdomain khusus API, mis. `api.namadomainanda.com` (buat subdomain-nya dulu di cPanel kalau belum ada).
5. **Application startup file**: `dist/main.js` (belum ada — dibuat di §6 setelah build).
6. Klik **Create**.

Setelah dibuat, cPanel akan menampilkan perintah untuk masuk ke virtual environment Node.js-nya (biasanya lewat tombol **"Enter to the virtual environment"** yang memberi Anda command `source /home/.../virtualenv/.../bin/activate && cd /home/.../qhse-platform/apps/api`). Jalankan command itu di **Terminal** cPanel (kalau tersedia) untuk langkah-langkah berikutnya.

---

## §5. Environment Variables (`.env`)

Di `qhse-platform/apps/api/`, salin `.env.example` jadi `.env` (lewat File Manager atau `cp .env.example .env` di Terminal), lalu isi:

```bash
DATABASE_URL="postgresql://NAMA_USER:PASSWORD@localhost:5432/NAMA_DATABASE?schema=public"
APP_DATABASE_URL="postgresql://NAMA_USER:PASSWORD@localhost:5432/NAMA_DATABASE?schema=public"

PORT=3001

# Shared hosting — TIDAK ADA Redis
REDIS_ENABLED=false

JWT_ACCESS_TOKEN_SECRET="GANTI — generate acak, lihat perintah di bawah"

WEB_ORIGIN="https://namadomainanda.com"

MFA_SECRET_ENCRYPTION_KEY="GANTI — generate acak"
PHI_ENCRYPTION_MASTER_KEY="GANTI — generate acak"

# Cron
CRON_SECRET="GANTI — generate acak"

# Penyimpanan file — disk lokal (opsi paling sederhana, tidak butuh akun S3)
STORAGE_MODE=local
LOCAL_STORAGE_PATH="/home/NAMA_USER_CPANEL/qhse-storage"
LOCAL_STORAGE_SIGNING_SECRET="GANTI — generate acak"
API_PUBLIC_BASE_URL="https://api.namadomainanda.com"
```

Generate nilai acak untuk tiap `GANTI` (jalankan di Terminal cPanel, di dalam virtual environment §4):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```
Jalankan berkali-kali, pakai hasil yang BEDA untuk tiap baris `GANTI` — **jangan pakai nilai yang sama untuk 2 secret berbeda**.

`APP_DATABASE_URL` di project ini sengaja SAMA dengan `DATABASE_URL` di setup single-database shared hosting (berbeda dari VPS yang punya 2 role Postgres terpisah — `qhse_app` non-superuser vs role admin — shared hosting cPanel biasanya cuma kasih 1 user per database dengan privilege penuh, jadi keduanya boleh sama).

`LOCAL_STORAGE_PATH`: pastikan foldernya di LUAR `public_html` (file lampiran tidak boleh bisa diakses langsung lewat URL tanpa lewat endpoint yang memvalidasi token).

---

## §6. Install Dependencies, Migrasi Database, Build

Di Terminal cPanel (dalam virtual environment §4), dari folder `qhse-platform/apps/api`:

```bash
cd ../..
# Root monorepo — install SEMUA package (pnpm workspace)
corepack enable
pnpm install

cd apps/api
# Terapkan seluruh migrasi database (RLS, audit trigger, semua tabel 21 modul)
pnpm exec prisma migrate deploy

# Isi data dasar wajib (role, permission, katalog industri, subscription plan)
pnpm exec ts-node -r ts-node/register/transpile-only prisma/seed-rbac-baseline.ts
pnpm exec ts-node -r ts-node/register/transpile-only prisma/seed-industry-templates.ts
pnpm exec ts-node -r ts-node/register/transpile-only prisma/seed-subscription-plans.ts
# (ulangi utk seluruh script prisma/seed-*.ts lain sesuai kebutuhan — lihat
# daftar lengkap script "seed:*" di package.json)

# Build TypeScript -> JavaScript
pnpm run build
```

`prisma migrate deploy` (BUKAN `migrate dev`) — ini mode production: menerapkan migrasi yang sudah ada tanpa mencoba membuat migrasi baru atau minta konfirmasi interaktif.

Kalau `pnpm install` gagal karena keterbatasan memori (umum di shared hosting kecil), coba `pnpm install --prod` dulu, atau hubungi support hosting untuk menaikkan limit memori proses Node.js sementara saat instalasi.

Setelah build sukses, kembali ke **Setup Node.js App** di cPanel, klik **Restart** pada aplikasi Anda.

---

## §7. Setup Node.js App — Frontend (`apps/web`)

Ulangi §4 dengan detail berbeda:
- **Application root**: `qhse-platform/apps/web`
- **Application URL**: domain utama Anda, mis. `namadomainanda.com`
- **Application startup file**: sesuai output build Next.js (`node_modules/.bin/next start` biasanya dikonfigurasi lewat `package.json` "start" script, bukan file tunggal — ikuti petunjuk cPanel Node Selector untuk app Next.js, biasanya minta Anda isi startup command bukan startup file untuk framework non-Express).

Environment variable minimal untuk `apps/web/.env`:
```bash
NEXT_PUBLIC_API_BASE_URL="https://api.namadomainanda.com"
```

Build & jalankan (Terminal cPanel, virtual environment app web):
```bash
cd qhse-platform/apps/web
pnpm run build
```
Lalu **Restart** dari halaman Setup Node.js App.

---

## §8. Setup Cron Jobs — INI YANG MENGGANTIKAN REDIS

cPanel → **Cron Jobs**. Tambahkan **satu** cron job:

- **Interval**: tiap 10 menit — pilih "Common Settings" → "Once per 10 minutes", atau custom `*/10 * * * *`.
- **Command**:
```bash
curl -s -X POST -H "X-Cron-Secret: NILAI_CRON_SECRET_DARI_ENV_ANDA" https://api.namadomainanda.com/internal/cron/run-scans > /dev/null 2>&1
```

Ganti `NILAI_CRON_SECRET_DARI_ENV_ANDA` dengan nilai persis yang Anda isi di `.env` §5, dan domain dengan domain API Anda sendiri.

Ini SATU cron job yang menjalankan seluruh 31 pengingat otomatis + pengiriman notifikasi + pemrosesan lampiran + import data sekaligus, setiap 10 menit. Anda tidak perlu menambah cron job lain.

**Kenapa 10 menit**: cukup responsif untuk pengingat compliance (kalibrasi, dokumen kontraktor, dsb — semuanya berbasis hari, bukan menit), tidak membebani hosting. Boleh dipercepat ke 5 menit kalau hosting Anda kuat, atau diperlambat ke 15-30 menit kalau resource terbatas — tidak ada risiko data kalau dijalankan lebih jarang, notifikasi cuma terkirim sedikit lebih lambat.

---

## §9. Verifikasi

1. Buka `https://api.namadomainanda.com/health` di browser — harus muncul `{"status":"ok",...}`.
2. Buka `https://api.namadomainanda.com/internal/cron/status` — harus muncul `{"redisEnabled":false,"cronSecretConfigured":true,...}`. Kalau `cronSecretConfigured` masih `false`, cek lagi `.env` Anda dan restart aplikasi.
3. Buka `https://namadomainanda.com` (frontend) — harus muncul halaman login.
4. Tunggu sampai giliran cron pertama jalan (maks 10 menit), lalu cek cPanel → **Cron Jobs** → lihat log eksekusi (kalau ada), atau tambahkan sementara `curl -v ...` (verbose) ke command cron untuk debug awal, lalu kembalikan ke `-s` (silent) setelah yakin jalan.

---

## §10. Troubleshooting Umum

| Gejala | Kemungkinan Penyebab | Solusi |
|---|---|---|
| App tidak start, error di log cPanel soal module tidak ditemukan | `pnpm install` belum jalan lengkap / salah folder | Ulangi §6 dari folder ROOT monorepo (`qhse-platform`), bukan `apps/api` |
| Error `LOCAL_STORAGE_SIGNING_SECRET` kosong saat start | Lupa isi `.env` | Isi sesuai §5, restart app |
| Cron job jalan tapi tidak ada efek (pengingat tidak terkirim) | `CRON_SECRET` di command cron beda dengan di `.env` | Samakan persis (case-sensitive, tanpa spasi ekstra) |
| Upload file gagal | `LOCAL_STORAGE_PATH` tidak bisa ditulis (permission) | Pastikan folder ada & writable oleh user proses Node.js (biasanya sama dengan user cPanel Anda) |
| Login gagal terus meski password benar | `JWT_ACCESS_TOKEN_SECRET` berubah setelah ada user login (semua sesi lama invalid) | Normal setelah ganti secret — user perlu login ulang, bukan bug |
| Proses Node.js sering "tertidur"/restart sendiri | Passenger (penggerak Node Selector cPanel) idle-timeout default hosting | Tanyakan provider hosting soal "keep alive"/"always on" untuk app Node.js Anda — beberapa paket shared hosting membatasi ini |

---

## §11. Batasan yang Perlu Diketahui (dibanding VPS/Docker)

- **Bukan zero-downtime**: restart aplikasi (setelah update kode) akan memutus koneksi aktif sesaat — beda dari prinsip DEPLOYMENT.md §1 yang mengasumsikan Kubernetes rolling update. Untuk instance 1-organisasi, ini biasanya bisa diterima (restart di luar jam kerja).
- **Presisi pengingat ± interval cron** (§8) — bukan real-time, tapi tetap dalam hitungan menit, bukan jam/hari.
- **Baris `session_cache_entries`/`authorization_code_entries` yang kedaluwarsa tidak otomatis dibersihkan** — menumpuk pelan-pelan (kedua tabel kecil, baris pendek). Kalau ingin dibersihkan berkala, tambahkan query manual sesekali:
  ```sql
  DELETE FROM session_cache_entries WHERE expires_at < now();
  DELETE FROM authorization_code_entries WHERE expires_at < now();
  ```
- **Satu proses Node.js** (bukan banyak instance load-balanced) — cukup untuk skala 1 organisasi, tapi bukan desain untuk trafik SaaS multi-tenant besar (itu kasus DEPLOYMENT.md).
