#!/bin/bash
# ============================================================================
#  Pembungkus penguncian untuk qhse-runner.sh.
#
#  Pemasangan aplikasi ini (pnpm install + 112 migrasi + dua build) berlangsung
#  jauh lebih lama daripada jarak antar-panggilan cron. Tanpa kunci, putaran
#  cron berikutnya akan memulai `pnpm install` KEDUA di direktori yang sama
#  sementara yang pertama masih menulis — cara yang efektif untuk merusak
#  node_modules dan menghasilkan kegagalan yang tidak masuk akal saat dibaca.
#
#  Kunci memakai `mkdir`, bukan `touch`: pembuatan direktori itu atomik pada
#  filesystem POSIX, sedangkan "cek-lalu-buat" berkas biasa punya celah balapan.
#
#  Kunci yang lebih tua dari 90 menit dianggap basi (prosesnya mati tanpa
#  sempat membersihkan) dan diambil alih — kalau tidak, satu proses yang
#  terbunuh OOM akan membuat aplikasi ini tidak pernah bisa dipasang lagi
#  tanpa campur tangan manual.
#
#  Alasan file terpisah, bukan digabung ke runner: skrip runner boleh diubah
#  kapan saja lewat File Manager, dan bash membaca skrip secara bertahap saat
#  menjalankannya — mengubah berkas yang sedang dieksekusi bisa membuat bash
#  melompat ke posisi byte yang salah. Pembungkus ini nyaris tidak pernah
#  perlu diubah, jadi risiko itu tidak pernah muncul untuknya.
#
#  Jadwal: 3,13,23,33,43,53 * * * *
#  Menit ber-akhiran 3 adalah satu-satunya slot yang tidak pernah berhimpit
#  dengan cron */5, */6, */7, */9, */10 milik aplikasi lain di akun ini.
# ============================================================================
LOCKDIR=/home/semestat/.qhse-runner.lock

if ! mkdir "$LOCKDIR" 2>/dev/null; then
  if [ -n "$(find "$LOCKDIR" -maxdepth 0 -mmin +90 2>/dev/null)" ]; then
    echo "=== $(date) kunci basi (>90 menit) diambil alih ===" >> /home/semestat/qhse-install.log
    rmdir "$LOCKDIR" 2>/dev/null
    mkdir "$LOCKDIR" 2>/dev/null || exit 0
  else
    exit 0
  fi
fi

# Kunci dilepas apa pun yang terjadi, termasuk bila runner gagal di tengah.
# Proses aplikasi yang dinyalakan runner memakai nohup dan tidak terpengaruh.
trap 'rmdir "$LOCKDIR" 2>/dev/null' EXIT

/bin/bash /home/semestat/qhse-runner.sh
