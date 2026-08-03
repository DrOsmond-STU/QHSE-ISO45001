#!/bin/bash
# ============================================================================
#  Diagnostik memori: mengukur RSS puncak API saat boot, langsung dari /proc.
#
#  Dipakai untuk menjawab satu pertanyaan yang tidak boleh ditebak: kenapa
#  proses API mati dalam beberapa detik TANPA menulis pesan apa pun. Diam
#  total seperti itu ambigu — bisa dibunuh sinyal, bisa keluar sendiri — dan
#  menebak salah satunya berarti memperbaiki hal yang salah.
#
#  Hasil pengukurannya di server ini (3 Agustus 2026):
#
#    heap 420 MB -> RSS puncak 814 MB, SIGKILL setelah 7 detik
#    heap 192 MB -> RSS puncak 827 MB, SIGKILL setelah 8 detik
#
#  Batas lve_pmem akun = 1024 MB. Menurunkan batas heap justru sedikit
#  memperburuk, yang mengunci kesimpulannya: ~620 MB dari angka itu BUKAN
#  heap JavaScript melainkan memori native — engine Prisma memuat skema
#  162 model. Tidak ada setelan Node yang menyentuhnya.
#
#  CATATAN ALAT: `/usr/bin/time` TIDAK ADA di server ini. Versi skrip yang
#  memakainya berjalan penuh tapi angka yang justru dicari tidak pernah
#  terekam — satu siklus terbuang. Versi ini hanya memakai /proc dan ps,
#  yang sudah terbukti ada.
#
#  Dipanggil cron; berhenti seketika kalau ~/qhse-rss.request tidak ada.
# ============================================================================
HOME_DIR=/home/semestat
APP_DIR=$HOME_DIR/qhse-app
MARK=$HOME_DIR/qhse-rss.request
LOG=$HOME_DIR/qhse-apitest.log
ENTRY=$APP_DIR/apps/api/build/src/main.js

[ -f "$MARK" ] || exit 0
rm -f "$MARK"

export PATH="$HOME_DIR/.local/share/mise/installs/node/22/bin:$HOME_DIR/.local/bin:$PATH"
export NODE_ENV=production

[ -f "$HOME_DIR/qhse-secrets.sh" ] || { echo "$(date) qhse-secrets.sh tidak ada" >> "$LOG"; exit 1; }
# shellcheck source=/dev/null
. "$HOME_DIR/qhse-secrets.sh"

export WEB_ORIGIN='https://qhse.semestateknologiutama.com'
export API_PUBLIC_BASE_URL='https://qhse.semestateknologiutama.com/api'
export REDIS_ENABLED=false
export STORAGE_MODE=local
export LOCAL_STORAGE_PATH="$HOME_DIR/qhse-data/storage"
export REFRESH_COOKIE_PATH='/api/auth/token'
export TRUST_PROXY=1

total_rss_akun_kb() { ps -u "$(whoami)" -o rss= 2>/dev/null | awk '{s+=$1} END{print s+0}'; }

ukur() {
  local heap="$1"
  echo
  echo "-------- heap $heap MB --------"
  echo "RSS akun sebelum : $(( $(total_rss_akun_kb) / 1024 )) MB"

  local t0=$(date +%s)
  # Port 3402, BUKAN 3401: supaya kalau ada proses lain memegang 3401,
  # kegagalannya tidak tersamar jadi EADDRINUSE.
  PORT=3402 NODE_OPTIONS="--max-old-space-size=$heap" node "$ENTRY" >/tmp/qhse-api-out.$$ 2>&1 &
  local pid=$! maks=0 maksakun=0 r a n=0
  while kill -0 "$pid" 2>/dev/null; do
    r=$(awk '/^VmRSS:/{print $2}' /proc/"$pid"/status 2>/dev/null)
    if [ -n "$r" ]; then
      [ "$r" -gt "$maks" ] && maks=$r
      a=$(total_rss_akun_kb); [ "$a" -gt "$maksakun" ] && maksakun=$a
    fi
    n=$((n + 1)); [ "$n" -gt 300 ] && { echo "(bertahan >60 detik)"; kill "$pid" 2>/dev/null; break; }
    sleep 0.2
  done
  wait "$pid"; local kode=$?
  local t1=$(date +%s)

  echo "RSS PUNCAK proses API : $((maks / 1024)) MB"
  echo "RSS PUNCAK total akun : $((maksakun / 1024)) MB   (batas lve_pmem 1024 MB)"
  echo "kode keluar $kode setelah $((t1 - t0)) detik"
  [ "$kode" -eq 137 ] && echo ">>> 137 = SIGKILL sebelum timeout = dibunuh batas memori akun."
  echo "--- keluaran proses ---"; head -c 1500 /tmp/qhse-api-out.$$ 2>/dev/null
  rm -f /tmp/qhse-api-out.$$
  echo
}

{
  echo "=============================================================="
  echo "=== $(date) mengukur RSS puncak API (via /proc) ==="
  echo "proses akun : $(ps -u "$(whoami)" --no-headers 2>/dev/null | wc -l)"
  cd "$APP_DIR/apps/api" || exit 1
  ukur 420
  sleep 5
  ukur 192
  echo "=== selesai $(date) ==="
} >> "$LOG" 2>&1
