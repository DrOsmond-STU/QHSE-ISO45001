# Flyer satu halaman

Bahan pemasaran satu halaman A4 untuk QHSE Platform, berikut satu tangkapan
layar Dashboard Analitik.

| berkas | isi |
|---|---|
| `flyer.pdf` | **yang dikirim ke orang.** A4 potret, satu halaman, huruf dan gambar tertanam |
| `flyer.png` | versi gambar untuk ditempel ke pesan atau salindia |
| `flyer.src.html` | sumber yang disunting manusia; memuat penanda `/*FONT*/` dan `/*GAMBAR*/` |
| `bangun-flyer.mjs` | menanam huruf + gambar ke sumbernya, lalu merender PDF dan PNG |
| `analitik.png` | tangkapan layar Dashboard Analitik dari aplikasi yang berjalan |
| `PlusJakartaSans.woff2` | huruf yang dipakai aplikasi (SIL Open Font License 1.1) |

## Membangun ulang

```bash
node deploy/flyer/bangun-flyer.mjs \
  --playwright <dir berisi node_modules/playwright-core> \
  --gambar deploy/flyer/analitik.png \
  --huruf  deploy/flyer/PlusJakartaSans.woff2 \
  --keluar deploy/flyer
```

Skripnya mencetak `muat satu halaman` atau `PERINGATAN: isi ...px melebihi
halaman` di akhir. **Perhatikan baris itu** — kalau isinya melebihi satu
halaman, yang terjadi bukan halaman kedua melainkan bagian bawah yang hilang.

## Tiga hal yang mudah terlewat saat menyuntingnya

**Huruf dan gambar ditanam, bukan ditautkan.** Flyer berpindah tangan sebagai
berkas — lewat surel, WhatsApp, atau dicetak. Berkas yang menautkan huruf ke
`fonts.gstatic.com` akan tampil dengan huruf cadangan di komputer penerimanya,
dan itu justru terjadi tepat pada saat satu-satunya berkas ini penting.

**`.gambar` wajib `flex: 0 0 auto`.** `.lembar` adalah flex column setinggi
tepat satu halaman. Tanpa itu, isi yang berlebih tidak membuat halaman kedua
melainkan MENYUSUTKAN gambarnya, dan karena `overflow: hidden`, tangkapan
layarnya terpotong diam-diam di bawah — sementara pemeriksa "muat satu
halaman" tetap melaporkan aman, karena isinya memang jadi muat. Pernah terjadi:
kartu "CAPA per status" kehilangan dua baris terakhirnya tanpa satu pun
peringatan.

**Angka di flyer harus punya sumber.** 19 modul, 54 metrik, 14 × 4 notifikasi,
453 record demo — semuanya berasal dari keluaran `apps/demo-api/src/verify.js`
terhadap situs live, bukan dari perkiraan. Kalau modul atau metriknya bertambah,
perbarui angkanya dari keluaran pemeriksa itu, jangan dikira-kira.

## Yang sengaja dikosongkan

Kotak kontak di kaki halaman bertuliskan `[ nama perusahaan · telepon · surel ]`
dengan garis putus-putus. Nama badan usaha, nomor telepon, dan surel tidak
diisi karena tidak ada sumbernya di repositori ini — menuliskan yang karangan
pada berkas yang akan disebar ke calon pelanggan lebih buruk daripada
meninggalkan tempatnya kosong dan terlihat jelas harus diisi.

## Mengganti tangkapan layarnya

Tangkapan layar diambil dari aplikasi yang BERJALAN, bukan digambar ulang —
flyer yang memuat mock-up memperlihatkan produk yang belum tentu ada.
Potongannya diukur dari kartu terakhir di baris kedua (`.qhse-widget`), bukan
dari angka tinggi yang ditulis tetap: begitu hurufnya benar-benar termuat,
tinggi tiap kartu berubah dan angka tetap apa pun akan memotong salah satu
kartu di tengah daftar.
