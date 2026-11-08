/**
 * fetch_usda.js — ambil makanan dari USDA FoodData Central (fallback #2).
 *
 * Gratis, domain publik (CC0). Key gratis: https://api.data.gov/signup/
 * Limit key gratis default: 1.000 request/jam.
 *
 *   USDA_API_KEY=xxx node scripts/fetch_usda.js "chicken breast" 5
 *
 * Output: JSON per 100 g (atau null bila nutrisi tidak tersedia).
 * Key HANYA dari environment — jangan pernah tulis key di file / repo.
 * Node 18+ (fetch bawaan). Tanpa dependensi.
 */
'use strict';

const API = 'https://api.nal.usda.gov/fdc/v1/foods/search';

async function searchUsda(query, pageSize = 5) {
  const key = process.env.USDA_API_KEY;
  if (!key) throw new Error('USDA_API_KEY tidak diset. Daftar key gratis di https://api.data.gov/signup/');
  const url = API + '?' + new URLSearchParams({
    api_key: key, query, pageSize: String(pageSize),
    dataType: 'SR Legacy,Foundation,Survey (FNDDS)',
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USDA HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.foods || []).map((food) => {
    const n = {};
    for (const nut of food.foodNutrients || []) {
      const name = (nut.nutrientName || '').toLowerCase();
      if (name.includes('energy')) n.energy_kcal = nut.value;
      if (name === 'protein') n.protein_g = nut.value;
      if (name.includes('carbohydrate')) n.carbs_g = nut.value;
      if (name.includes('total lipid')) n.fat_g = nut.value;
      if (name.includes('fiber')) n.fiber_g = nut.value;
      if (name.includes('sugars')) n.sugar_g = nut.value;
      if (name.includes('sodium')) n.sodium_mg = nut.value;
      if (name.includes('calcium')) n.calcium_mg = nut.value;
      if (name.includes('iron')) n.iron_mg = nut.value;
      if (name.includes('vitamin c')) n.vitamin_c_mg = nut.value;
    }
    return {
      name: food.description, fdcId: food.fdcId, dataType: food.dataType,
      source: 'USDA FoodData Central', source_license: 'CC0 (public domain)',
      per100g: n,
    };
  });
}

if (require.main === module) {
  (async () => {
    const [query, size] = process.argv.slice(2);
    if (!query) {
      console.error('Pakai: USDA_API_KEY=xxx node scripts/fetch_usda.js "chicken breast" [jumlah]');
      process.exit(1);
    }
    console.log(JSON.stringify(await searchUsda(query, Number(size) || 5), null, 2));
  })().catch((err) => { console.error(err.message); process.exit(1); });
}

module.exports = { searchUsda };
