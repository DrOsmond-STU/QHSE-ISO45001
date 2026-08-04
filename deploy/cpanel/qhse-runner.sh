#!/bin/bash
# ============================================================================
#  QHSE Enterprise Platform — pemasang + penjaga proses (cPanel/CloudLinux).
#             /            ->  127.0.0.1:3400   (Next.js, frontend)
#             /api/*       ->  127.0.0.1:3401   (NestJS, API)
#
#  Hosting ini tidak punya Passenger, jadi tidak ada yang menyalakan ulang
#  proses yang mati. Cron memanggil skrip ini lewat qhse-cron.sh (yang memegang
#  kuncinya). Aman dipanggil berulang: bila kedua proses hidup dan tidak ada
#  permintaan apa pun, skrip keluar tanpa mengerjakan apa-apa.
#
#  RAHASIA DIMUAT DARI BERKAS TERPISAH — lihat qhse-secrets.sh.example.
#  Pemisahan itu ada supaya berkas ini bisa dicadangkan ke repositori tanpa
#  membawa kata sandi basis data dan kunci enkripsi ikut serta.
#
#  ---------------------------------------------------------------------------
#  DUA BATAS BERBEDA DI AKUN INI — jangan tertukar, obatnya BERLAWANAN:
#
#   1. MEMORI (lve_pmem = 1 GB). Gejala: SIGKILL / kode keluar 137, atau mati
#      TANPA pesan apa pun sama sekali. Korban: `prisma generate` (index.d.ts
#      90 MB untuk 162 model) dan `tsc` API yang harus mem-parsingnya.
#      Obat: jangan dibangun di sini — artefaknya dikirim jadi lewat
#      repositori (deploy/api/build/).
#
#   2. PROSES/THREAD (lvenproc = 150). Gejala: `pthread_create: Resource
#      temporarily unavailable`, `os error 11` (EAGAIN), panic tokio
#      "OS can't spawn worker thread". Korban: `next build`, karena Next.js
#      dan SWC mengukur thread-pool dari jumlah CPU HOST (puluhan).
#      Obat: TURUNKAN konkurensi — bukan naikkan memori.
#
#  Cara membedakan cepat: EAGAIN selalu menyebut dirinya sendiri; kehabisan
#  memori mati tanpa sepatah kata.
#
#  Pelajaran lain yang sudah dibayar mahal:
#   - .npmrc (verify-deps-before-run=false) mencegah tiap `pnpm exec` memicu
#     install penuh sendiri, yang dulu mengubah SATU kegagalan jadi lima.
#   - install dipecah per aplikasi; sekali jalan untuk 8 project tidak muat.
#   - --prod=false WAJIB: NODE_ENV=production membuat pnpm melewati
#     devDependencies, padahal `prisma`, `typescript`, dan `dotenv` ada di sana.
#   - pnpm TIDAK menaikkan binari ke node_modules/.bin akar workspace.
#   - cron pada menit ber-akhiran 3 — satu-satunya slot yang tidak berhimpit
#     dengan cron */5, */6, */7, */9, */10 milik aplikasi lain di akun ini.
# ============================================================================
HOME_DIR=/home/semestat
APP_DIR=$HOME_DIR/qhse-app
DATA_DIR=$HOME_DIR/qhse-data
# Cabang yang diambil bisa diganti tanpa menyunting skrip ini: tulis nama
# cabangnya ke ~/qhse-branch. Bawaannya master. Ini ada karena pekerjaan yang
# belum digabung ke master tetap perlu bisa diuji di server yang sebenarnya —
# menyunting URL langsung di sini berarti perubahan sementara itu ikut
# tercadangkan ke repositori dan gampang tertinggal di sana.
SRC_BRANCH=$(cat /home/semestat/qhse-branch 2>/dev/null | tr -d ' \t\r\n')
[ -z "$SRC_BRANCH" ] && SRC_BRANCH=master
SRC_TARBALL="https://codeload.github.com/DrOsmond-STU/QHSE-ISO45001/tar.gz/refs/heads/$SRC_BRANCH"

PROBE=$HOME_DIR/qhse-probe.request
REQUEST=$HOME_DIR/qhse-install.request
WEBREQ=$HOME_DIR/qhse-web.request
SEED=$HOME_DIR/qhse-seed.request
DEMOSEED=$HOME_DIR/qhse-demo-seed.request
RESTART=$HOME_DIR/qhse-restart.request

# Kehadiran berkas ini memilih demo-api (apps/demo-api) sebagai proses yang
# melayani /api, menggantikan NestJS. Ia ADA karena apps/api terbukti tidak
# muat di akun ini: RSS puncaknya 814 MB saat boot melawan batas keras 1024 MB,
# dan sekitar 620 MB dari angka itu adalah memori native engine Prisma yang
# memuat skema 162 model — bukan heap JavaScript, jadi tidak ada setelan Node
# yang bisa menurunkannya. Hapus berkas ini begitu penyebab itu hilang
# (paket hosting yang lebih besar, atau Prisma tanpa engine terpisah).
DEMOMODE=$HOME_DIR/qhse-demo-mode

API_PID=$HOME_DIR/qhse-api.pid
WEB_PID=$HOME_DIR/qhse-web.pid
API_LOG=$HOME_DIR/qhse-api.log
WEB_LOG=$HOME_DIR/qhse-web.log
INSTALL_LOG=$HOME_DIR/qhse-install.log

# Struktur build/src + build/prisma SENGAJA dipertahankan seperti keluaran
# tsc, karena seed memuat require("../src/app.module") — memindah src/ akan
# mematahkannya.
API_ENTRY=$APP_DIR/apps/api/build/src/main.js
SEED_ENTRY=$APP_DIR/apps/api/build/prisma/seed-demo-data.js

# demo-api adalah JavaScript polos tanpa langkah build — tidak ada padanan
# artefak deploy/ untuknya, dan memang tidak perlu ada.
DEMO_API_ENTRY=$APP_DIR/apps/demo-api/src/server.js
DEMO_SEED_ENTRY=$APP_DIR/apps/demo-api/src/seed/seed.js

# pnpm hanya menaruh `next` di apps/web/node_modules/.bin. Jalur akar
# workspace membuat web gagal menyala enam kali berturut-turut dengan
# "No such file or directory", padahal build-nya sendiri sukses.
WEB_BIN=$APP_DIR/apps/web/node_modules/.bin/next

export PATH="$HOME_DIR/.local/share/mise/installs/node/22/bin:$HOME_DIR/.local/bin:$PATH"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

mkdir -p "$DATA_DIR/storage"
export NODE_ENV=production

# --- Rahasia -----------------------------------------------------------------
# Berhenti kalau tidak ada: lebih baik gagal jelas di sini daripada menyalakan
# aplikasi tanpa kunci enkripsi lalu menulis data yang tidak bisa dibaca lagi.
if [ ! -f "$HOME_DIR/qhse-secrets.sh" ]; then
  echo "$(date) FATAL: ~/qhse-secrets.sh tidak ada. Lihat qhse-secrets.sh.example." >> "$INSTALL_LOG"
  exit 1
fi
# shellcheck source=/dev/null
. "$HOME_DIR/qhse-secrets.sh"

# --- Konfigurasi non-rahasia -------------------------------------------------
export WEB_ORIGIN='https://qhse.semestateknologiutama.com'
export API_PUBLIC_BASE_URL='https://qhse.semestateknologiutama.com/api'
export REDIS_ENABLED=false
export STORAGE_MODE=local
export LOCAL_STORAGE_PATH="$DATA_DIR/storage"
# /api dipotong oleh .htaccess sebelum sampai ke NestJS, jadi path cookie
# refresh token harus menyertakan awalan itu supaya peramban mengirimkannya.
export REFRESH_COOKIE_PATH='/api/auth/token'
# Apache mod_proxy ada di depan. Tanpa ini req.ip = 127.0.0.1 untuk SEMUA
# permintaan, dan kolom ip_address di user_sessions — yang memang jejak audit —
# jadi tidak ada gunanya.
export TRUST_PROXY=1

HEAP_INSTALL='--max-old-space-size=320'
HEAP_MIGRATE='--max-old-space-size=384'
HEAP_BUILD='--max-old-space-size=448'
HEAP_API='--max-old-space-size=420'
# demo-api terukur memakai ~65 MB RSS saat melayani seluruh rute; 128 MB
# memberi ruang lebih dari cukup tanpa mengambil jatah proses web.
HEAP_DEMO_API='--max-old-space-size=128'
HEAP_WEB='--max-old-space-size=256'

for f in "$API_LOG" "$WEB_LOG" "$INSTALL_LOG"; do
  if [ -f "$f" ] && [ "$(stat -c%s "$f" 2>/dev/null || echo 0)" -gt 5242880 ]; then
    tail -c 1048576 "$f" > "$f.tmp" && mv "$f.tmp" "$f"
  fi
done

mem_akun() { free -m 2>/dev/null | awk '/^Mem:/{print "total "$2"MB terpakai "$3"MB"}'; }

stop_one() {
  local pidfile="$1"
  if [ -f "$pidfile" ]; then
    kill "$(cat "$pidfile" 2>/dev/null)" 2>/dev/null
    sleep 2
    rm -f "$pidfile"
  fi
}
stop_all() { stop_one "$API_PID"; stop_one "$WEB_PID"; }
alive() { [ -f "$1" ] && kill -0 "$(cat "$1" 2>/dev/null)" 2>/dev/null; }

jalankan() {
  local nama="$1"; shift
  echo "--- $nama ---"
  "$@"
  local kode=$?
  echo "--- $nama kode keluar $kode ---"
  if [ "$kode" -ne 0 ]; then
    [ "$kode" -eq 137 ] && echo "!!! DIBUNUH kehabisan MEMORI (SIGKILL) — lve_pmem 1 GB terlampaui."
    [ "$kode" -eq 134 ] && echo "!!! ABORT — periksa apakah pesannya EAGAIN/pthread_create (batas PROSES), bukan memori."
    echo "!!! DIHENTIKAN pada langkah: $nama"
    return 1
  fi
  return 0
}

# taskset menyempitkan CPU yang TERLIHAT. Itu penting karena tokio dan rayon
# mengukur thread-pool dari available_parallelism(), jadi menyempitkan CPU
# otomatis mengecilkan semua pool sekaligus — tanpa perlu tahu nama variabel
# lingkungan tiap pustaka, yang berbeda-beda dan berubah antar versi.
build_web() {
  local TS=""
  command -v taskset >/dev/null 2>&1 && TS="taskset -c 0,1"
  [ -n "$TS" ] && echo "membatasi CPU untuk build web: $TS" || echo "taskset tidak tersedia"

  export NEXT_PUBLIC_API_URL='https://qhse.semestateknologiutama.com/api'
  # ID tenant baru ada SETELAH seed berjalan, sedangkan Next.js membakar
  # variabel NEXT_PUBLIC_* saat build. Karena itu ada penanda qhse-web.request
  # terpisah: bangun ulang web saja setelah seed, tanpa install ulang penuh.
  export NEXT_PUBLIC_DEFAULT_TENANT_ID="$(cat "$HOME_DIR/qhse-tenant-id" 2>/dev/null || echo '')"
  export NEXT_TELEMETRY_DISABLED=1
  export UV_THREADPOOL_SIZE=2
  export RAYON_NUM_THREADS=1
  echo "NEXT_PUBLIC_DEFAULT_TENANT_ID=${NEXT_PUBLIC_DEFAULT_TENANT_ID:-<kosong>}"

  jalankan "build web (next)" $TS env NODE_OPTIONS="$HEAP_BUILD" \
    pnpm --filter @qhse/web run build
}

# --- 0. Diminta memeriksa lingkungan? ---------------------------------------
if [ -f "$PROBE" ]; then
  {
    echo "=== $(date) memeriksa lingkungan ==="
    rm -f "$PROBE"
    echo "node : $(node -v 2>&1)"
    corepack enable pnpm >/dev/null 2>&1
    echo "pnpm : $(pnpm -v 2>&1)"
    echo -n "disk : "; df -h "$HOME_DIR" 2>/dev/null | tail -1
    echo "cpu terlihat : $(nproc 2>&1)"
    echo "proses akun  : $(ps -u "$(whoami)" --no-headers 2>/dev/null | wc -l)"
    echo "next ada?    : $([ -x "$WEB_BIN" ] && echo YA || echo TIDAK)"
    echo "=== selesai $(date) ==="
  } >> "$INSTALL_LOG" 2>&1
fi

# --- 1. Diminta memasang? ---------------------------------------------------
if [ -f "$REQUEST" ]; then
  {
    echo "=== $(date) PEMASANGAN dimulai (cabang $SRC_BRANCH) ==="
    rm -f "$REQUEST"

    TMP=$HOME_DIR/.qhse-fetch
    rm -rf "$TMP"; mkdir -p "$TMP"

    if ! curl -fsSL -m 600 "$SRC_TARBALL" -o "$TMP/src.tar.gz"; then
      echo "GAGAL mengunduh — repositori private, cabang tidak ada, atau jaringan bermasalah."
      echo "URL: $SRC_TARBALL"
      rm -rf "$TMP"; exit 0
    fi
    echo "unduhan: $(stat -c%s "$TMP/src.tar.gz") byte"

    # Sidik jari isi arsip, diambil SEBELUM arsipnya dihapus. Dipakai di
    # ~/qhse-version supaya dua pemasangan dari cabang yang sama tapi isi
    # berbeda bisa dibedakan — nama cabang saja tidak pernah cukup untuk itu.
    SIDIK=$(sha256sum "$TMP/src.tar.gz" 2>/dev/null | cut -c1-12)

    if ! tar -xzf "$TMP/src.tar.gz" -C "$TMP" --strip-components=1; then
      echo "GAGAL mengekstrak tarball"; rm -rf "$TMP"; exit 0
    fi
    rm -f "$TMP/src.tar.gz"

    # AKAR repositori git ADALAH direktori qhse-platform, jadi package.json
    # monorepo ada tepat di akar arsip — bukan satu tingkat di dalamnya.
    if [ ! -f "$TMP/package.json" ]; then
      echo "GAGAL: package.json tidak ada di akar arsip."; ls -1 "$TMP" | head
      rm -rf "$TMP"; exit 0
    fi
    # Dijaga SEBELUM apa pun diganti: kalau artefak tidak ikut ter-commit,
    # lebih baik berhenti dengan pesan jelas daripada memasang aplikasi yang
    # tak mungkin menyala.
    for wajib in deploy/api/build/src/main.js deploy/api/build/prisma/seed-demo-data.js; do
      if [ ! -f "$TMP/$wajib" ]; then
        echo "GAGAL: $wajib tidak ada di arsip."
        echo "Jalankan scripts/build-deploy-api.sh lalu push."
        rm -rf "$TMP"; exit 0
      fi
    done

    stop_all
    rm -rf "$APP_DIR.lama"
    [ -d "$APP_DIR" ] && mv "$APP_DIR" "$APP_DIR.lama"
    mv "$TMP" "$APP_DIR"
    if [ -d "$APP_DIR.lama/node_modules" ]; then
      mv "$APP_DIR.lama/node_modules" "$APP_DIR/node_modules"
      echo "node_modules dari pemasangan sebelumnya dipakai ulang"
    fi
    for d in apps/api apps/demo-api apps/web packages/i18n packages/shared-types packages/ui-components; do
      [ -d "$APP_DIR.lama/$d/node_modules" ] && mv "$APP_DIR.lama/$d/node_modules" "$APP_DIR/$d/node_modules" 2>/dev/null
    done
    rm -rf "$APP_DIR.lama"

    cat > "$APP_DIR/.npmrc" <<'NPMRC'
verify-deps-before-run=false
child-concurrency=1
network-concurrency=3
side-effects-cache=false
NPMRC

    cd "$APP_DIR" || exit 1
    corepack enable pnpm >/dev/null 2>&1

    jalankan "pnpm install (dependensi API)" env NODE_OPTIONS="$HEAP_INSTALL" \
      pnpm install --frozen-lockfile --prod=false --filter @qhse/api || exit 0

    # Murni SQL, ringan, idempotent — tidak melakukan apa-apa bila semua
    # migrasi sudah terpasang, tapi otomatis menerapkan yang baru nanti.
    jalankan "prisma migrate deploy" env NODE_OPTIONS="$HEAP_MIGRATE" \
      pnpm --filter @qhse/api exec prisma migrate deploy || exit 0

    echo "--- memasang artefak API (pengganti tsc + prisma generate) ---"
    rm -rf "$APP_DIR/apps/api/build"
    cp -a "$APP_DIR/deploy/api/build" "$APP_DIR/apps/api/build"
    echo "build/src   : $(find "$APP_DIR/apps/api/build/src" -name '*.js' | wc -l) berkas js"
    echo "build/prisma: $(find "$APP_DIR/apps/api/build/prisma" -name '*.js' | wc -l) berkas js"

    # Jalurnya DICARI, bukan ditulis mati: nama direktori .pnpm memuat hash
    # yang berubah bila lockfile berubah.
    CLIENT_PARENT=$(ls -d "$APP_DIR"/node_modules/.pnpm/@prisma+client@*/node_modules 2>/dev/null | head -1)
    if [ -z "$CLIENT_PARENT" ]; then
      echo "!!! GAGAL: direktori @prisma/client tidak ditemukan."; exit 0
    fi
    mkdir -p "$CLIENT_PARENT/.prisma/client"
    cp -a "$APP_DIR/deploy/api/prisma-client/." "$CLIENT_PARENT/.prisma/client/"
    ls -1 "$CLIENT_PARENT/.prisma/client" | grep libquery_engine | sed 's/^/  engine: /'

    # Dua dependensi saja (pg + argon2) dan keduanya sudah ada di store pnpm
    # karena apps/api memakai argon2 — langkah ini nyaris tidak berbiaya.
    # `|| true` disengaja: kalau demo-api gagal dipasang, sisa pemasangan
    # (web, migrasi, artefak API) tetap harus selesai.
    if [ -d "$APP_DIR/apps/demo-api" ]; then
      jalankan "pnpm install (demo-api)" env NODE_OPTIONS="$HEAP_INSTALL" \
        pnpm install --frozen-lockfile --prod=false --filter @qhse/demo-api || true
    fi

    jalankan "pnpm install (web + 3 paket workspace)" env NODE_OPTIONS="$HEAP_INSTALL" \
      pnpm install --frozen-lockfile --prod=false --filter "@qhse/web..." || exit 0

    jalankan "build paket workspace" env NODE_OPTIONS="$HEAP_BUILD" \
      pnpm --filter "@qhse/web^..." run build || exit 0

    build_web || exit 0

    # -------------------------------------------------------------------------
    #  Catat APA yang barusan terpasang.
    #
    #  ~/qhse-branch sudah ada, tapi ia menyatakan cabang yang akan diambil
    #  pemasangan BERIKUTNYA — bukan yang sedang berjalan sekarang. Keduanya
    #  berbeda setiap kali isinya diganti tanpa memasang ulang, dan selama ini
    #  bedanya tidak terlihat dari mana pun: tidak dari log, tidak dari
    #  pemeriksaan live, tidak dari aplikasinya sendiri.
    #
    #  Itu bukan soal kerapian. Menyetel ~/qhse-branch kembali ke master
    #  sebelum cabang fiturnya digabung akan MEMUNDURKAN seluruh aplikasi pada
    #  pemasangan berikutnya, tanpa satu pun galat — semua langkah sukses,
    #  situsnya tetap hidup, hanya isinya yang mundur berminggu-minggu. Berkas
    #  ini membuat kemunduran seperti itu terbaca dalam satu baris.
    # -------------------------------------------------------------------------
    printf 'cabang   : %s\nsidik    : %s\ndipasang : %s\n' \
      "$SRC_BRANCH" "${SIDIK:-tidak diketahui}" "$(date)" > "$HOME_DIR/qhse-version"

    echo "=== PEMASANGAN selesai $(date) ==="
  } >> "$INSTALL_LOG" 2>&1
fi

# --- 1b. Bangun ulang web SAJA ----------------------------------------------
if [ -f "$WEBREQ" ] && [ -d "$APP_DIR/apps/web" ]; then
  {
    echo "=== $(date) BANGUN ULANG WEB saja ==="
    rm -f "$WEBREQ"
    cd "$APP_DIR" || exit 1
    corepack enable pnpm >/dev/null 2>&1
    if build_web; then
      stop_one "$WEB_PID"   # dimatikan supaya bagian 6 menyalakannya kembali
      echo "=== selesai $(date) ==="
    fi
  } >> "$INSTALL_LOG" 2>&1
fi

# --- 2. Semai data demo -----------------------------------------------------
# `node` biasa atas berkas hasil kompilasi — BUKAN ts-node. Lewat ts-node ia
# memuat kompiler TypeScript DAN mentranspile seluruh pohon impor di memori,
# padahal seed mengimpor AppModule (21 modul). Itu menabrak batas memori.
if [ -f "$SEED" ] && [ -f "$SEED_ENTRY" ]; then
  {
    echo "=== $(date) menyemai data demo ==="
    rm -f "$SEED"
    cd "$APP_DIR/apps/api" || exit 1
    NODE_OPTIONS="$HEAP_BUILD" node "$SEED_ENTRY"
    echo "--- seed kode keluar $? ---"
  } >> "$INSTALL_LOG" 2>&1
fi

# --- 2b. Semai data dummy lewat demo-api ------------------------------------
# Jalur ini TIDAK memuat AppModule maupun Prisma, jadi ia berhasil di akun ini
# sementara langkah 2 di atas tidak. Id tenant-nya tetap (diturunkan dari kode
# tenant, bukan diacak) dan ditulis ke ~/qhse-tenant-id supaya build web
# berikutnya membakarnya sebagai NEXT_PUBLIC_DEFAULT_TENANT_ID — halaman masuk
# jadi terisi otomatis, tanpa ada yang perlu menyalin UUID dengan tangan.
if [ -f "$DEMOSEED" ] && [ -f "$DEMO_SEED_ENTRY" ]; then
  {
    echo "=== $(date) menyemai data dummy (demo-api) ==="
    rm -f "$DEMOSEED"
    cd "$APP_DIR/apps/demo-api" || exit 1
    QHSE_TENANT_ID_FILE="$HOME_DIR/qhse-tenant-id" NODE_OPTIONS="$HEAP_DEMO_API" node "$DEMO_SEED_ENTRY"
    echo "--- seed demo-api kode keluar $? ---"
    echo "tenant id tersimpan: $(cat "$HOME_DIR/qhse-tenant-id" 2>/dev/null || echo '<kosong>')"
  } >> "$INSTALL_LOG" 2>&1
fi

# --- 3. Nyalakan ulang ------------------------------------------------------
if [ -f "$RESTART" ]; then rm -f "$RESTART"; stop_all; fi

# --- 4. Pilih proses mana yang melayani /api --------------------------------
# Bila ~/qhse-demo-mode ada DAN demo-api benar-benar terpasang, dialah yang
# dipakai. Pemeriksaan berkasnya dilakukan di sini, bukan diasumsikan: mode
# demo yang menunjuk berkas yang tidak ada akan membuat /api mati tanpa
# satu pun baris log yang menjelaskan kenapa.
if [ -f "$DEMOMODE" ] && [ -f "$DEMO_API_ENTRY" ]; then
  AKTIF_ENTRY=$DEMO_API_ENTRY
  AKTIF_HEAP=$HEAP_DEMO_API
  AKTIF_NAMA='demo-api'
  AKTIF_CWD=$APP_DIR/apps/demo-api
else
  AKTIF_ENTRY=$API_ENTRY
  AKTIF_HEAP=$HEAP_API
  AKTIF_NAMA='NestJS'
  AKTIF_CWD=$APP_DIR/apps/api
fi

[ -f "$AKTIF_ENTRY" ] || exit 0

# --- 5. Nyalakan API bila mati ----------------------------------------------
# Keadaannya DIPERIKSA setelah dinyalakan. Tanpa ini, proses yang mati saat
# boot menghilang tanpa jejak apa pun di log — persis yang terjadi enam kali
# dan menghabiskan banyak waktu untuk didiagnosis.
if ! alive "$API_PID"; then
  cd "$AKTIF_CWD" || exit 1
  echo "=== menyalakan API ($AKTIF_NAMA) $(date) — node $(node -v 2>&1) ===" >> "$API_LOG"
  PORT=3401 NODE_OPTIONS="$AKTIF_HEAP" nohup node "$AKTIF_ENTRY" >> "$API_LOG" 2>&1 &
  APIPID=$!
  echo $APIPID > "$API_PID"
  sleep 12
  if kill -0 "$APIPID" 2>/dev/null; then
    echo "[runner] API hidup 12 detik setelah dinyalakan (pid $APIPID)" >> "$API_LOG"
  else
    echo "[runner] !!! API MATI dalam 12 detik. Tidak ada pesan di atas berarti" >> "$API_LOG"
    echo "[runner] !!! ia dibunuh sinyal (memori), bukan gagal dengan galat." >> "$API_LOG"
    echo "[runner] !!! memori: $(mem_akun)" >> "$API_LOG"
    rm -f "$API_PID"
  fi
fi

# --- 6. Nyalakan web bila mati ----------------------------------------------
if [ -d "$APP_DIR/apps/web/.next" ] && ! alive "$WEB_PID"; then
  if [ ! -x "$WEB_BIN" ]; then
    echo "=== $(date) TIDAK bisa menyalakan web: $WEB_BIN tidak ada ===" >> "$WEB_LOG"
  else
    cd "$APP_DIR/apps/web" || exit 1
    echo "=== menyalakan web $(date) ===" >> "$WEB_LOG"
    PORT=3400 HOSTNAME=127.0.0.1 NODE_OPTIONS="$HEAP_WEB" \
      nohup "$WEB_BIN" start -p 3400 -H 127.0.0.1 >> "$WEB_LOG" 2>&1 &
    WEBPID=$!
    echo $WEBPID > "$WEB_PID"
    sleep 8
    if kill -0 "$WEBPID" 2>/dev/null; then
      echo "[runner] web hidup 8 detik setelah dinyalakan (pid $WEBPID)" >> "$WEB_LOG"
    else
      echo "[runner] !!! web MATI dalam 8 detik. memori: $(mem_akun)" >> "$WEB_LOG"
      rm -f "$WEB_PID"
    fi
  fi
fi
