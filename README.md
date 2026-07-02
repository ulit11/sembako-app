# SembakoApp 🛒

Sistem Manajemen Stok & Kasir untuk Toko Sembako berbasis mobile-first.

## Fitur
- 📦 Manajemen Stok Barang (Barcode Scanner via Kamera HP)
- 🏪 Kasir POS Mobile (Tunai, QRIS, Bon/Utang)
- 📊 Laporan Penjualan & Laba Rugi Real-time
- 👥 Multi-user dengan Hak Akses (Owner & Kasir)

## Tech Stack
- **Frontend**: Quasar (Vue 3)
- **Backend**: Node.js + Express.js
- **Database**: MySQL (Prisma ORM)
- **Auth**: JWT

## Setup Lokal

### Backend
```bash
cd backend
npm install
cp .env.example .env   # isi DATABASE_URL dan JWT_SECRET
npx prisma db push
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # atau: npx quasar dev
```
