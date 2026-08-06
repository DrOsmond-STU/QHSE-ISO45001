# Deploy cPanel — skrip operasional + catatan batas yang TERUKUR

Berkas di direktori ini adalah salinan dari yang berjalan di
`qhse.semestateknologiutama.com` (cPanel/CloudLinux, DomaiNesia). Sebelumnya
mereka hanya ada di `/home/semestat/` dan akan hilang seluruhnya bila akun
hosting itu dibersihkan.

> ## ⚠️ Rahasia TIDAK ada di sini, dan jangan pernah dimasukkan
>
> Versi yang berjalan di server memuat kata sandi basis data, kunci JWT, dan
> kunci enkripsi PHI secara langsung. Salinan di sini menggantinya dengan
> pemuatan dari `~/qhse-secrets.sh` yang **tidak** ikut ke repositori.
>
> Repositori ini pernah dibuka publik untuk keperluan pemasangan. Perlakukan
> ia sebagai publik saat memutuskan apa yang boleh masuk.

## Status pemasangan per 3 Agustus 2026

| Bagian | Keadaan |
|---|---|
| Frontend (Next.js, port 3400) | **berjalan** — `/` dan `/login` membalas HTTP 200 |
| Basis data PostgreSQL | **siap** — 112 migrasi, 171 tabel, 164 RLS policy |
| Artefak API | terpasang, engine Prisma benar |
| Proses API (NestJS, port 3401) | **TIDAK bisa berjalan** — lihat di bawah |
| Data demo | belum disemai (terhalang hal yang sama) |

## Kenapa API tidak bisa berjalan di sini — angka, bukan dugaan

Diukur langsung di server dengan mencuplik `VmRSS` dari `/proc` tiap 0,2 detik:

| Batas heap V8 | RSS puncak proses API | Mati setelah |
|---|---|---|
| `--max-old-space-size=420` | **814 MB** | 7 detik, SIGKILL |
| `--max-old-space-size=192` | **827 MB** | 8 detik, SIGKILL |

Batas memori akun (`lve_pmem`) adalah **1024 MB**, dan tiga aplikasi lain di
akun yang sama sudah memakai ~480 MB untuk melayani pengunjung sungguhan.

Menurunkan batas heap justru sedikit memperburuk. Itu mengunci kesimpulannya:
**sekitar 620 MB dari 814 MB itu bukan heap JavaScript** — ia memori native,
dan tersangka terkuatnya engine Prisma yang memuat skema 162 model. Tidak ada
setelan Node yang menyentuh angka itu.

Kesimpulan: paket 1 GB ini tidak cukup. API sendirian memakai 80% jatah akun
tanpa sisa untuk melayani permintaan. Butuh minimal 2 GB, atau API dipindah
ke tempat lain sementara frontend tetap di sini.

## Tiga dinding berbeda yang sudah dilewati — jangan tertukar

Ketiganya terlihat seperti "build/proses mati", tapi obatnya berbeda dan dua
di antaranya berlawanan arah.

### 1. Memori saat build — `prisma generate` dan `tsc` API

Gejala: **SIGKILL / kode keluar 137**, atau mati tanpa pesan apa pun.

`prisma generate` untuk 162 model menghasilkan `index.d.ts` sebesar 90 MB dan
butuh lebih dari 1 GB. `tsc` API kena sebab yang sama karena harus mem-parsing
berkas itu.

Obat: **jangan dibangun di server.** Artefaknya dikirim jadi lewat repositori
(`deploy/api/build/`), dirakit oleh `scripts/build-deploy-api.sh`.

### 2. Proses/thread saat build web — `next build`

Gejala: `pthread_create: Resource temporarily unavailable`, `os error 11`
(EAGAIN), panic tokio "OS can't spawn worker thread".

Ini **bukan** kehabisan memori. Batasnya `lvenproc = 150`. Next.js dan
kompiler SWC mengukur ukuran thread-pool dari jumlah CPU **host** (puluhan di
mesin bersama) lalu mencoba menelurkan thread sebanyak itu.

Obat: **turunkan konkurensi**, bukan naikkan memori.
`experimental.cpus = 1` + `workerThreads = false` di `apps/web/next.config.js`,
ditambah `taskset -c 0,1` yang menyempitkan CPU terlihat sehingga tokio dan
rayon otomatis mengecilkan pool-nya.

Cara membedakan cepat: **EAGAIN selalu menyebut dirinya; kehabisan memori mati
tanpa sepatah kata.**

### 3. Memori saat runtime — proses API

Sudah dijelaskan di atas. Belum terlewati, dan tidak bisa dilewati di paket ini.

## Pelajaran yang mahal — masing-masing memakan satu siklus penuh

**Target Prisma disimpulkan dari nama distribusi.** Paket server menyebut
`el10` (RHEL/AlmaLinux 10), jadi dipilih `rhel-openssl-3.0.x`. Prisma di mesin
itu ternyata meminta `debian-openssl-3.0.x`. Menyimpulkan target dari nama
distribusi menyesatkan di CloudLinux — **baca yang Prisma sebut sendiri di
pesan galatnya.**

Pencegahannya sudah dipasang: `scripts/build-deploy-api.sh` kini **membaca**
`binaryTargets` dari `schema.prisma`, bukan menuliskan namanya sendiri.
Sebelumnya nama itu hidup di dua tempat dan sempat berbeda.

**pnpm tidak menaikkan binari ke `node_modules/.bin` akar workspace.**
`next` hanya ada di `apps/web/node_modules/.bin/next`. Jalur akar membuat web
gagal menyala enam kali berturut-turut dengan "No such file or directory",
padahal build-nya sendiri sukses.

**`/usr/bin/time` tidak ada di server ini.** Skrip pengukur yang memakainya
berjalan penuh tapi angka yang justru dicari tidak pernah terekam. Pengukur
sekarang memakai `/proc` dan `ps` saja.

**`NODE_ENV=production` membuat pnpm melewati devDependencies.** Padahal
`prisma` (migrate), `typescript` (next build), dan `dotenv` (seed) semuanya
ada di sana. Sempat "kebetulan jalan" karena `node_modules` lama diwariskan —
ketergantungan pada sisa pemasangan lama. Kini `--prod=false` eksplisit.

**Kode keluar berbohong kalau ada pipe.** `cmd | tail` melaporkan status
`tail`. Dua kegagalan (push DNS dan build) sempat terlaporkan "exit 0".

## Jadwal cron — kenapa menit ber-akhiran 3

Akun ini menjalankan cron milik empat aplikasi lain pada `*/5, */6, */7, */9,
*/10`. Menit `3,13,23,33,43,53` adalah satu-satunya slot yang tidak pernah
berpapasan dengan satu pun dari mereka.

Sebelumnya runner terjadwal `*/8`, yang berbenturan dengan **semuanya
sekaligus di menit 0** — momen terburuk untuk memasang.

| Cron | Jadwal | Guna |
|---|---|---|
| `qhse-cron.sh` | `3,13,23,33,43,53` | pembungkus kunci → `qhse-runner.sh` |
| `curl .../internal/cron/run-scans` | `8,18,28,38,48,58` | 31 scheduled job lewat satu endpoint |

## Cara memasang ulang dari nol

1. Salin berkas di direktori ini ke `/home/semestat/`.
2. Buat `~/qhse-secrets.sh` dari `qhse-secrets.sh.example`, isi nilai aslinya,
   lalu `chmod 600`.
3. Salin `htaccess` menjadi `.htaccess` di document root subdomain.
4. Pasang dua cron di atas.
5. Buat penanda kosong `~/qhse-install.request`; tunggu satu detak cron.
6. Pantau `~/qhse-install.log`.

Penanda yang tersedia — semuanya berkas kosong di `~`, dihapus sendiri setelah
dikerjakan:

| Penanda | Guna |
|---|---|
| `qhse-probe.request` | catat fakta lingkungan, tanpa efek samping |
| `qhse-install.request` | pasang penuh: unduh, salin artefak, build web |
| `qhse-web.request` | bangun ULANG web saja, tanpa unduh/install |
| `qhse-seed.request` | semai data demo lewat service NestJS (butuh apps/api hidup) |
| `qhse-demo-seed.request` | semai data dummy lewat `apps/demo-api` — jalur yang muat di akun ini |
| `qhse-restart.request` | matikan kedua proses; cron menyalakan lagi |
| `qhse-rss.request` | diagnostik memori (`qhse-apitest.sh`) |
| `qhse-live.request` | periksa situs lewat URL publiknya (`qhse-live-check.sh`) |

Dua berkas lain di `~` BUKAN penanda sekali pakai — keduanya bertahan dan
mengubah perilaku runner selama masih ada:

| Berkas | Guna |
|---|---|
| `qhse-branch` | cabang git yang diunduh (bawaan `master` bila tidak ada) |
| `qhse-demo-mode` | jika ada, `/api` dilayani `apps/demo-api`, bukan NestJS |

## Kenapa ada mode demo

`apps/api` **tidak muat** di akun ini, dan itu terukur (`~/qhse-apitest.log`):
RSS puncaknya 814 MB saat boot melawan batas keras `lve_pmem` 1024 MB, lalu
SIGKILL setelah 7-8 detik. Sekitar 620 MB dari angka itu adalah memori native
engine Prisma yang memuat skema 162 model — bukan heap JavaScript, jadi
menurunkan `--max-old-space-size` tidak menolong (dicoba: 420 MB dan 192 MB,
keduanya mati).

`apps/demo-api` memakai `pg` langsung tanpa Prisma dan tanpa NestJS, dan
terukur 65 MB RSS saat melayani seluruh rute. Ia hanya melayani `GET` baca-saja
plus alur masuk — cukup untuk presentasi, jauh dari cukup untuk produksi.
Batasannya ditulis lengkap di `apps/demo-api/README.md`; baca sebelum
menganggapnya pengganti.

Urutan menyalakan mode demo:

```bash
touch ~/qhse-demo-mode          # pilih demo-api sebagai pelayan /api
touch ~/qhse-demo-seed.request  # isi basis data dengan data dummy
touch ~/qhse-web.request        # bangun ulang web agar Tenant ID ikut terbakar
touch ~/qhse-restart.request    # tukar proses yang sedang berjalan
```

Menghapus `~/qhse-demo-mode` lalu `touch ~/qhse-restart.request` mengembalikan
NestJS — data dummy-nya tetap di basis data dan tetap terbaca oleh apps/api,
karena keduanya menulis ke tabel yang sama.
