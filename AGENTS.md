# Aturan kerja repo ini

- Bahasa antarmuka dan pesan commit: Indonesia.
- Setiap selesai satu iterasi: jalankan `npm run typecheck`, `npm run build`, lalu commit dan push ke `origin main`.
- Pesan commit singkat, satu baris, tanpa prefix panjang.
- Jangan commit `node_modules`, `dist`, `.chrome*`, `.shots*`, dan `.npm-cache`.
- Verifikasi klik memakai `node scripts/verify.mjs`. Skrip ini butuh server dev hidup dan Chrome dengan port debug 9333.
- Mesin ini memblokir binari rollup, jadi bundler memakai esbuild langsung lewat `scripts/`.
