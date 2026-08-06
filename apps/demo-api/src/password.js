// Verifikasi kata sandi argon2id.
//
// Formatnya SENGAJA sama dengan apps/api (argon2id lewat paket `argon2`),
// bukan sesuatu yang lebih mudah dipasang. Kolom users.password_hash dipakai
// bersama: kalau penyemai demo menulis hash beralgoritma lain, akun demo
// berhenti bisa dipakai masuk lewat apps/api di lingkungan mana pun yang
// memang sanggup menjalankannya — kerusakan yang tidak terlihat dari sini
// dan baru muncul jauh kemudian.
//
// Paket `argon2` adalah modul native. Di shared hosting tujuan ia SUDAH ada
// karena apps/api memakainya, tapi pnpm menyimpannya di pohon terisolasi
// yang tidak terjangkau oleh `require` biasa dari direktori ini. Karena itu
// pencariannya dicoba beberapa tempat sebelum menyerah — memasang ulang
// modul native di akun yang dibatasi memori adalah langkah yang paling
// pantas dihindari kalau salinannya memang sudah terpasang.
const path = require("node:path");
const fs = require("node:fs");

function candidateRoots() {
  const appRoot = path.resolve(__dirname, "../../..");
  const roots = [
    path.join(__dirname, "..", "node_modules"),
    path.join(appRoot, "apps", "api", "node_modules"),
    path.join(appRoot, "node_modules"),
  ];

  // Tata letak pnpm: node_modules/.pnpm/argon2@<versi>/node_modules/argon2.
  // Versinya tidak ditulis mati karena ia ikut berubah saat dependensi
  // apps/api diperbarui.
  const pnpmDir = path.join(appRoot, "node_modules", ".pnpm");
  if (fs.existsSync(pnpmDir)) {
    for (const entry of fs.readdirSync(pnpmDir)) {
      if (entry.startsWith("argon2@")) roots.push(path.join(pnpmDir, entry, "node_modules"));
    }
  }
  return roots;
}

function loadArgon2() {
  try {
    return require("argon2");
  } catch {
    // lanjut ke pencarian manual di bawah
  }
  for (const root of candidateRoots()) {
    const candidate = path.join(root, "argon2");
    if (!fs.existsSync(candidate)) continue;
    try {
      return require(candidate);
    } catch {
      // Salinan yang ada tapi tidak bisa dimuat (binari native tidak cocok
      // arsitektur) — coba kandidat berikutnya, jangan berhenti di sini.
    }
  }
  throw new Error(
    "Paket 'argon2' tidak ditemukan. Jalankan `npm install argon2 pg` di dalam apps/demo-api, " +
      "atau pastikan dependensi apps/api sudah terpasang di akun yang sama.",
  );
}

let argon2 = null;

async function verifyPassword(hash, plain) {
  if (!argon2) argon2 = loadArgon2();
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // argon2.verify() melempar untuk hash yang rusak/format asing, bukan
    // mengembalikan false. Untuk pemanggil, keduanya berarti hal yang sama.
    return false;
  }
}

async function hashPassword(plain) {
  if (!argon2) argon2 = loadArgon2();
  return argon2.hash(plain, { type: argon2.argon2id });
}

module.exports = { verifyPassword, hashPassword };
