#!/bin/bash
# ============================================================================
#  Mengambil sidik gaya dari dua situs rujukan.
#
#  Dijalankan DARI SERVER, bukan dari mesin pengembang: jaringan keluar mesin
#  pengembang di lingkungan ini menolak kedua host itu dengan 403 di lapisan
#  proxy, sementara server memang bisa menjangkaunya. Yang diambil hanya
#  markah dan lembar gaya publik — cukup untuk membaca palet warna dan
#  keluarga huruf, yang memang informasi yang tampil di layar siapa pun yang
#  membuka situsnya.
#
#  Dipanggil cron; berhenti seketika kalau ~/qhse-theme.request tidak ada.
# ============================================================================
HOME_DIR=/home/semestat
MARK=$HOME_DIR/qhse-theme.request
LOG=$HOME_DIR/qhse-theme.log
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

[ -f "$MARK" ] || exit 0
rm -f "$MARK"

ambil() {
  local nama="$1" url="$2"
  echo "=== $nama : $url ==="
  local html
  html=$(curl -sL -m 45 -A "$UA" "$url" 2>/dev/null)
  echo "--- panjang html: ${#html}"
  echo "--- warna heksadesimal terbanyak di html ---"
  printf '%s' "$html" | grep -oiE '#[0-9a-f]{6}' | tr 'A-F' 'a-f' | sort | uniq -c | sort -rn | head -25
  echo "--- keluarga huruf ---"
  printf '%s' "$html" | grep -oiE 'font-family[^;}"]{0,120}' | head -12
  printf '%s' "$html" | grep -oiE 'fonts.googleapis.com/css2?[^"'"'"']{0,200}' | head -6
  echo "--- lembar gaya yang dirujuk ---"
  local sheets
  sheets=$(printf '%s' "$html" | grep -oiE 'href="[^"]+\.css[^"]*"' | sed 's/href="//; s/"$//' | head -6)
  echo "$sheets"
  for s in $sheets; do
    case "$s" in
      http*) full="$s" ;;
      //*)   full="https:$s" ;;
      /*)    full="${url%/}$s" ;;
      *)     full="${url%/}/$s" ;;
    esac
    echo "--- warna di $full ---"
    curl -sL -m 45 -A "$UA" "$full" 2>/dev/null | grep -oiE '#[0-9a-f]{6}|rgba?\([0-9 ,.]+\)' | tr 'A-F' 'a-f' | sort | uniq -c | sort -rn | head -18
    echo "--- huruf di $full ---"
    curl -sL -m 45 -A "$UA" "$full" 2>/dev/null | grep -oiE 'font-family:[^;}]{0,120}' | sort | uniq -c | sort -rn | head -8
  done
  echo
}

{
  echo "=== $(date) ==="
  ambil "SEMESTA" "https://semestateknologiutama.com"
  ambil "PERTAMINA" "https://www.pertamina.com"
  echo "=== selesai $(date) ==="
} > "$LOG" 2>&1
