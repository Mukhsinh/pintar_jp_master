# Panduan Deployment ke Vercel

Sistem JASPEL-KPI dioptimalkan untuk berjalan di platform Vercel.

## Persiapan
1. Pastikan Anda memiliki akun Vercel yang terhubung ke repositori GitHub.
2. Pastikan variabel lingkungan (Environment Variables) telah diatur di Dashboard Vercel.

## Variabel Lingkungan
Variabel yang wajib diatur:
- `NEXT_PUBLIC_SUPABASE_URL`: URL proyek Supabase Anda.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon key untuk akses frontend.
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key untuk operasi administratif server-side.

## Langkah Deployment
1. Hubungkan repositori GitHub ke Vercel.
2. Pilih framework preset: **Next.js**.
3. Masukkan Root Directory: `./`.
4. Tambahkan Environment Variables.
5. Klik **Deploy**.

## Optimasi Build
Aplikasi ini menggunakan skrip optimasi build khusus. Gunakan perintah berikut jika diperlukan secara manual:
```bash
npm run build
```
Vercel akan menjalankan perintah ini secara otomatis setiap kali ada push ke branch utama.
