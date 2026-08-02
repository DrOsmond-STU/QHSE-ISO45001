# `deploy/` — artefak siap-jalan untuk shared hosting

> ## ⚠️ BACA INI SEBELUM MENGUBAH `apps/api` ATAU `prisma/schema.prisma`
>
> Isi direktori ini adalah **hasil build**, bukan kode sumber. Ia **tidak
> ikut berubah** ketika Anda mengubah kode.
>
> Setiap kali `apps/api/**` atau `apps/api/prisma/schema.prisma` berubah:
>
> ```bash
> bash scripts/build-deploy-api.sh
> git add deploy/api && git commit
> ```
>
> **Kalau langkah ini terlewat, server akan terus menjalankan kode LAMA tanpa
> satu pun pesan error.** Tidak ada yang gagal, tidak ada yang merah — aplikasi
> hanya berperilaku seperti versi sebelumnya. Itu jenis kegagalan yang paling
> lama dicari penyebabnya, jadi perlakukan langkah ini seperti bagian wajib
> dari commit, bukan opsional.

## Kenapa artefak, bukan build di server

Bukan pilihan gaya. Diukur langsung di server tujuan
(`qhse.semestateknologiutama.com`, cPanel DomaiNesia):

| Fakta | Nilai |
|---|---|
| Batas memori fisik akun (LVE CloudLinux) | **1 GB**, keras |
| `index.d.ts` hasil `prisma generate` (162 model) | **90 MB** |
| Hasil menjalankan `prisma generate` di server | **SIGKILL** setelah 16 detik |
| `ulimit` cpu-time / memori saat itu | `unlimited` (jadi bukan rlimit) |
| Memori bebas di host | 36 GB dari 48 GB (jadi bukan host-nya) |
| Memori terpakai akun saat idle | ~229 MB (sisanya untuk kita) |

Sinyal pembunuhnya **9 (SIGKILL)**, bukan **24 (SIGXCPU)** — satu-satunya yang
tersisa sebagai penyebab adalah batas LVE akun. `tsc` untuk API kena sebab yang
sama: hampir semua service mengimpor `@prisma/client`, jadi TypeScript harus
mem-parsing berkas 90 MB itu.

**Menghentikan aplikasi lain di akun tidak menolong** — ketiganya hanya memakai
~200 MB total; kekurangannya jauh lebih besar dari itu.

## Yang ADA di sini, dan yang TIDAK

| Isi | Alasan |
|---|---|
| `api/build/src/` | Hasil `tsc` apps/api — server tidak bisa mengompilasinya sendiri |
| `api/build/prisma/` | Skrip seed hasil kompilasi — supaya server memakai `node`, bukan ts-node |
| `api/prisma-client/` | Prisma Client **runtime saja** + engine `rhel-openssl-3.0.x` |
| ~~`index.d.ts` (90 MB)~~ | **Sengaja tidak disertakan** — hanya dibutuhkan TypeScript saat kompilasi, dan server tidak pernah mengompilasi API |
| ~~`.d.ts` + `.js.map`~~ | **Sengaja dimatikan** — hanya berguna di mesin pengembang; memangkas artefak dari 8,5 MB jadi 4,4 MB |
| ~~`apps/web/.next`~~ | **Sengaja tidak disertakan** — lihat di bawah |

### Jangan "merapikan" struktur `build/`

`build/` memuat `src/` dan `prisma/` persis seperti keluaran `tsc`. Itu
disengaja: seed hasil kompilasi memuat `require("../src/app.module")`, jadi
memindah `src/` menjadi `dist/` akan mematahkannya. Titik masuknya:

| Untuk | Jalur |
|---|---|
| API | `build/src/main.js` |
| Seed data demo | `build/prisma/seed-demo-data.js` |

### Kenapa seed ikut dikompilasi

Skrip seed mengimpor `AppModule`, jadi menjalankannya lewat `ts-node` berarti
memuat kompiler TypeScript **sekaligus** mentranspile seluruh 21 modul NestJS
di memori — langkah paling rawan dibunuh dari seluruh pemasangan. Dikirim
dalam bentuk terkompilasi, server cukup menjalankan `node`.

### Kenapa web TIDAK ikut dikirim jadi

`apps/web` tidak menyentuh Prisma sama sekali (hanya 9 rute + tiga paket
workspace kecil), jadi `next build` di server muat di jatah memori yang ada.

Dan mengirimnya justru **lebih** berisiko: `.next` hasil build di Windows memuat
path absolut Windows — `appDir` dan `relativeAppDir: "apps\web"` dengan
backslash — yang tidak akan resolve benar di Linux. Gagalnya pun membingungkan
(aplikasi boot, lalu 404 di tempat yang tidak masuk akal). Membangunnya di
server justru jalan yang lebih aman di sini.

## Engine Linux

`libquery_engine-rhel-openssl-3.0.x.so.node` — target dipastikan dari versi
paket server (`el10` = RHEL/AlmaLinux 10), bukan ditebak. Ia ikut dihasilkan
karena `binaryTargets` di `prisma/schema.prisma` memuat `rhel-openssl-3.0.x`
di samping `native`; `native` tetap ada supaya pengembangan lokal tidak berubah.
