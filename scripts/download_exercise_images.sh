#!/usr/bin/env bash
# download_exercise_images.sh — unduh gambar latihan on-demand.
#
# Kenapa tidak ikut di-commit? Repo upstream free-exercise-db berisi
# 1.746 gambar JPEG (~197 MB). Itu terlalu besar untuk repo database ini.
# Yang di-commit hanya data/exercises/exercises.json (982 KB).
#
# Script ini mengunduh gambar yang dibutuhkan saja, berdasarkan nama file
# di kolom "images" pada exercises.json.
#
# Pakai:
#   ./scripts/download_exercise_images.sh              # unduh SEMUA gambar (~197 MB)
#   ./scripts/download_exercise_images.sh --limit 50   # unduh 50 gambar pertama saja
#   TARGET_DIR=./public/exercises ./scripts/download_exercise_images.sh
#
# Sumber gambar: https://github.com/yuhonas/free-exercise-db (Unlicense)
set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/yuhonas/free-exercise-db/master"
TARGET_DIR="${TARGET_DIR:-./data/exercises/images}"
LIMIT="${2:-0}"
[ "${1:-}" = "--limit" ] && LIMIT="${2:-0}"

mkdir -p "$TARGET_DIR"

echo "Mengunduh gambar latihan ke $TARGET_DIR ..."
node - "$TARGET_DIR" "$LIMIT" <<'NODE'
const fs = require('fs');
const path = require('path');
const [targetDir, limitArg] = process.argv.slice(2);
const limit = Number(limitArg) || 0;
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'exercises', 'exercises.json'), 'utf8'));
const list = Array.isArray(data) ? data : data.exercises;
const files = [...new Set(list.flatMap((e) => e.images || []))];
console.log(`Total gambar unik di katalog: ${files.length}`);
const todo = limit > 0 ? files.slice(0, limit) : files;
fs.writeFileSync('/tmp/exercise-images.txt', todo.join('\n'));
console.log(`Akan diunduh: ${todo.length} gambar`);
NODE

# Unduh dengan curl, 4 paralel, lewati yang sudah ada
xargs -a /tmp/exercise-images.txt -P 4 -I{} sh -c '
  f="{}"; dest="$0/$f"
  [ -f "$dest" ] || curl -fsSL -o "$dest" "https://raw.githubusercontent.com/yuhonas/free-exercise-db/master/exercises/$f" || echo "GAGAL: $f"
' "$TARGET_DIR"

echo "Selesai. Ukuran: $(du -sh "$TARGET_DIR" | cut -f1)"
