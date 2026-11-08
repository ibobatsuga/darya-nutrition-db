/**
 * lookup.js — lookup gizi hybrid untuk app Darya Varia (Catat Gizi, PRD v1.1 Bab 8)
 *
 * Urutan lookup (sudah dikonfirmasi user, 2026-11-08):
 *   1. TKPI 2019 — seed lokal di ../data/tkpi_seed.json (makanan Indonesia)
 *   2. USDA FoodData Central — API, perlu USDA_API_KEY di environment
 *   3. Open Food Facts — API publik, tanpa key (khusus produk kemasan / barcode)
 *
 * Alur lengkap foto makanan:
 *   Foto -> Vision AI (kenali hidangan + taksir porsi dalam gram)
 *        -> lookupFood(nama, gram) di file ini
 *        -> angka gizi per porsi, SELALU dilabeli estimasi, bisa dikoreksi user.
 *
 * Pemakaian:
 *   node scripts/lookup.js "Nasi" 200          (200 gram)
 *   node scripts/lookup.js "Nasi"              (default 100 gram)
 *   node scripts/lookup.js --barcode 8991234567890
 *
 *   const { lookupFood } = require('./lookup.js');
 *   const r = await lookupFood('Tempe', 100);
 *
 * TIDAK ADA secret di file ini. USDA_API_KEY dibaca dari environment saja.
 * Node 18+ (fetch bawaan). Tanpa dependensi.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TKPI_PATH = path.join(__dirname, '..', 'data', 'tkpi_seed.json');

function loadTkpi() {
  const raw = JSON.parse(fs.readFileSync(TKPI_PATH, 'utf8'));
  return raw.foods || [];
}

const NUTRIENTS = [
  'energy_kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g',
  'sodium_mg', 'calcium_mg', 'iron_mg', 'vitamin_c_mg', 'water_g',
];

function scale(per100g, grams) {
  const out = {};
  for (const key of NUTRIENTS) {
    const v = per100g[key];
    out[key] = (v === null || v === undefined) ? null : round1((v * grams) / 100);
  }
  return out;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function normalise(s) {
  return String(s || '').toLowerCase().trim();
}

function findLocalTkpi(name, foods) {
  const q = normalise(name);
  // 1. cocok persis dengan nama
  let hit = foods.find((f) => normalise(f.name) === q);
  if (hit) return hit;
  // 2. cocok dengan alias (mis. "nasi putih" -> Nasi)
  hit = foods.find((f) => (f.aliases || []).some((a) => normalise(a) === q));
  if (hit) return hit;
  // 3. cocok sebagian (mis. "tempe" -> baris tempe pertama)
  hit = foods.find((f) => normalise(f.name).includes(q) || q.includes(normalise(f.name)));
  return hit || null;
}

// --- USDA FoodData Central -------------------------------------------------
// Endpoint: https://api.nal.usda.gov/fdc/v1/foods/search
// Gratis, domain publik (CC0). Key gratis dari https://api.data.gov/signup/
// Limit default key gratis: 1.000 request/jam. Key TIDAK BOLEH di-hardcode.
async function lookupUsda(name) {
  const key = process.env.USDA_API_KEY;
  if (!key) return { skipped: true, reason: 'USDA_API_KEY tidak diset di environment' };
  const url = 'https://api.nal.usda.gov/fdc/v1/foods/search?' + new URLSearchParams({
    api_key: key, query: name, pageSize: '1', dataType: 'SR Legacy,Foundation,Survey (FNDDS)',
  });
  const res = await fetch(url);
  if (!res.ok) return { skipped: true, reason: `USDA HTTP ${res.status}` };
  const data = await res.json();
  const food = (data.foods || [])[0];
  if (!food) return { found: false };
  const n = {};
  for (const nut of food.foodNutrients || []) {
    const nameNut = (nut.nutrientName || '').toLowerCase();
    if (nameNut.includes('energy')) n.energy_kcal = nut.value;
    if (nameNut === 'protein') n.protein_g = nut.value;
    if (nameNut.includes('carbohydrate')) n.carbs_g = nut.value;
    if (nameNut.includes('total lipid')) n.fat_g = nut.value;
    if (nameNut.includes('fiber')) n.fiber_g = nut.value;
    if (nameNut.includes('sugars')) n.sugar_g = nut.value;
    if (nameNut.includes('sodium')) n.sodium_mg = nut.value;
    if (nameNut.includes('calcium')) n.calcium_mg = nut.value;
    if (nameNut.includes('iron')) n.iron_mg = nut.value;
    if (nameNut.includes('vitamin c')) n.vitamin_c_mg = nut.value;
  }
  return {
    found: true, source: 'USDA FoodData Central', source_code: String(food.fdcId),
    source_license: 'CC0 (public domain)', name: food.description, per100g: n,
  };
}

// --- Open Food Facts -------------------------------------------------------
// Cocok untuk produk kemasan / barcode. Data label sukarelawan, kualitas
// bervariasi — JANGAN dipakai untuk masakan Indonesia (itu tugas TKPI).
async function lookupOpenFoodFacts(barcode) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'darya-nutrition-db/1.0' } });
  if (!res.ok) return { skipped: true, reason: `Open Food Facts HTTP ${res.status}` };
  const data = await res.json();
  if (!data.product) return { found: false };
  const p = data.product;
  const nutr = p.nutriments || {};
  return {
    found: true, source: 'Open Food Facts', source_code: barcode,
    source_license: 'ODbL (share-alike)', name: p.product_name || p.product_name_id || barcode,
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
      water_g: null,
    },
  };
}

// --- Lookup utama ----------------------------------------------------------
async function lookupFood(name, grams = 100) {
  const foods = loadTkpi();
  const local = findLocalTkpi(name, foods);
  if (local) {
    return {
      found: true, source: 'TKPI 2019', source_code: local.code,
      source_license: 'Kemenkes RI', name: local.name,
      grams, per100g: pickNutrients(local), perPortion: scale(local, grams),
      is_estimate: true, // SELALU true: taksiran porsi + nilai tabel, bukan analisis lab
    };
  }
  const usda = await lookupUsda(name);
  if (usda.found) {
    return {
      found: true, source: usda.source, source_code: usda.source_code,
      source_license: usda.source_license, name: usda.name,
      grams, per100g: usda.per100g, perPortion: scale(usda.per100g, grams),
      is_estimate: true,
    };
  }
  return {
    found: false, name, grams, is_estimate: true,
    reason: 'Tidak ditemukan di TKPI seed lokal' +
      (usda.skipped ? `; USDA dilewati (${usda.reason})` : '; tidak ditemukan di USDA') +
      '. Coba Open Food Facts untuk produk kemasan, atau tambahkan ke seed TKPI.',
  };
}

function pickNutrients(row) {
  const out = {};
  for (const key of NUTRIENTS) out[key] = row[key] ?? null;
  return out;
}

// --- CLI -------------------------------------------------------------------
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    if (args[0] === '--barcode' && args[1]) {
      console.log(JSON.stringify(await lookupOpenFoodFacts(args[1]), null, 2));
      return;
    }
    const [name, gramsArg] = args;
    if (!name) {
      console.error('Pakai: node scripts/lookup.js "Nasi" [gram]\n       node scripts/lookup.js --barcode 8991234567890');
      process.exit(1);
    }
    const result = await lookupFood(name, Number(gramsArg) || 100);
    console.log(JSON.stringify(result, null, 2));
  })().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { lookupFood, lookupUsda, lookupOpenFoodFacts, loadTkpi };
