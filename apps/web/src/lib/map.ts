import type { MapPoint } from '@encuesta/shared-types';
import { getPartyColorByLabel } from './partyColors';

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { id: string; label: string; createdAt: string; partyColor: string };
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export function pointsToGeoJson(
  points: MapPoint[],
): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [p.longitude, p.latitude], // GeoJSON: lng first
      },
      properties: {
        id: p.id,
        label: p.label,
        createdAt: p.createdAt,
        partyColor: getPartyColorByLabel(p.label),
      },
    })),
  };
}
