import { useEffect, useRef, useState } from 'react';
import type { GeoJSONSource } from 'maplibre-gl';
import { useMap } from '@/components/ui/map';

const LABELS_SOURCE = 'province-label-centroids';
const LABELS_LAYER = 'province-label-symbols';

/** Map from app department IDs to FIRST_NOMB values in peru-provincias.geojson */
const ID_TO_FIRST_NOMB: Record<string, string> = {
  amazonas: 'AMAZONAS',
  ancash: 'ANCASH',
  apurimac: 'APURIMAC',
  arequipa: 'AREQUIPA',
  ayacucho: 'AYACUCHO',
  cajamarca: 'CAJAMARCA',
  callao: 'CALLAO',
  cusco: 'CUSCO',
  huancavelica: 'HUANCAVELICA',
  huanuco: 'HUANUCO',
  ica: 'ICA',
  junin: 'JUNIN',
  'la-libertad': 'LA LIBERTAD',
  lambayeque: 'LAMBAYEQUE',
  lima: 'LIMA',
  loreto: 'LORETO',
  'madre-de-dios': 'MADRE DE DIOS',
  moquegua: 'MOQUEGUA',
  pasco: 'PASCO',
  piura: 'PIURA',
  puno: 'PUNO',
  'san-martin': 'SAN MARTIN',
  tacna: 'TACNA',
  tumbes: 'TUMBES',
  ucayali: 'UCAYALI',
};

/**
 * Compute the centroid of a polygon from its coordinates.
 * Uses the signed-area weighted centroid formula for accuracy
 * (handles irregular shapes better than a simple average).
 *
 * Falls back to bounding-box center if the area is zero (degenerate polygon).
 */
function polygonCentroid(ring: number[][]): [number, number] {
  let area = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0, len = ring.length - 1; i < len; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  area *= 0.5;

  if (Math.abs(area) < 1e-10) {
    // Degenerate polygon — use bounding box center
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return [(minX + maxX) / 2, (minY + maxY) / 2];
  }

  const factor = 1 / (6 * area);
  return [cx * factor, cy * factor];
}

/**
 * Extracts the centroid from a GeoJSON Polygon or MultiPolygon geometry.
 * For MultiPolygon, picks the ring with the largest area.
 */
function featureCentroid(geometry: GeoJSON.Geometry): [number, number] {
  if (geometry.type === 'Polygon') {
    return polygonCentroid(geometry.coordinates[0]);
  }

  if (geometry.type === 'MultiPolygon') {
    // Pick the largest polygon by absolute area
    let bestRing: number[][] = geometry.coordinates[0][0];
    let bestArea = 0;

    for (const polygon of geometry.coordinates) {
      const ring = polygon[0];
      let area = 0;
      for (let i = 0, len = ring.length - 1; i < len; i++) {
        area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
      }
      const absArea = Math.abs(area);
      if (absArea > bestArea) {
        bestArea = absArea;
        bestRing = ring;
      }
    }

    return polygonCentroid(bestRing);
  }

  // Fallback for unexpected geometry types
  return [0, 0];
}

interface ProvinceLabelsLayerProps {
  /** Show/hide the labels layer */
  active: boolean;
  /** Department ID to filter provinces by (e.g. "ancash") */
  departmentId: string | null;
}

/**
 * ProvinceLabelsLayer
 *
 * Renders province names as a MapLibre symbol layer using centroids
 * computed from the peru-provincias.geojson features.
 *
 * Key benefits over DOM markers:
 * - Names come from the GeoJSON itself (NOMBPROV property), not hardcoded
 * - GPU-rendered (WebGL) — much better performance
 * - Automatic collision detection — overlapping labels get hidden
 * - Guaranteed to render ABOVE fill/outline layers by insertion order
 */
export function ProvinceLabelsLayer({
  active,
  departmentId,
}: ProvinceLabelsLayerProps) {
  const { map, isLoaded } = useMap();
  const sourceAdded = useRef(false);
  const [geojsonData, setGeojsonData] =
    useState<GeoJSON.FeatureCollection | null>(null);

  // Fetch the GeoJSON once
  useEffect(() => {
    fetch('/peru-provincias.geojson')
      .then((res) => res.json())
      .then((data: GeoJSON.FeatureCollection) => setGeojsonData(data))
      .catch(console.error);
  }, []);

  // Initialize empty source + layer once
  useEffect(() => {
    if (!map || !isLoaded || sourceAdded.current) return;
    if (map.getSource(LABELS_SOURCE)) {
      sourceAdded.current = true;
      return;
    }

    map.addSource(LABELS_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: LABELS_LAYER,
      type: 'symbol',
      source: LABELS_SOURCE,
      layout: {
        'text-field': ['get', 'NOMBPROV'],
        'text-font': ['Open Sans Semibold'],
        'text-size': 11,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.08,
        'text-max-width': 8,
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'text-padding': 4,
        visibility: 'none',
      },
      paint: {
        'text-color': '#0f172a',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
        'text-halo-blur': 0.5,
      },
    });

    sourceAdded.current = true;
  }, [map, isLoaded]);

  // Update source data + visibility when department or data changes
  useEffect(() => {
    if (!map || !isLoaded || !sourceAdded.current || !geojsonData) return;
    if (!map.getLayer(LABELS_LAYER)) return;

    const nombDep = departmentId
      ? (ID_TO_FIRST_NOMB[departmentId] ?? '')
      : '';

    // Filter features for this department and compute centroids
    const centroidFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];

    if (active && nombDep) {
      for (const feature of geojsonData.features) {
        const props = feature.properties as Record<string, unknown>;
        if (props?.FIRST_NOMB !== nombDep) continue;

        const center = featureCentroid(feature.geometry);
        centroidFeatures.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: center },
          properties: { NOMBPROV: props.NOMBPROV as string },
        });
      }
    }

    const source = map.getSource(LABELS_SOURCE) as GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: centroidFeatures,
      });
    }

    const vis = active && centroidFeatures.length > 0 ? 'visible' : 'none';
    map.setLayoutProperty(LABELS_LAYER, 'visibility', vis);
  }, [map, isLoaded, active, departmentId, geojsonData]);

  return null;
}
