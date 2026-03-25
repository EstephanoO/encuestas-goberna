import { useState } from 'react';
import { useRealtimeMap } from '@/hooks/useRealtimeMap';
import { PERU_CENTER, PERU_ZOOM } from '@/lib/constants';
import { MapPopupCard } from './MapPopupCard';
import { Skeleton } from '@/components/ui/Skeleton';
import type { MapPoint } from '@encuesta/shared-types';

import {
  Map,
  MapControls,
  MapClusterLayer,
  MapPopup,
} from '@/components/ui/map';

interface RealtimeMapProps {
  mapPoints: MapPoint[];
  loading?: boolean;
  fullscreen?: boolean;
}

interface PointProperties {
  id: string;
  label: string;
  createdAt: string;
  partyColor: string;
}

export function RealtimeMap({ mapPoints, loading, fullscreen }: RealtimeMapProps) {
  const { geoJson } = useRealtimeMap(mapPoints);
  const mapClass = fullscreen ? 'h-full w-full' : 'h-[500px] w-full';

  const [selectedPoint, setSelectedPoint] = useState<{
    coordinates: [number, number];
    properties: PointProperties;
  } | null>(null);

  if (loading) return <Skeleton className={fullscreen ? 'h-full w-full' : 'h-[500px] rounded-xl'} />;

  return (
    <div className={fullscreen ? 'h-full w-full' : 'overflow-hidden rounded-xl border border-border shadow-sm'}>
      <Map
        center={PERU_CENTER}
        zoom={PERU_ZOOM}
        theme="light"
        className={mapClass}
        fadeDuration={0}
      >
        <MapControls
          position="bottom-right"
          showZoom
          showCompass
          showLocate
          showFullscreen
        />

        {geoJson && (
          <MapClusterLayer<PointProperties>
            data={geoJson}
            clusterRadius={60}
            clusterMaxZoom={14}
            clusterColors={['#00ff87', '#3a86ff', '#f72585']}
            clusterThresholds={[10, 50]}
            pointColor={['get', 'partyColor']}
            onPointClick={(feature, coordinates) => {
              setSelectedPoint({
                coordinates,
                properties: feature.properties,
              });
            }}
          />
        )}

        {selectedPoint && (
          <MapPopup
            key={`${selectedPoint.coordinates[0]}-${selectedPoint.coordinates[1]}`}
            longitude={selectedPoint.coordinates[0]}
            latitude={selectedPoint.coordinates[1]}
            onClose={() => setSelectedPoint(null)}
            closeOnClick={false}
            focusAfterOpen={false}
            closeButton
            className="!border-none !bg-transparent !p-0 !shadow-none"
          >
            <MapPopupCard
              label={selectedPoint.properties.label}
              createdAt={selectedPoint.properties.createdAt}
            />
          </MapPopup>
        )}
      </Map>
    </div>
  );
}
