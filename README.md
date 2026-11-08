# darya-nutrition-db

Database gizi + latihan **hybrid** untuk aplikasi Darya Varia (menu **Catat Gizi**, PRD v1.1 Bab 8).
Dipakai oleh AI coding app Darya Varia (repo app: `ibobatsuga/darya`) dan Supabase.

> ⚠️ **Semua angka gizi di repo ini adalah ESTIMASI, bukan hasil analisis laboratorium.**
> Foto makanan tidak berisi nutrisi. Yang terjadi: Vision AI mengenali hidangan
> + menaksir porsi (gram), lalu angka gizinya diambil dari tabel per 100 g di sini.
> Aplikasi **wajib** menampilkan label "Estimasi" dan membiarkan user mengoreksi
> nama makanan maupun porsinya.

## Cara kerja (foto → nutrisi)

```
Foto makanan
  → Vision AI: kenali hidangan + taksir porsi (gram)
  → lookupFood(nama, gram)  — scripts/lookup.js
  → angka gizi per porsi, selalu is_estimate = true
```

## Urutan lookup (sudah dikonfirmasi)

| Prioritas | Sumber | Untuk apa | Lisensi |
| --- | --- | --- | --- |
| 1 | **TKPI 2019** (Kemenkes RI) — seed lokal di `data/` | Makanan Indonesia (nasi, tempe, soto, dll.) | Kemenkes RI |
| 2 | **USDA FoodData Central** — API | Makanan umum / internasional | CC0 (domain publik) |
| 3 | **Open Food Facts** — API | Produk kemasan / barcode | ODbL (share-alike) |

Aturan: TKPI dulu. USDA hanya bila tidak ada di TKPI. Open Food Facts hanya
untuk produk kemasan — **jangan** dipakai untuk masakan Indonesia.
Latihan: `free-exercise-db` sebagai seed utama, API **wger** sebagai fallback
(lihat "Latihan" di bawah).

## Isi repo

```
schema.sql                  Skema Supabase (foods, food_aliases, exercises, dishes)
data/
  tkpi_seed.json            70 makanan Indonesia dari TKPI 2019 (STARTER — bukan 1.147)
  tkpi_seed.csv             Sama, format CSV untuk COPY ke Supabase
  exercises/
    exercises.json          876 latihan (free-exercise-db, domain publik)
    LICENSE.free-exercise-db.md
scripts/
  lookup.js                 lookupFood(nama, gram) — TKPI lokal → USDA → (OFF via barcode)
  fetch_usda.js             Helper API USDA (perlu USDA_API_KEY dari environment)
  fetch_openfoodfacts.js    Helper API Open Food Facts (barcode / pencarian)
  download_exercise_images.sh  Unduh gambar latihan on-demand (tidak di-commit)
SOURCES.md                  Sumber tiap dataset + cara verifikasi
```

## Pakai cepat

```bash
# Lookup lokal (tanpa key, tanpa internet)
node scripts/lookup.js "Nasi" 200
node scripts/lookup.js "Tempe" 100

# Barcode produk kemasan
node scripts/lookup.js --barcode 8991234567890

# USDA (perlu key gratis dari https://api.data.gov/signup/)
USDA_API_KEY=xxx node scripts/fetch_usda.js "chicken breast" 5

# Open Food Facts
node scripts/fetch_openfoodfacts.js 8991234567890
```

Dari kode (Node / Supabase Edge Function):

```js
const { lookupFood } = require('./scripts/lookup.js');
const r = await lookupFood('Nasi', 200);
// r.perPortion.energy_kcal === 360  (180 kkal/100 g × 200 g)
// r.is_estimate === true, r.source === 'TKPI 2019'
```

## Seed ke Supabase

```sql
-- 1. Jalankan schema.sql di Supabase SQL Editor.
-- 2. Import CSV:
--    Supabase Dashboard → Table Editor → foods → Import → data/tkpi_seed.csv
--    (kolom sugar_g akan null untuk semua baris TKPI — memang tidak ada di TKPI)
-- 3. Latihan: import data/exercises/exercises.json lewat script seed / Edge Function.
```

## Latihan (exercise)

- **Seed utama:** `data/exercises/exercises.json` — 876 latihan dari
  [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db),
  lisensi **Unlicense (domain publik)**, tanpa atribusi.
  Tiap latihan: nama, `force`, `level`, `mechanic`, `equipment`,
  `primaryMuscles`, `instructions`, `images`.
- **Gambar TIDAK di-commit** (1.746 JPEG, ~197 MB). Unduh on-demand:
  `./scripts/download_exercise_images.sh --limit 50`
- **Fallback:** API wger ([wger-project/wger](https://github.com/wger-project/wger),
  data **CC-BY-SA — wajib atribusi** "Data © wger.de — CC-BY-SA").
  Dipakai bila ada latihan yang tidak ada di seed lokal.
- Semua sumber latihan di atas berbahasa Inggris. Terjemahan nama latihan ke
  Bahasa Indonesia diisi bertahap di kolom `name_id` (lihat `schema.sql`).
- Kalori yang terbakar dihitung dengan rumus MET
  (berat × durasi × MET) — free-exercise-db tidak punya data kalori.

## Yang BELUM ada di repo ini

- **Seluruh TKPI 2019 (1.147 makanan).** Seed ini baru 70 makanan paling umum,
  semuanya terverifikasi dari tabel TKPI 2019 (lihat `SOURCES.md`).
  Penambahan dilakukan bertahap, per baris terverifikasi — tidak dikarang.
- **Bulk data USDA / Open Food Facts.** Keduanya dipakai lewat API saat
  lookup, bukan di-copy massal ke repo.
- **Tabel log milik app** (`food_logs`, `weight_logs`, `exercise_logs`,
  `supplement_logs`) — itu ada di repo app `ibobatsuga/darya`, bukan di sini.

## Keamanan

- **Tidak ada secret di repo ini.** `USDA_API_KEY` hanya dibaca dari
  environment. Jangan pernah commit `.env`, API key, atau token.
- Jangan pakai CORS `*` dan jangan hardcode login / token seperti yang
  pernah terjadi di repo CalorAI — lihat PRD v1.1 Bab 16.
- RLS di `schema.sql`: katalog bisa dibaca publik, tulis hanya via
  service_role (server / Edge Function), bukan dari client.

## Lisensi

Lihat `SOURCES.md` untuk lisensi tiap sumber. Kode di repo ini (script +
skema) bebas dipakai untuk aplikasi Darya Varia. Data TKPI © Kemenkes RI,
data USDA CC0, data Open Food Facts ODbL, data latihan Unlicense,
data wger CC-BY-SA.
