# SOURCES.md — Sumber data & cara verifikasi

Repo ini menggabungkan 5 sumber. Tidak ada satu pun nilai gizi yang dikarang.

## 1. TKPI 2019 — Tabel Komposisi Pangan Indonesia (Kemenkes RI)

- **Sumber resmi (PDF):** https://perpustakaan.kemkes.go.id/inlislite3/uploaded_files/dokumen_isi/Monograf/Tabel%20Komposisi%20Pangan%20Indonesia.pdf
- **Tabel yang dibaca (mirror, 2026-11-08):** https://alatpertanian.asia/tabel-komposisi-pangan-indonesia-tkpi-2019/
- **Isi seed:** 70 makanan, per 100 g, dari 8 golongan:
  Serealia 30, Umbi 5, Kacang 11, Sayur 6, Daging 8, Ikan 4, Telur 5, Buah 1.
- **Cara verifikasi (dilakukan 2026-11-08):**
  - Setiap baris dibaca langsung dari tabel TKPI 2019 di atas, lengkap dengan
    kode TKPI (mis. `AP001` Nasi) dan kode sumber tabel (`KZGPI-1990` dst).
  - Setiap baris dicek konsistensinya: `kkal ≈ 4×protein + 4×karbohidrat + 9×lemak`.
    Baris yang gagal jauh dari rumus ini **dihapus, bukan diperbaiki dengan
    menebak** — contoh yang dibuang: Mi kering `AP022` (tertera 339 kkal,
    makronutriennya hanya ≈ 80 kkal) dan Bubur tinotuan `AP040`
    (tertera 156 kkal, makronutriennya hanya ≈ 73 kkal).
  - 4 baris sayuran rendah kalori (Bayam kukus/segar, Wortel rebus/kukus)
    menyimpang 15–18% dari rumus, tapi selisih absolutnya hanya 4–6 kkal
    (TKPI memakai faktor energi yang berbeda untuk serat) — dipertahankan
    sesuai angka yang tercetak di sumber.
- **Catatan konversi:**
  - Koma desimal Indonesia diubah ke titik desimal (mis. `56,7` → `56.7`).
  - Titik sebagai pemisah ribuan diubah ke angka biasa
    (mis. natrium Misoa `3.064` → `3064` mg; kalsium Usus ayam `1.407` → `1407` mg).
  - Tanda `-` di tabel berarti "tidak tercantum", disimpan sebagai `null`
    (bukan nol).
  - Kolom `sugar_g` bernilai `null` untuk SEMUA baris TKPI: tabel TKPI 2019
    tidak mempunyai kolom gula.
  - Beberapa kode sumber di mirror tertulis `KZGPI-l990` (huruf L kecil);
    itu salah ketik mirror untuk `KZGPI-1990`, sudah dinormalisasi.
  - `BDD` = Berat Dapat Dimakan (edible portion, %).
- **Yang belum ada:** 1.077 makanan TKPI lainnya. Ditambah bertahap, dengan
  verifikasi yang sama per baris.
- **Lisensi:** data pemerintah Indonesia (Kemenkes RI). Cantumkan sumber
  "Tabel Komposisi Pangan Indonesia (TKPI) 2019, Kementerian Kesehatan RI"
  di aplikasi.

## 2. USDA FoodData Central

- **Sumber:** https://fdc.nal.usda.gov/ — API: https://api.nal.usda.gov/fdc/v1/foods/search
- **Key gratis:** https://api.data.gov/signup/ (limit default 1.000 request/jam).
- **Dipakai untuk:** makanan umum / internasional yang tidak ada di TKPI.
- **Tidak dipakai untuk:** makanan Indonesia (itu tugas TKPI).
- **Lisensi:** CC0 — domain publik, tanpa atribusi wajib.
- **Catatan:** repo ini TIDAK menyimpan bulk data USDA. Lookup lewat API
  (`scripts/fetch_usda.js`, `scripts/lookup.js`), key dari environment saja.

## 3. Open Food Facts

- **Sumber:** https://world.openfoodfacts.org/ — API v2 (tanpa key).
- **Dipakai untuk:** produk kemasan / barcode (biskuit, susu UHT, minuman).
- **Tidak dipakai untuk:** masakan Indonesia — datanya label sukarelawan,
  kualitas bervariasi, dan tidak cocok untuk hidangan masak.
- **Lisensi:** ODbL (share-alike) — bila data disimpan / disebarluaskan,
  cantumkan sumber dan pakai lisensi yang sama.
- **Catatan:** repo ini TIDAK menyimpan bulk data Open Food Facts. Lookup
  lewat API (`scripts/fetch_openfoodfacts.js`).

## 4. free-exercise-db (latihan — seed utama)

- **Sumber:** https://github.com/yuhonas/free-exercise-db
- **Isi yang di-vendor:** `data/exercises/exercises.json` — **876 latihan**,
  dihitung 2026-11-08 dari file `dist/exercises.json` repo upstream
  (clone `--depth 1`, commit HEAD saat itu).
- **Lisensi:** Unlicense — domain publik, tanpa atribusi wajib.
  Salinan lisensi: `data/exercises/LICENSE.free-exercise-db.md`.
- **Gambar:** 1.746 JPEG (~197 MB) TIDAK di-commit. Unduh on-demand dengan
  `scripts/download_exercise_images.sh`.
- **Catatan:** semua nama latihan berbahasa Inggris; terjemahan Indonesia
  diisi bertahap di kolom `name_id`.

## 5. wger (latihan — fallback)

- **Sumber:** https://wger.de — kode: https://github.com/wger-project/wger
- **Dipakai untuk:** latihan yang tidak ada di seed `free-exercise-db`.
- **Lisensi data:** CC-BY-SA — **wajib atribusi** "Data © wger.de — CC-BY-SA".
  Kode wger berlisensi AGPL-3.0 (tidak dipakai di repo ini).
- **Catatan:** wger TIDAK di-vendor ke repo ini; dipakai lewat API publiknya.
