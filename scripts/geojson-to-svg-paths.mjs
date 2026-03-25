/**
 * Converts peru-departamentos.geojson into a TypeScript data file
 * with simplified SVG path strings for each department.
 *
 * Usage: node scripts/geojson-to-svg-paths.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const geoPath = resolve(__dirname, '../apps/web/public/peru-departamentos.geojson');
const outPath = resolve(__dirname, '../apps/web/src/data/peruDepartmentPaths.ts');

const geojson = JSON.parse(readFileSync(geoPath, 'utf-8'));

// Peru bounding box (approximate)
const BOUNDS = { minLng: -81.4, maxLng: -68.5, minLat: -18.4, maxLat: -0.02 };
const SVG_WIDTH = 400;
const SVG_HEIGHT = 580;

function project(lng, lat) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * SVG_WIDTH;
  // Flip Y — SVG y grows downward, lat grows upward
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * SVG_HEIGHT;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

/** Simplify coordinates using Ramer–Douglas–Peucker */
function simplify(coords, tolerance) {
  if (coords.length <= 2) return coords;

  let maxDist = 0;
  let maxIdx = 0;
  const first = coords[0];
  const last = coords[coords.length - 1];

  for (let i = 1; i < coords.length - 1; i++) {
    const dist = pointLineDistance(coords[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
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

function ringToPath(ring) {
  const projected = ring.map(([lng, lat]) => project(lng, lat));
  const simplified = simplify(projected, 1.2);
  if (simplified.length < 3) return '';
  return 'M' + simplified.map(([x, y]) => `${x},${y}`).join('L') + 'Z';
}

function geometryToPath(geometry) {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map(ringToPath).filter(Boolean).join('');
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates
      .flatMap((polygon) => polygon.map(ringToPath))
      .filter(Boolean)
      .join('');
  }
  return '';
}

/** Calculate centroid of a polygon ring for label placement */
function ringCentroid(ring) {
  let cx = 0, cy = 0;
  for (const [lng, lat] of ring) {
    const [x, y] = project(lng, lat);
    cx += x;
    cy += y;
  }
  return [Math.round((cx / ring.length) * 10) / 10, Math.round((cy / ring.length) * 10) / 10];
}

function featureCentroid(geometry) {
  if (geometry.type === 'Polygon') {
    return ringCentroid(geometry.coordinates[0]);
  }
  if (geometry.type === 'MultiPolygon') {
    // Use the largest polygon
    let maxLen = 0;
    let best = geometry.coordinates[0][0];
    for (const poly of geometry.coordinates) {
      if (poly[0].length > maxLen) {
        maxLen = poly[0].length;
        best = poly[0];
      }
    }
    return ringCentroid(best);
  }
  return [0, 0];
}

const entries = [];

for (const feature of geojson.features) {
  const nombdep = feature.properties.NOMBDEP;
  const path = geometryToPath(feature.geometry);
  const [cx, cy] = featureCentroid(feature.geometry);

  entries.push({ nombdep, path, cx, cy });
}

// Generate TypeScript
let ts = `/**
 * Auto-generated SVG paths for Peru departments.
 * Generated from peru-departamentos.geojson via scripts/geojson-to-svg-paths.mjs
 *
 * viewBox: 0 0 ${SVG_WIDTH} ${SVG_HEIGHT}
 */

export interface DepartmentPath {
  /** NOMBDEP value from GeoJSON (e.g. "SAN MARTIN") */
  nombdep: string;
  /** SVG path data string */
  d: string;
  /** Label centroid X */
  cx: number;
  /** Label centroid Y */
  cy: number;
}

export const PERU_SVG_WIDTH = ${SVG_WIDTH};
export const PERU_SVG_HEIGHT = ${SVG_HEIGHT};

export const DEPARTMENT_PATHS: DepartmentPath[] = [\n`;

for (const entry of entries) {
  ts += `  {\n`;
  ts += `    nombdep: '${entry.nombdep}',\n`;
  ts += `    d: '${entry.path}',\n`;
  ts += `    cx: ${entry.cx},\n`;
  ts += `    cy: ${entry.cy},\n`;
  ts += `  },\n`;
}

ts += `];\n`;

writeFileSync(outPath, ts, 'utf-8');
console.log(`✅ Wrote ${entries.length} department paths to ${outPath}`);
console.log(`   viewBox: 0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`);
