# Arsitektur Aplikasi JASPEL-KPI

Aplikasi ini menggunakan teknologi modern untuk memastikan performa yang cepat dan pengalaman pengguna yang luar biasa.

## Stack Teknologi
- **Framework**: Next.js 15 (App Router)
- **Bahasa**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Frontend**: React 19, TailwindCSS, Lucide Icons, Shadcn UI
- **Export Laporan**: jsPDF (PDF), SheetJS (Excel)

## Struktur Folder
- `app/`: Folder utama aplikasi (routing, layout, page).
  - `(authenticated)/`: Halaman-halaman yang membutuhkan login.
  - `api/`: Endpoint API server-side.
- `components/`: Komponen reusable UI.
  - `navigation/`: Sidebar dan komponen navigasi.
  - `dashboard/`: Komponen visualisasi data dashboard.
- `lib/`: Library dan servis.
  - `supabase/`: Konfigurasi client dan server Supabase.
  - `services/`: Logika bisnis (Settings, Dashboard, Auth).
- `public/`: Aset statis (Gambar, Ikon).

## Mekanisme Keamanan
- **Authentication**: Menggunakan Supabase Auth (JWT).
- **Authorization**: Role-Based Access Control (RBAC) diterapkan melalui Middleware dan RLS pada database.
- **Middleware**: Memvalidasi sesi dan hak akses rute secara efisien menggunakan caching peran di sisi server.
