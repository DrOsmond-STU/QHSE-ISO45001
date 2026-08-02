/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Diperlukan untuk Dockerfile pola turbo-prune (task 0.4) — bundle
  // minimal tanpa perlu copy seluruh node_modules ke image.
  output: "standalone",

  // ── Penyesuaian shared hosting (cPanel/CloudLinux) ───────────────────────
  // Akun dibatasi 150 proses/thread (lvenproc). Next.js dan kompiler SWC
  // (Rust/tokio) mengukur ukuran thread-pool dari jumlah CPU HOST — puluhan
  // di mesin bersama — lalu mencoba menelurkan thread sebanyak itu untuk
  // proses yang jatahnya jauh lebih kecil. Hasilnya build mati dengan
  // `pthread_create: Resource temporarily unavailable` (EAGAIN), yaitu
  // kehabisan jatah PROSES — bukan kehabisan memori. Keduanya sama-sama
  // terlihat seperti "build mati", jadi penting membedakannya:
  // os error 11 = EAGAIN = batas proses; SIGKILL = batas memori.
  //
  // Membatasi ke satu worker menekan jumlah thread ke tingkat yang muat.
  // Biayanya build lebih lambat, dan itu memang harga yang dipilih di sini.
  experimental: {
    cpus: 1,
    workerThreads: false,
  },

  // Dengan satu worker, pengumpulan data halaman wajar lebih lama dari
  // ambang bawaan 60 detik. Ambang itulah yang membuat build sebelumnya
  // mengirim SIGTERM ke worker-nya sendiri lalu mengulang dari awal —
  // memperparah kekurangan yang sudah ada.
  staticPageGenerationTimeout: 300,
};

module.exports = nextConfig;
