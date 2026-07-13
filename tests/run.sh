#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
node --check app.js
node --check backend.js
node --check sw.js
tsc --noEmit --target ES2022 --module ESNext --lib ES2022,DOM tests/deno-shim.d.ts supabase/functions/delete-account/index.ts
python3 tests/static-smoke.py
node tests/backend-smoke.mjs
