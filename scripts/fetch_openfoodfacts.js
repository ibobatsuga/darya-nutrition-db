/**
 * fetch_openfoodfacts.js — ambil produk kemasan dari Open Food Facts (fallback #3).
 *
 * Gratis, tanpa key. Lisensi data: ODbL (share-alike) — bila data ini
 * disimpan / disebarluaskan, cantumkan sumber dan lisensi yang sama.
 *
 * Cocok untuk: produk kemasan / barcode (mis. biskuit, susu UHT, minuman).
 * TIDAK cocok untuk: masakan Indonesia (nasi padang, soto, gado-gado) —
 * itu tugas TKPI 2019, bukan Open Food Facts.
 *
 *   node scripts/fetch_openfoodfacts.js 8991234567890
 *   node scripts/fetch_openfoodfacts.js --search "susu coklat"
 *
 * Node 18+ (fetch bawaan). Tanpa dependensi.
 */
'use strict';

const BASE = 'https://world.openfoodfacts.org';

async function byBarcode(barcode) {
  const res = await fetch(`${BASE}/api/v2/product/${encodeURIComponent(barcode)}.json`, {
    headers: { 'User-Agent': 'darya-nutrition-db/1.0' },
  });
  if (!res.ok) throw new Error(`Open Food Facts HTTP ${res.status}`);
  const data = await res.json();
  if (!data.product) return null;
  return toFood(data.product, barcode);
}

async function search(query, pageSize = 5) {
  const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${pageSize}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'darya-nutrition-db/1.0' } });
  if (!res.ok) throw new Error(`Open Food Facts HTTP ${res.status}`);
  const data = await res.json();
  return (data.products || []).map((p) => toFood(p, p.code));
}

function toFood(p, code) {
  const nutr = p.nutriments || {};
  return {
    name: p.product_name || p.product_name_id || code,
    barcode: code,
    brands: p.brands || null,
    source: 'Open Food Facts',
    source_license: 'ODbL (share-alike)',
    per100g: {
      energy_kcal: nutr['energy-kcal_100g'] ?? null,
      protein_g: nutr.proteins_100g ?? null,
      carbs_g: nutr.carbohydrates_100g ?? null,
      fat_g: nutr.fat_100g ?? null,
      fiber_g: nutr.fiber_100g ?? null,
      sugar_g: nutr.sugars_100g ?? null,
      sodium_mg: nutr.sodium_100g != null ? nutr.sodium_100g * 1000 : null,
      calcium_mg: nutr.calcium_100g ?? null,
      iron_mg: nutr.iron_100g ?? null,
      vitamin_c_mg: nutr['vitamin-c_100g'] ?? null,
    },
  };
}

if (require.main === module) {
  (async () => {
    const [arg, value] = process.argv.slice(2);
    if (!arg) {
      console.error('Pakai: node scripts/fetch_openfoodfacts.js 8991234567890\n       node scripts/fetch_openfoodfacts.js --search "susu coklat"');
      process.exit(1);
    }
    const out = arg === '--search' ? await search(value) : await byBarcode(arg);
    console.log(JSON.stringify(out, null, 2));
  })().catch((err) => { console.error(err.message); process.exit(1); });
}

module.exports = { byBarcode, search };
