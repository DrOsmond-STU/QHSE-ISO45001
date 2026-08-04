#!/bin/bash
# ============================================================================
#  Pemeriksaan sekali jalan terhadap situs LIVE lewat URL publiknya.
#
#  Berupa berkas skrip, BUKAN perintah yang ditulis langsung di crontab:
#  crontab memperlakukan '%' sebagai pemisah perintah/stdin, sehingga
#  `curl -w '%{http_code}'` memotong barisnya di tengah dan cron-nya diam
#  saja tanpa pesan galat apa pun. Ditemukan empiris 3 Agustus 2026 — dua
#  putaran cron berlalu tanpa satu pun berkas keluaran dibuat.
#
#  Bedanya dengan menjalankan apps/demo-api/src/verify.js ke 127.0.0.1:3401:
#  yang ini menembak https://<domain>/api, jadi Apache, pemaksaan HTTPS, dan
#  pemotongan awalan /api oleh .htaccess ikut teruji — tiga hal yang tidak
#  tersentuh sama sekali kalau diuji dari dalam. Ketiganya juga bagian yang
#  paling mungkin rusak tanpa ada yang menyadarinya, karena prosesnya sendiri
#  tetap hidup dan lognya tetap bersih.
#
#  Dipanggil cron; berhenti seketika kalau ~/qhse-live.request tidak ada.
#  Jadwal: 6,16,26,36,46,56 * * * *  (slot yang tidak berhimpit dengan cron
#  aplikasi lain di akun ini — lihat catatan jadwal di qhse-cron.sh).
# ============================================================================
HOME_DIR=/home/semestat
MARK=$HOME_DIR/qhse-live.request
LOG=$HOME_DIR/qhse-live.log
SITE=https://qhse.semestateknologiutama.com

[ -f "$MARK" ] || exit 0
rm -f "$MARK"

export PATH="$HOME_DIR/.local/share/mise/installs/node/22/bin:$PATH"

kode() { curl -s -o /dev/null -w '%{http_code}' -m 30 "$1"; }

# ----------------------------------------------------------------------------
#  Header keamanan, dicetak apa adanya.
#
#  Ada di sini karena header adalah SATU-SATUNYA bagian aplikasi yang dipasang
#  dua lapis: demo-api memasang sebagian sendiri di dalam respons, .htaccess
#  memasang sebagian lagi lewat mod_headers. Yang keliru pada GABUNGAN keduanya
#  tidak terlihat dari dalam proses Node (ia cuma tahu apa yang ia tulis
#  sendiri) dan tidak terlihat dari berkas .htaccess (ia cuma tahu apa yang ia
#  tambahkan) — hanya terlihat pada respons jadi, seperti yang diterima
#  peramban. Mencetaknya mentah lebih berguna daripada menyimpulkannya:
#  pemeriksaan "nosniff terpasang" pernah gagal berulang kali sementara dua
#  lapisnya masing-masing tampak benar.
#
#  Tiga URL yang dipilih menjawab tiga pertanyaan berbeda:
#    /                              apa yang dipasang pada HALAMAN
#    /api/health                    apa yang ditambahkan Apache pada respons
#                                   yang di-proxy, tanpa campur tangan aplikasi
#    /api/files/download?token=...  apakah aturan khusus jalur unduhan kena.
#                                   Tokennya sengaja cacat: yang diperiksa
#                                   aturan JALURnya, bukan isi berkasnya, dan
#                                   403 pun sudah melewati mod_headers.
# ----------------------------------------------------------------------------
header_dump() {
  echo "  $1"
  curl -sS -D- -o /dev/null -m 30 "$2" \
    | grep -iE '^(HTTP/|x-content-type-options|x-frame-options|referrer-policy|content-disposition):' \
    | sed 's/^/    /'
}

# ----------------------------------------------------------------------------
#  Apakah LEMBAR GAYA yang disajikan itu lembar gaya build yang baru.
#
#  Pemeriksaan API tidak bisa menjawab ini. demo-api dan Next adalah dua proses
#  terpisah: demo-api boleh saja baru, sementara Next masih menyajikan bundel
#  lama dari .next yang gagal ditimpa — dan semua pemeriksaan di atas tetap
#  lulus, karena tidak satu pun menyentuh berkas yang dikirim ke peramban.
#
#  Yang dicari: nama kelas kartu Dashboard Eksekutif. Nama kelas ada di CSS
#  hanya kalau berkas CSS-nya benar-benar ikut terbangun ulang, jadi ia
#  sekaligus menjawab "apakah build-nya baru" dan "apakah kartunya bergaya".
#  Halaman ini dirender di sisi klien, jadi yang diambil bukan HTML-nya
#  melainkan berkas CSS yang ditautkan HTML itu.
# ----------------------------------------------------------------------------
gaya_terpasang() {
  local html css ada=0
  html=$(curl -s -m 30 "$SITE/executive")
  for css in $(printf '%s' "$html" | grep -oE '/_next/static/css/[^"]+\.css' | sort -u); do
    if curl -s -m 30 "$SITE$css" | grep -q 'qhse-exec__card'; then ada=1; break; fi
  done
  if [ "$ada" = 1 ]; then
    echo "  ok   kelas kartu eksekutif ada di CSS yang disajikan — $css"
  else
    echo "  GAGAL kelas kartu eksekutif TIDAK ada di CSS mana pun yang ditautkan"
    echo "        (kartunya akan tampil tanpa kotak; bundel Next kemungkinan basi)"
  fi
}

{
  echo "=== $(date) memeriksa $SITE ==="
  # Dua baris yang menjawab dua pertanyaan berbeda, dan sering keliru dianggap
  # satu: apa yang SEDANG berjalan, dan apa yang akan diambil pemasangan
  # berikutnya. Selama keduanya belum sama, memasang ulang berarti berpindah
  # versi — kadang maju, kadang mundur berminggu-minggu tanpa satu pun galat.
  echo "--- versi ---"
  sed 's/^/  /' "$HOME_DIR/qhse-version" 2>/dev/null \
    || echo "  (belum tercatat — akan terisi pada pemasangan berikutnya)"
  echo "  berikut  : $(cat "$HOME_DIR/qhse-branch" 2>/dev/null || echo master)"
  echo
  echo "halaman depan : $(kode "$SITE/")"
  echo "halaman masuk : $(kode "$SITE/login")"
  echo "dashboard     : $(kode "$SITE/dashboard")"
  echo "api health    : $(curl -s -m 30 "$SITE/api/health")"
  echo
  echo "--- header keamanan apa adanya ---"
  header_dump "halaman"       "$SITE/"
  header_dump "api di-proxy"  "$SITE/api/health"
  header_dump "jalur unduhan" "$SITE/api/files/download?token=ngawur.deadbeef"
  echo
  echo "--- gaya halaman yang benar-benar disajikan ---"
  gaya_terpasang
  echo
  cd "$HOME_DIR/qhse-app/apps/demo-api" && node src/verify.js "$SITE/api"
  echo
  # Dicetak dengan lengkap, bukan disaring ke "next" saja: akun ini menjalankan
  # lebih dari satu aplikasi Node, dan daftar yang sudah tersaring pernah
  # memunculkan dua next-server dengan versi mayor berbeda tanpa cara
  # membedakan mana milik QHSE. Kolom port menjawab itu langsung.
  echo "--- proses ---"
  ps -u semestat -o pid=,rss=,args= | grep -E "demo-api|next" | grep -v grep
  echo "  yang mendengarkan 3400/3401:"
  ss -lntp 2>/dev/null | grep -E ':(3400|3401)\b' | sed 's/^/    /' \
    || echo "    (ss tidak tersedia)"
  echo "=== selesai $(date) ==="
} > "$LOG" 2>&1
