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

{
  echo "=== $(date) memeriksa $SITE ==="
  echo "halaman depan : $(kode "$SITE/")"
  echo "halaman masuk : $(kode "$SITE/login")"
  echo "dashboard     : $(kode "$SITE/dashboard")"
  echo "api health    : $(curl -s -m 30 "$SITE/api/health")"
  echo
  cd "$HOME_DIR/qhse-app/apps/demo-api" && node src/verify.js "$SITE/api"
  echo
  echo "--- proses ---"
  ps -u semestat -o rss=,args= | grep -E "demo-api|next" | grep -v grep
  echo "=== selesai $(date) ==="
} > "$LOG" 2>&1
