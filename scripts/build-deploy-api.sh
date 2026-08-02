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
#  APA yang TIDAK ikut: `index.d.ts` 90 MB itu sendiri. Ia hanya dibutuhkan
#  oleh TypeScript saat kompilasi, dan server tidak pernah mengompilasi apa
#  pun untuk API. Meninggalkannya menghemat 90 MB di repositori.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/deploy/api"

echo "==> memastikan Prisma Client + engine Linux tersedia"
( cd "$ROOT/apps/api" && pnpm exec prisma generate >/dev/null )

echo "==> membangun API (tsc)"
( cd "$ROOT/apps/api" && pnpm exec tsc -p tsconfig.json )

echo "==> membersihkan $OUT"
rm -rf "$OUT"
mkdir -p "$OUT/dist" "$OUT/prisma-client"

echo "==> menyalin hasil kompilasi"
cp -r "$ROOT/apps/api/dist/." "$OUT/dist/"

echo "==> menyalin Prisma Client (runtime saja)"
CLIENT_SRC=$(ls -d "$ROOT"/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client | head -1)
for f in index.js default.js edge.js index-browser.js package.json schema.prisma wasm.js; do
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
cp "$ROOT/apps/api/prisma/schema.prisma" "$OUT/prisma-client/schema.prisma"

echo
echo "==> selesai."
du -sh "$OUT/dist" "$OUT/prisma-client" 2>/dev/null || true
echo
echo "Jangan lupa: git add deploy/api && git commit"
