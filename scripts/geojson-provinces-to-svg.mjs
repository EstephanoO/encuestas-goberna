/**
 * Converts peru-provincias.geojson into a TypeScript data file
 * with SVG path strings for provinces, grouped by department.
 * Each department gets its own bounding box so the SVG shows ONLY that department.
 *
 * Usage: node scripts/geojson-provinces-to-svg.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const geoPath = resolve(__dirname, '../apps/web/public/peru-provincias.geojson');
const outPath = resolve(__dirname, '../apps/web/src/data/provincePaths.ts');

const geojson = JSON.parse(readFileSync(geoPath, 'utf-8'));

const SVG_SIZE = 400; // square viewBox
const PADDING = 20;

/** Simplify coordinates using Ramer–Douglas–Peucker */
function simplify(coords, tolerance) {
  if (coords.length <= 2) return coords;
  let maxDist = 0;
  let maxIdx = 0;
  const first = coords[0];
  const last = coords[coords.length - 1];
  for (let i = 1; i < coords.length - 1; i++) {
    const dist = pointLineDistance(coords[i], first, last);
    if (dist > maxDist) { maxDist = dist; maxIdx = i; }
  }
  if (maxDist > tolerance) {
    const left = simplify(coords.slice(0, maxIdx + 1), tolerance);
    const right = simplify(coords.slice(maxIdx), tolerance);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

function pointLineDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

// Group features by department
const deptFeatures = new Map();
for (const f of geojson.features) {
  const dept = f.properties.FIRST_NOMB;
  if (!deptFeatures.has(dept)) deptFeatures.set(dept, []);
  deptFeatures.get(dept).push(f);
}

// For each department, compute bounding box and generate paths
const departments = [];

for (const [deptName, features] of deptFeatures) {
  // Compute bounding box of all provinces in this department
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const f of features) {
    const coords = f.geometry.type === 'MultiPolygon'
      ? f.geometry.coordinates.flat(1)
      : f.geometry.coordinates;
    for (const ring of coords) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }

  // Add some padding
  const lngRange = maxLng - minLng;
  const latRange = maxLat - minLat;
  const padLng = lngRange * 0.05;
  const padLat = latRange * 0.05;
  minLng -= padLng; maxLng += padLng;
  minLat -= padLat; maxLat += padLat;

  // Maintain aspect ratio
  const finalLngRange = maxLng - minLng;
  const finalLatRange = maxLat - minLat;
  const usableSize = SVG_SIZE - PADDING * 2;

  let scaleX, scaleY, scale, offsetX, offsetY;
  scaleX = usableSize / finalLngRange;
  scaleY = usableSize / finalLatRange;
  scale = Math.min(scaleX, scaleY);
  offsetX = PADDING + (usableSize - finalLngRange * scale) / 2;
  offsetY = PADDING + (usableSize - finalLatRange * scale) / 2;

  function project(lng, lat) {
    const x = offsetX + (lng - minLng) * scale;
    const y = offsetY + (maxLat - lat) * scale; // flip Y
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  }

  function ringToPath(ring) {
    const projected = ring.map(([lng, lat]) => project(lng, lat));
    const simplified = simplify(projected, 0.35);
    if (simplified.length < 3) return '';
    return 'M' + simplified.map(([x, y]) => `${x},${y}`).join('L') + 'Z';
  }

  const provinces = [];
  for (const f of features) {
    const geom = f.geometry;
    let pathD;
    if (geom.type === 'Polygon') {
      pathD = geom.coordinates.map(ringToPath).filter(Boolean).join('');
    } else if (geom.type === 'MultiPolygon') {
      pathD = geom.coordinates.flatMap(p => p.map(ringToPath)).filter(Boolean).join('');
    } else {
      continue;
    }

    // Centroid for label
    const ring = geom.type === 'MultiPolygon'
      ? geom.coordinates.reduce((a, b) => a[0].length > b[0].length ? a : b)[0]
      : geom.coordinates[0];
    let cx = 0, cy = 0;
    for (const [lng, lat] of ring) {
      const [x, y] = project(lng, lat);
      cx += x; cy += y;
    }
    cx = Math.round((cx / ring.length) * 10) / 10;
    cy = Math.round((cy / ring.length) * 10) / 10;

    provinces.push({
      nombprov: f.properties.NOMBPROV,
      d: pathD,
      cx,
      cy,
    });
  }

  departments.push({ nombdep: deptName, provinces });
}

// Generate TypeScript
let ts = `/**
 * Auto-generated SVG paths for Peru provinces, grouped by department.
 * Each department has its own coordinate space fitting a ${SVG_SIZE}x${SVG_SIZE} viewBox.
 * Generated from peru-provincias.geojson via scripts/geojson-provinces-to-svg.mjs
 */

export interface ProvincePath {
  /** Province name (matches NOMBPROV in GeoJSON / ProvinceResult.province) */
  nombprov: string;
  /** SVG path data */
  d: string;
  /** Label centroid X */
  cx: number;
  /** Label centroid Y */
  cy: number;
}

export const PROVINCE_SVG_SIZE = ${SVG_SIZE};

/** Province SVG paths indexed by department NOMBDEP */
export const PROVINCE_PATHS: Record<string, ProvincePath[]> = {\n`;

for (const dept of departments) {
  ts += `  '${dept.nombdep}': [\n`;
  for (const p of dept.provinces) {
    ts += `    { nombprov: '${p.nombprov}', d: '${p.d}', cx: ${p.cx}, cy: ${p.cy} },\n`;
  }
  ts += `  ],\n`;
}

ts += `};\n`;

writeFileSync(outPath, ts, 'utf-8');

const totalProvinces = departments.reduce((s, d) => s + d.provinces.length, 0);
console.log(`✅ Wrote ${totalProvinces} provinces across ${departments.length} departments to ${outPath}`);
