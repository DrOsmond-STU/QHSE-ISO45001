/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Diperlukan untuk Dockerfile pola turbo-prune (task 0.4) — bundle
  // minimal tanpa perlu copy seluruh node_modules ke image.
  output: "standalone",
};

module.exports = nextConfig;
