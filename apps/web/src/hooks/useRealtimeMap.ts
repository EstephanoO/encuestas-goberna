import { useMemo } from 'react';
import { pointsToGeoJson } from '@/lib/map';
import type { MapPoint } from '@encuesta/shared-types';

export function useRealtimeMap(mapPoints: MapPoint[]) {
  const geoJson = useMemo(
    () => (mapPoints.length > 0 ? pointsToGeoJson(mapPoints) : null),
    [mapPoints],
  );

  return { geoJson };
}
