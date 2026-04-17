/**
 * Cleans up peru-distritos.geojson:
 * - Drops features with null ubigeo (22 unmatched fragments/islands)
 * - Resolves duplicate ubigeo by merging polygons into MultiPolygon
 * - Normalizes dept names to canonical uppercase without accents
 *   (ANCASH, APURIMAC, HUANUCO, JUNIN, SAN MARTIN)
 *
 * Input:  apps/web/public/peru-distritos.geojson
 * Output: same path (overwrites)
 *
 * Usage: node scripts/cleanup-peru-distritos.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inPath = resolve(__dirname, '../apps/web/public/peru-distritos.geojson');

const DEPT_NORMALIZE = {
  'ÁNCASH': 'ANCASH',
  'APURÍMAC': 'APURIMAC',
  'HUÁNUCO': 'HUANUCO',
  'JUNÍN': 'JUNIN',
  'SAN MARTÍN': 'SAN MARTIN',
};

const geo = JSON.parse(readFileSync(inPath, 'utf-8'));
const before = geo.features.length;

// Drop null-ubigeo features
const withUbigeo = geo.features.filter(f => f.properties.ubigeo != null);
const dropped = before - withUbigeo.length;

// Merge duplicates into MultiPolygon
const byUbigeo = new Map();
for (const f of withUbigeo) {
  const u = f.properties.ubigeo;
  if (!byUbigeo.has(u)) {
    byUbigeo.set(u, f);
  } else {
    const existing = byUbigeo.get(u);
    const ea = existing.geometry;
    const fa = f.geometry;
    const polys = [];
    if (ea.type === 'Polygon') polys.push(ea.coordinates);
    else if (ea.type === 'MultiPolygon') polys.push(...ea.coordinates);
    if (fa.type === 'Polygon') polys.push(fa.coordinates);
    else if (fa.type === 'MultiPolygon') polys.push(...fa.coordinates);
    existing.geometry = { type: 'MultiPolygon', coordinates: polys };
  }
}

const merged = [...byUbigeo.values()];
const duplicatesResolved = withUbigeo.length - merged.length;

// Normalize dept names and ensure dist field has a value
for (const f of merged) {
  const p = f.properties;
  if (p.dept && DEPT_NORMALIZE[p.dept]) p.dept = DEPT_NORMALIZE[p.dept];
  if (!p.dist) p.dist = p.prov || p.ubigeo;
}

geo.features = merged;

// Basic stats
const depts = new Set(merged.map(f => f.properties.dept));
const ubigeoLens = new Set(merged.map(f => String(f.properties.ubigeo).length));

// Write back (compact — no pretty print to save bytes)
writeFileSync(inPath, JSON.stringify(geo), 'utf-8');

console.log('✅ Cleanup complete');
console.log(`   Features in:     ${before}`);
console.log(`   Null dropped:    ${dropped}`);
console.log(`   Dup merged:      ${duplicatesResolved}`);
console.log(`   Features out:    ${merged.length}`);
console.log(`   Unique depts:    ${depts.size} (${[...depts].sort().join(', ')})`);
console.log(`   Ubigeo lengths:  ${[...ubigeoLens]}`);
