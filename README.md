# 🚀 Panduan Hosting di Vercel (AI Detector)

Aplikasi ini menggunakan **Next.js 14 (App Router)** yang merupakan framework resmi buatan tim Vercel, sehingga proses hosting di **[vercel.com](https://vercel.com)** berjalan secara otomatis (*zero-configuration*).

---

## Langkah-langkah Deploy ke Vercel

### Opsi A: Menggunakan GitHub / GitLab (Paling Direkomendasikan)
1. Buat repository baru di GitHub (misalnya: `tools-deteksi-ai`).
2. Masukkan (push) kode proyek ini ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: initial ai detector with openrouter"
   git branch -M main
   git remote add origin https://github.com/USERNAME-ANDA/tools-deteksi-ai.git
   git push -u origin main
   ```
3. Buka **[vercel.com](https://vercel.com)** dan login.
4. Klik tombol **"Add New..."** lalu pilih **"Project"**.
5. Pilih repository GitHub yang baru saja Anda buat, lalu klik **"Import"**.
6. Pada bagian **Environment Variables**, tambahkan:
   - **Key**: `OPENROUTER_API_KEY`
   - **Value**: `your_openrouter_api_key` (Masukkan API key OpenRouter Anda)
   - *(Opsional)* **Key**: `OPENROUTER_MODEL` | **Value**: `inclusionai/ling-3.0-flash-vl:free`
7. Klik tombol **"Deploy"**.
8. Tunggu sekitar 1 menit hingga proses build selesai. Domain gratis dari Vercel (misalnya: `https://tools-deteksi-ai.vercel.app`) siap digunakan!

---

### Opsi B: Menggunakan Vercel CLI
1. Buka terminal di folder project ini:
   ```bash
   cmd.exe /c "npx vercel"
   ```
2. Ikuti instruksi login dan pemilihan project.
3. Tambahkan environment variable melalui command line:
   ```bash
   cmd.exe /c "npx vercel env add OPENROUTER_API_KEY"
   ```
4. Deploy ke versi production:
   ```bash
   cmd.exe /c "npx vercel --prod"
   ```

---

## Keamanan API Key
API Key OpenRouter diproses di sisi server (`app/api/detect/route.js`), sehingga pengunjung web tidak akan dapat melihat atau mencuri API key Anda melalui inspect element/network tab browser.
