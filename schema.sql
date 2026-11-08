-- ============================================================================
-- darya-nutrition-db — Skema Supabase (Postgres) untuk app Darya Varia
-- Menu: Catat Gizi (PRD v1.1 Bab 8)
-- Cara pakai: jalankan file ini di Supabase SQL Editor, atau
--   psql "$DATABASE_URL" -f schema.sql
-- Seed: data/tkpi_seed.csv (COPY) atau data/tkpi_seed.json (script seed).
-- ============================================================================

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- foods — satu baris per bahan makanan / hidangan, nilai per 100 g.
-- source: 'TKPI 2019' | 'USDA' | 'Open Food Facts' | 'manual'
-- ---------------------------------------------------------------------------
create table if not exists public.foods (
  id            uuid primary key default gen_random_uuid(),
  code          text,                                   -- kode TKPI (mis. AP001) atau FDC ID USDA
  name          text not null,                          -- nama Indonesia, mis. "Nasi"
  name_en       text,                                   -- nama Inggris (USDA / OFF)
  "group"       text,                                   -- Serealia, Umbi, Kacang, Sayur, Buah, Daging, Ikan, Telur, Susu, Lemak
  type          text,                                   -- Olahan | Tunggal (mentah)
  bdd_pct       numeric,                                -- Berat Dapat Dimakan (%), null bila tidak tercantum
  water_g       numeric,
  energy_kcal   numeric not null,
  protein_g     numeric,
  carbs_g       numeric,
  fat_g         numeric,
  fiber_g       numeric,
  sugar_g       numeric,                                -- null untuk semua baris TKPI: TKPI tidak punya kolom gula
  sodium_mg     numeric,
  calcium_mg    numeric,
  iron_mg       numeric,
  vitamin_c_mg  numeric,
  source        text not null default 'TKPI 2019',
  source_code   text,                                   -- FDC ID / barcode / kode sumber lain
  source_ref    text,                                   -- kode sumber TKPI (mis. KZGPI-1990)
  source_license text,
  is_estimate   boolean not null default true,          -- SEMUA nilai gizi di app ini adalah estimasi
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (source, code)
);

create index if not exists foods_name_trgm_idx
  on public.foods using gin (name gin_trgm_ops);
create index if not exists foods_group_idx on public.foods ("group");
create index if not exists foods_source_idx on public.foods (source);

-- ---------------------------------------------------------------------------
-- food_aliases — nama lain / nama sehari-hari, untuk pencarian.
-- Contoh: "nasi putih" -> Nasi (AP001), "tempe" -> Tempe kedelai murni, mentah (CP077)
-- ---------------------------------------------------------------------------
create table if not exists public.food_aliases (
  id        uuid primary key default gen_random_uuid(),
  food_id   uuid not null references public.foods (id) on delete cascade,
  alias     text not null,
  unique (alias, food_id)
);

create index if not exists food_aliases_alias_trgm_idx
  on public.food_aliases using gin (alias gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- exercises — katalog latihan (seed dari free-exercise-db, domain publik).
-- images TIDAK disimpan di database; hanya nama file, diunduh on-demand
-- via scripts/download_exercise_images.sh ke storage / CDN.
-- ---------------------------------------------------------------------------
create table if not exists public.exercises (
  id               text primary key,                     -- id free-exercise-db, mis. "3_4_Sit-Up"
  name             text not null,
  name_id          text,                                 -- terjemahan Indonesia (diisi bertahap)
  force            text,                                 -- push | pull | static
  level            text,                                 -- beginner | intermediate | expert
  mechanic         text,                                 -- compound | isolation
  equipment        text,                                 -- body only, dumbbell, barbell, ...
  primary_muscles  text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  instructions     text[] not null default '{}',
  category         text,                                 -- strength | stretching | ...
  images           text[] not null default '{}',         -- nama file gambar (bukan URL penuh)
  source           text not null default 'free-exercise-db',
  source_license   text not null default 'Unlicense (public domain)',
  created_at       timestamptz not null default now()
);

create index if not exists exercises_muscle_idx
  on public.exercises using gin (primary_muscles);
create index if not exists exercises_name_trgm_idx
  on public.exercises using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- dishes — hidangan yang dikenali Vision AI dari foto (1 hidangan = 1+ bahan).
-- Contoh: "Nasi Padang" -> Nasi 150 g + Ayam goreng 80 g + Sayur singkong 50 g.
-- Lookup gizi hidangan = jumlah (bahan × gram) dari tabel foods.
-- ---------------------------------------------------------------------------
create table if not exists public.dishes (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  components    jsonb not null default '[]'::jsonb,     -- [{food_id, grams}, ...]
  source        text not null default 'manual',
  is_estimate   boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS — baca publik (katalog), tulis hanya service role / admin.
-- food_logs / weight_logs / exercise_logs / supplement_logs ADA di PRD v1.1
-- Bab 8, bukan di repo ini: tabel itu milik app (ibobatsuga/darya),
-- bukan milik database katalog ini.
-- ---------------------------------------------------------------------------
alter table public.foods        enable row level security;
alter table public.food_aliases enable row level security;
alter table public.exercises    enable row level security;
alter table public.dishes       enable row level security;

create policy "foods: baca publik"
  on public.foods for select using (true);
create policy "food_aliases: baca publik"
  on public.food_aliases for select using (true);
create policy "exercises: baca publik"
  on public.exercises for select using (true);
create policy "dishes: baca publik"
  on public.dishes for select using (true);

-- Tulis (insert/update/delete) TIDAK dibuka untuk anon/authenticated.
-- Seed & update hanya lewat service_role key (server / Edge Function),
-- jangan pernah pakai service_role key di kode client / repo ini.
