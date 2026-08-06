# `apps/demo-api` — API demo ringan + penyemai data dummy

Dua hal dalam satu paket, keduanya untuk satu tujuan: membuat
`qhse.semestateknologiutama.com` bisa dipakai presentasi.

| Berkas | Fungsi |
|---|---|
| `src/server.js` | API baca-saja di port 3401 — melayani rute yang dipanggil `apps/web` |
| `src/seed/seed.js` | Mengisi basis data dengan data dummy 15 modul |
| `src/verify.js` | Memeriksa seluruh rute terhadap server yang sedang berjalan |

## Kenapa paket ini ada

`apps/api` **tidak bisa hidup** di hosting tujuan. Ini terukur, bukan dugaan
(`~/qhse-apitest.log` di server, 3 Agustus 2026):

| | |
|---|---|
| Batas memori akun (LVE CloudLinux) | **1024 MB**, keras |
| RSS puncak `apps/api` saat boot | **814 MB** — lalu SIGKILL |
| Yang bukan heap JavaScript | **~620 MB** — engine Prisma memuat skema 162 model |
| RSS `demo-api` melayani seluruh rute | **65 MB** |

Menurunkan `--max-old-space-size` justru sedikit memperburuk, yang mengunci
kesimpulannya: yang besar adalah memori native engine Prisma, dan tidak ada
setelan Node yang menyentuhnya. Selama itu belum berubah, satu-satunya cara
menampilkan data di layar adalah tidak memuat Prisma sama sekali.

Karena itu `demo-api` memakai `pg` langsung, tanpa framework, tanpa langkah
kompilasi. Ia dijalankan `node` apa adanya.

## Yang TIDAK dilakukan paket ini

Penting dibaca sebelum menganggapnya pengganti `apps/api`:

- **Tidak ada RBAC per izin dan tidak ada pemeriksaan langganan modul.**
  Siapa pun yang berhasil masuk melihat seluruh modul. `apps/api` memeriksa
  keduanya di setiap permintaan.
- **Tidak ada operasi tulis domain.** Tidak ada pembuatan izin kerja, tidak
  ada persetujuan, tidak ada workflow. Hanya `GET`, ditambah menandai
  notifikasi terbaca.
- **Tidak ada jejak audit dari sisi aplikasi, tidak ada MFA, tidak ada rate
  limit, tidak ada rotasi refresh token.**
- **Penyemainya menulis status apa adanya**, bukan mencapainya lewat aturan
  bisnis. Sebuah izin kerja berstatus `CLOSED` di sini tidak pernah melewati
  persetujuan mana pun.

**Isolasi antar tenant TETAP ditegakkan** — tapi oleh basis data, bukan oleh
kode di sini. Seluruh tabel domain memakai `FORCE ROW LEVEL SECURITY`, dan
setiap query di `src/db.js` berjalan dalam transaksi dengan
`app.current_tenant_id` disetel, persis seperti `PrismaService.withRls()`.
Query tanpa konteks itu mengembalikan nol baris.

## Hubungannya dengan `apps/api/prisma/demo-seed`

Keduanya ada, keduanya masih berguna, dan tidak saling menggantikan:

| | `apps/api/prisma/seed-demo-data.ts` | `apps/demo-api/src/seed/seed.js` |
|---|---|---|
| Cara menulis | Memanggil service NestJS sungguhan | SQL langsung |
| Penomoran, workflow, audit, notifikasi | Lahir dari jalur bisnis nyata | Ditulis apa adanya |
| Kebutuhan memori | Ratusan MB (memuat AppModule + Prisma) | Puluhan MB |
| Bisa jalan di shared hosting | **Tidak** | Ya |
| Volume data | ~4-6 record per modul | ~360 record di 15 modul |

Pakai yang pertama di lingkungan yang sanggup menjalankannya — hasilnya lebih
jujur. Pakai yang ini kalau tidak.

## Menjalankan

Keduanya membaca `APP_DATABASE_URL` (atau `DATABASE_URL`) dari lingkungan.
Server juga butuh `JWT_ACCESS_TOKEN_SECRET`.

```bash
# 1. isi data dummy (aman diulang — setiap baris ber-UUID tetap)
APP_DATABASE_URL='postgresql://...' node apps/demo-api/src/seed/seed.js

# 2. nyalakan API
APP_DATABASE_URL='postgresql://...' JWT_ACCESS_TOKEN_SECRET='...' \
  PORT=3401 node apps/demo-api/src/server.js

# 3. periksa seluruh rute
node apps/demo-api/src/verify.js http://127.0.0.1:3401
```

`verify.js` menjalankan urutan yang sama dengan peramban saat presentasi:
masuk lewat PKCE, 15 permintaan hitung untuk dashboard, daftar + detail tiap
modul, temuan audit, lalu kotak masuk notifikasi. Jalankan setelah setiap
pemasangan — kegagalan yang paling mahal di sini adalah yang sunyi, misalnya
satu kartu dashboard menampilkan "—" sementara empat belas lainnya tampak
sehat.

### Variabel lingkungan

| Nama | Wajib | Keterangan |
|---|---|---|
| `APP_DATABASE_URL` / `DATABASE_URL` | ya | Koneksi Postgres |
| `JWT_ACCESS_TOKEN_SECRET` | ya (server) | Penanda tangan access token |
| `PORT` | tidak | Bawaan 3401 |
| `HOST` | tidak | Bawaan 127.0.0.1 |
| `REFRESH_COOKIE_PATH` | tidak | Di produksi `/api/auth/token` — lihat catatan di `src/server.js` |
| `WEB_ORIGIN` | tidak | Hanya untuk pengembangan lokal lintas port; di produksi satu origin |

## Akun demo

Seluruhnya berkata sandi **`Demo!QHSE2026`**. Tenant ID dicetak di akhir
keluaran penyemai dan **tidak berubah** antar penyemaian — nilainya
diturunkan dari kode tenant, bukan diacak, supaya `NEXT_PUBLIC_DEFAULT_TENANT_ID`
yang dibakar `apps/web` saat build tidak pernah basi.

Akun yang paling berguna untuk presentasi:

| Email | Peran |
|---|---|
| `budi.santoso@petro-ns.demo` | Tenant Admin — akses terluas, dipakai berkeliling seluruh modul |
| `andi.wijaya@petro-ns.demo` | HSE Manager |
| `lina.marlina@petro-ns.demo` | Quality Manager |
| `dewi.lestari@petro-ns.demo` | HSE Officer — Site Cepu |

Daftar lengkap 22 akun dicetak penyemai di akhir jalannya.

## Kalau skema basis data berubah

`upsert()` di `src/seed/lib.js` membaca daftar kolom dari `information_schema`
dan membuang kunci yang tidak ada kolomnya, jadi kolom yang dihapus tidak
menjatuhkan penyemaian. Yang **akan** menjatuhkannya adalah kolom `NOT NULL`
baru tanpa nilai bawaan — dan itu memang seharusnya menjatuhkannya, karena
diam-diam melewatkannya berarti menulis baris yang tidak sah.

Registri modul di `src/modules.js` adalah pasangan
`apps/web/lib/modules.ts`. Menambah modul ke-16 berarti menambah satu entri
di **kedua** berkas; kalau hanya satu yang diubah, gejalanya adalah kartu
dashboard yang menampilkan "—" tanpa pesan galat apa pun.
