#!/bin/bash
# Bukti bahwa bundel yang DISAJIKAN memuat perubahan terakhir.
#
# Dipanggil qhse-live-check.sh dengan argumen $1 = alamat situs.
#
# KENAPA BERKAS TERPISAH: yang diperiksa di sini berubah tiap kali ada fitur
# baru — nama kelas atau teks yang khas milik commit terakhir. Menaruhnya di
# dalam pemeriksa utama berarti berkas yang jarang berubah itu ikut disunting
# tiap kali, dan riwayat perubahannya jadi sulit dibaca.
#
# Apa yang membuat pemeriksaan ini berbeda dari "halaman masuk: 200":
# kode 200 hanya membuktikan ADA yang menjawab, bukan bahwa yang menjawab itu
# versi yang baru dipasang. Next menyajikan bundel dari direktori .next; kalau
# build gagal separuh jalan dan bundel lama tertinggal, seluruh pemeriksaan
# HTTP tetap lulus sementara yang dilihat pengguna adalah aplikasi kemarin.
SITE=${1:?alamat situs wajib diisi}

periksa() {
  local nama="$1" url="$2" pola="$3"
  if curl -s -m 30 "$url" | grep -q "$pola"; then
    echo "  ok   $nama"
  else
    echo "  GAGAL $nama — pola '$pola' tidak ada di $url"
  fi
}

# 1. Pemilih bahasa dan panel penjelasan pada halaman masuk. Keduanya dirender
#    server, jadi ada di HTML mentah tanpa perlu menjalankan JavaScript.
#
#    Judul panelnya dicari sebagai KALIMAT, bukan sebagai nama kelas: kelas
#    bisa saja ada di lembar gaya sementara elemennya tidak pernah dirender,
#    dan halaman masuk adalah satu-satunya halaman yang bisa dilihat orang
#    yang belum punya akun — kalau isinya hilang, tidak ada pengguna yang
#    akan melaporkannya karena mereka semua sudah bisa masuk.
periksa "pemilih bahasa ada di halaman masuk" "$SITE/login" "qhse-login__lang"
periksa "panel penjelasan ada di halaman masuk" "$SITE/login" "Bukti K3 Anda"

# 2. Lembar gaya: kelas kartu eksekutif DAN kelas pemilih bahasa di bilah atas.
#    Keduanya dicari di seluruh berkas CSS yang ditautkan halaman eksekutif.
html=$(curl -s -m 30 "$SITE/executive")
daftar=$(printf '%s' "$html" | grep -oE '/_next/static/css/[^"]+\.css' | sort -u)
kartu=0
bahasa=0
# Tiga penanda gaya Soft UI (dipasang 4 Agustus 2026). Dipisah bertiga, bukan
# satu, karena ketiganya berasal dari berkas sumber yang berbeda — token,
# app-shell, dan komponen kartu KPI — jadi kalau salah satu build gagal
# separuh jalan, yang gagal itu langsung kelihatan yang mana.
cincin=0
blur=0
ubin=0
for css in $daftar; do
  isi=$(curl -s -m 30 "$SITE$css")
  printf '%s' "$isi" | grep -q 'qhse-exec__card' && kartu=1
  printf '%s' "$isi" | grep -q 'qhse-shell__lang-option' && bahasa=1
  printf '%s' "$isi" | grep -q 'card-ring' && cincin=1
  printf '%s' "$isi" | grep -q 'blur(30px)' && blur=1
  printf '%s' "$isi" | grep -q 'qhse-kpi-card__tile' && ubin=1
done
[ "$kartu" = 1 ] && echo "  ok   kelas kartu eksekutif ada di CSS yang disajikan" \
                 || echo "  GAGAL kelas kartu eksekutif TIDAK ada di CSS mana pun"
[ "$bahasa" = 1 ] && echo "  ok   kelas pemilih bahasa ada di CSS yang disajikan" \
                  || echo "  GAGAL kelas pemilih bahasa TIDAK ada di CSS mana pun"
[ "$cincin" = 1 ] && echo "  ok   token cincin kartu (soft UI) ada di CSS yang disajikan" \
                  || echo "  GAGAL token --qhse-card-ring TIDAK ada di CSS mana pun"
[ "$blur" = 1 ] && echo "  ok   bilah atas berblur 30px ada di CSS yang disajikan" \
                || echo "  GAGAL backdrop blur(30px) TIDAK ada di CSS mana pun"
[ "$ubin" = 1 ] && echo "  ok   ubin gradien kartu KPI ada di CSS yang disajikan" \
               || echo "  GAGAL kelas qhse-kpi-card__tile TIDAK ada di CSS mana pun"

# 3. Teks Inggris di bundel JavaScript. Menu diterjemahkan di sisi klien, jadi
#    kalimatnya harus ada di dalam berkas JS — bukan di HTML.
js=$(printf '%s' "$html" | grep -oE '/_next/static/chunks/[^"]+\.js' | sort -u)
inggris=0
for berkas in $js; do
  curl -s -m 30 "$SITE$berkas" | grep -q 'Executive Dashboard' && { inggris=1; break; }
done
[ "$inggris" = 1 ] && echo "  ok   teks antarmuka Inggris ada di bundel JS" \
                   || echo "  GAGAL teks antarmuka Inggris TIDAK ada di bundel JS mana pun"

echo "  catatan: berkas CSS yang diperiksa —"
printf '%s\n' $daftar | sed 's/^/    /'
