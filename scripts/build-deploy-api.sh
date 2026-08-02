#!/usr/bin/env bash
# ============================================================================
#  Menyusun artefak deploy untuk apps/api ke direktori deploy/api/.
#
#  ══════════════════════════════════════════════════════════════════════════
#   WAJIB DIJALANKAN ULANG setiap kali apps/api atau prisma/schema.prisma
#   berubah, LALU hasilnya di-commit. Kalau lupa, server akan terus
#   menjalankan kode LAMA tanpa satu pun pesan error — kegagalan senyap yang
#   sulit dilacak. Ini harga yang disepakati untuk mengirim artefak jadi.
#  ══════════════════════════════════════════════════════════════════════════
#
#  KENAPA artefak, bukan build di server:
#  `prisma generate` untuk skema 162 model menghasilkan `index.d.ts` sebesar
#  90 MB, dan membangunnya butuh lebih dari 1 GB memori. Paket shared hosting
#  tujuan membatasi memori fisik akun tepat 1 GB — DIUKUR, bukan ditebak:
#  prosesnya dibunuh SIGKILL setelah 16 detik, sementara ulimit cpu/memori
#  keduanya unlimited dan host punya 36 GB bebas, jadi yang membunuh adalah
#  batas LVE CloudLinux. `tsc` untuk API kena sebab yang SAMA: ia harus
#  mem-parsing index.d.ts 90 MB itu karena hampir semua service mengimpor
#  @prisma/client.
#
#  KENAPA HANYA API, bukan web juga:
#  apps/web tidak menyentuh Prisma sama sekali — ia hanya mengompilasi 9 rute
#  kecil dan tiga paket workspace, dan itu muat di jatah memori server. Jadi
#  web tetap dibangun di sana. Konsekuensinya `.next` (bagian terbesar, dan
#  yang paling rapuh kalau dipindah antar sistem operasi) tidak perlu masuk
#  repositori sama sekali.
#
#  KENAPA prisma/ IKUT DIKOMPILASI, bukan cuma src/:
#  supaya skrip seed data demo bisa dijalankan di server dengan `node` biasa.
#  Kalau ia tetap TypeScript, server wajib memakai ts-node — memuat kompiler
#  TypeScript sekaligus mentranspile seluruh pohon impor di memori, padahal
#  seed itu mengimpor AppModule (21 modul NestJS). Itu langkah paling rawan
#  dibunuh dari seluruh pemasangan. Lihat apps/api/tsconfig.deploy.json.
#
#  APA yang TIDAK ikut: berkas .d.ts dan .js.map. Keduanya hanya berguna saat
#  kompilasi dan penelusuran galat di mesin pengembang; server tidak pernah
#  mengompilasi apa pun. Mematikannya memangkas artefak dari 8,5 MB jadi
#  sekitar 4 MB — termasuk index.d.ts Prisma yang 90 MB itu.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API="$ROOT/apps/api"
OUT="$ROOT/deploy/api"

echo "==> memastikan Prisma Client + engine Linux tersedia"
( cd "$API" && pnpm exec prisma generate >/dev/null )

echo "==> membangun API + skrip prisma (tsc, tsconfig.deploy.json)"
rm -rf "$API/dist-deploy"
( cd "$API" && pnpm exec tsc -p tsconfig.deploy.json )

echo "==> membersihkan $OUT"
rm -rf "$OUT"
mkdir -p "$OUT/prisma-client"

# Struktur src/ + prisma/ SENGAJA dipertahankan utuh. Seed hasil kompilasi
# memuat require("../src/app.module"); memindah src/ menjadi dist/ akan
# mematahkannya. Jangan "rapikan" tanpa memperbaiki jalur itu juga.
echo "==> menyalin hasil kompilasi (struktur dipertahankan apa adanya)"
cp -r "$API/dist-deploy" "$OUT/build"

if [ ! -f "$OUT/build/src/main.js" ]; then
  echo "GAGAL: build/src/main.js tidak terbentuk."; exit 1
fi
if [ ! -f "$OUT/build/prisma/seed-demo-data.js" ]; then
  echo "GAGAL: build/prisma/seed-demo-data.js tidak terbentuk."; exit 1
fi

echo "==> menyalin Prisma Client (runtime saja)"
CLIENT_SRC=$(ls -d "$ROOT"/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client | head -1)
for f in index.js default.js edge.js index-browser.js package.json wasm.js; do
  [ -f "$CLIENT_SRC/$f" ] && cp "$CLIENT_SRC/$f" "$OUT/prisma-client/"
done

echo "==> menyalin engine Linux (rhel-openssl-3.0.x)"
# Prisma menaruh engine untuk binaryTargets TAMBAHAN di direktori paket CLI,
# bukan di direktori client — jadi diambil dari sana.
ENGINE=$(find "$ROOT/node_modules" -name 'libquery_engine-rhel-openssl-3.0.x.so.node' -not -path '*.tmp*' | head -1)
if [ -z "$ENGINE" ]; then
  echo "GAGAL: engine rhel-openssl-3.0.x tidak ditemukan."
  echo "Pastikan binaryTargets di prisma/schema.prisma memuat rhel-openssl-3.0.x,"
  echo "lalu jalankan 'pnpm exec prisma generate' sekali agar engine-nya diunduh."
  exit 1
fi
cp "$ENGINE" "$OUT/prisma-client/"

# Prisma Client membaca nama engine dari berkas ini saat runtime.
cp "$API/prisma/schema.prisma" "$OUT/prisma-client/schema.prisma"

echo
echo "==> selesai."
du -sh "$OUT/build" "$OUT/prisma-client" 2>/dev/null || true
echo "    js di build/src   : $(find "$OUT/build/src" -name '*.js' | wc -l)"
echo "    js di build/prisma: $(find "$OUT/build/prisma" -name '*.js' | wc -l)"
echo
echo "Jangan lupa: git add deploy/api && git commit"
