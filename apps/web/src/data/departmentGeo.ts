import { STATIC_VOTE_OPTIONS } from './voteOptions';
import { getPartyColorByLabel } from '@/lib/partyColors';
import type { GeoJsonFeatureCollection } from '@/lib/map';

interface DepartmentGeo {
  center: [number, number]; // [lng, lat]
  zoom: number;
  /** Approximate bounding spread in degrees for simulated points */
  spread: [number, number]; // [lng spread, lat spread]
}

export const DEPARTMENT_GEO: Record<string, DepartmentGeo> = {
  amazonas: { center: [-78.0, -6.2], zoom: 7.5, spread: [0.8, 1.0] },
  ancash: { center: [-77.5, -9.5], zoom: 8.2, spread: [0.7, 1.0] },
  apurimac: { center: [-73.1, -14.0], zoom: 8, spread: [0.5, 0.5] },
  arequipa: { center: [-72.0, -15.8], zoom: 7, spread: [1.2, 1.0] },
  ayacucho: { center: [-74.0, -13.8], zoom: 7.5, spread: [0.8, 1.0] },
  cajamarca: { center: [-78.5, -7.2], zoom: 7.5, spread: [0.8, 0.8] },
  callao: { center: [-77.12, -12.05], zoom: 11, spread: [0.05, 0.05] },
  cusco: { center: [-72.0, -13.5], zoom: 7, spread: [1.2, 1.0] },
  huancavelica: { center: [-75.0, -12.8], zoom: 8, spread: [0.6, 0.7] },
  huanuco: { center: [-76.2, -9.9], zoom: 7.5, spread: [0.8, 0.8] },
  ica: { center: [-75.7, -14.1], zoom: 8, spread: [0.6, 0.8] },
  junin: { center: [-75.5, -11.5], zoom: 7.5, spread: [0.8, 0.8] },
  'la-libertad': { center: [-78.5, -8.1], zoom: 7.5, spread: [0.8, 0.8] },
  lambayeque: { center: [-79.8, -6.7], zoom: 8.5, spread: [0.4, 0.4] },
  lima: { center: [-76.6, -12.0], zoom: 7.5, spread: [0.8, 1.2] },
  loreto: { center: [-75.0, -4.0], zoom: 6, spread: [2.5, 2.5] },
  'madre-de-dios': { center: [-70.5, -12.0], zoom: 7, spread: [1.5, 1.0] },
  moquegua: { center: [-70.9, -17.0], zoom: 8.5, spread: [0.5, 0.5] },
  pasco: { center: [-76.2, -10.4], zoom: 8, spread: [0.5, 0.5] },
  piura: { center: [-80.3, -5.2], zoom: 7.5, spread: [0.8, 0.8] },
  puno: { center: [-70.0, -15.5], zoom: 7, spread: [1.0, 1.0] },
  'san-martin': { center: [-76.7, -7.2], zoom: 8.2, spread: [0.7, 1.0] },
  tacna: { center: [-70.2, -17.6], zoom: 8.5, spread: [0.4, 0.3] },
  tumbes: { center: [-80.4, -3.7], zoom: 9, spread: [0.3, 0.3] },
  ucayali: { center: [-74.5, -9.0], zoom: 6.5, spread: [1.5, 2.0] },
};

// Seeded random for deterministic output per department
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

const candidateOptions = STATIC_VOTE_OPTIONS.filter(
  (o) => o.type === 'candidate' && o.candidate,
);

export function generateDepartmentPoints(
  departmentId: string,
  count = 80,
): GeoJsonFeatureCollection {
  const geo = DEPARTMENT_GEO[departmentId];
  if (!geo) return { type: 'FeatureCollection', features: [] };

  const rand = seededRandom(hashString(departmentId));

  const features = Array.from({ length: count }, (_, i) => {
    const candidate =
      candidateOptions[Math.floor(rand() * candidateOptions.length)];
    const lng = geo.center[0] + (rand() - 0.5) * geo.spread[0] * 2;
    const lat = geo.center[1] + (rand() - 0.5) * geo.spread[1] * 2;

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [lng, lat] as [number, number],
      },
      properties: {
        id: `${departmentId}-${i}`,
        label: candidate.label,
        createdAt: new Date().toISOString(),
        partyColor: getPartyColorByLabel(candidate.label),
      },
    };
  });

  return { type: 'FeatureCollection', features };
}
