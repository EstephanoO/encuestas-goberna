import { useEffect, useRef, useCallback } from 'react';
import MapLibreGL from 'maplibre-gl';
import { useMap } from '@/components/ui/map';
import { STATIC_VOTE_OPTIONS } from '@/data/voteOptions';
import type { GeoJsonFeatureCollection } from '@/lib/map';

const MARKER_COLORS: Record<string, string> = Object.fromEntries(
  STATIC_VOTE_OPTIONS.map((o, i) => {
    const colors = [
      '#00ff87', '#f72585', '#00d4ff', '#fee440', '#ff6b35',
      '#7b2ff7', '#00f5d4', '#ff006e', '#3a86ff', '#ffbe0b',
      '#06d6a0', '#e500ff', '#00ffff', '#ff4444', '#39ff14',
      '#ff61d8', '#4cc9f0', '#ffd60a', '#ff5733', '#b388ff',
      '#1de9b6', '#ff80ab', '#76ff03', '#ea80fc', '#00e5ff',
      '#ffab40', '#69f0ae', '#ff4081', '#40c4ff', '#eeff41',
      '#ff9100', '#18ffff', '#ff1744', '#00e676', '#d500f9',
      '#aeea00', '#651fff',
    ];
    return [o.label, colors[i % colors.length]];
  }),
);

function getColor(label: string): string {
  return MARKER_COLORS[label] ?? '#64748b';
}

interface Props {
  data: GeoJsonFeatureCollection;
  clusterRadius?: number;
  clusterMaxZoom?: number;
}

function createClusterEl(color: string, count: number, pct: number): HTMLDivElement {
  const size = Math.min(24 + Math.log2(count + 1) * 10, 56);
  const el = document.createElement('div');
  el.style.cssText = `
    width: ${size}px; height: ${size}px;
    background: ${color};
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 700; font-size: ${Math.max(10, size * 0.25)}px;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    cursor: pointer;
    box-shadow: 0 0 0 3px ${color}44;
  `;
  el.textContent = `${Math.round(pct)}%`;
  return el;
}

function createPointEl(color: string): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 10px; height: 10px;
    background: ${color};
    border-radius: 50%;
    cursor: pointer;
  `;

  const ping = document.createElement('div');
  ping.style.cssText = `
    position: absolute; top: 50%; left: 50%;
    width: 18px; height: 18px;
    margin-top: -9px; margin-left: -9px;
    background: ${color};
    border-radius: 50%;
    opacity: 0;
    animation: clusterPing 1.5s ease-out infinite;
  `;
  el.style.position = 'relative';
  el.appendChild(ping);
  return el;
}

export function DominantClusterLayer({
  data,
  clusterRadius = 60,
  clusterMaxZoom = 14,
}: Props) {
  const { map, isLoaded } = useMap();
  const markersRef = useRef<MapLibreGL.Marker[]>([]);
  const sourceId = 'dominant-cluster-src';

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }, []);

  // Inject ping animation once
  useEffect(() => {
    if (document.getElementById('cluster-ping-style')) return;
    const style = document.createElement('style');
    style.id = 'cluster-ping-style';
    style.textContent = `
      @keyframes clusterPing {
        0% { transform: scale(0.5); opacity: 0.5; }
        100% { transform: scale(2); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Add source
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data,
        cluster: true,
        clusterRadius,
        clusterMaxZoom,
      });
    } else {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
    }

    return () => {
      clearMarkers();
      if (map.getSource(sourceId)) {
        try { map.removeSource(sourceId); } catch { /* already removed */ }
      }
    };
  }, [map, isLoaded, clusterRadius, clusterMaxZoom]);

  // Update data
  useEffect(() => {
    if (!map || !isLoaded) return;
    const src = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(data);
  }, [data, map, isLoaded]);

  // Render markers from clusters
  const renderMarkers = useCallback(() => {
    if (!map || !isLoaded) return;
    const src = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    clearMarkers();

    const features = map.querySourceFeatures(sourceId);
    const seen = new Set<string>();

    for (const feature of features) {
      const geom = feature.geometry as GeoJSON.Point;
      const coords: [number, number] = [geom.coordinates[0], geom.coordinates[1]];
      const props = feature.properties ?? {};

      const isCluster = props.cluster === true || props.cluster_id != null;
      const key = isCluster
        ? `cluster-${props.cluster_id}`
        : `point-${props.id ?? `${coords[0]},${coords[1]}`}`;

      if (seen.has(key)) continue;
      seen.add(key);

      if (isCluster) {
        const clusterId = props.cluster_id as number;
        const pointCount = (props.point_count as number) ?? 0;

        // Get leaves to find dominant label
        (src as unknown as { getClusterLeaves: (id: number, limit: number, offset: number, cb: (err: unknown, features: GeoJSON.Feature[]) => void) => void })
          .getClusterLeaves(clusterId, 256, 0, (_err, leaves) => {
            if (!leaves) return;

            const counts: Record<string, number> = {};
            for (const leaf of leaves) {
              const label = (leaf.properties?.label as string) ?? '';
              counts[label] = (counts[label] ?? 0) + 1;
            }

            let maxLabel = '';
            let maxCount = 0;
            for (const [label, count] of Object.entries(counts)) {
              if (count > maxCount) {
                maxCount = count;
                maxLabel = label;
              }
            }

            const pct = leaves.length > 0 ? (maxCount / leaves.length) * 100 : 0;
            const color = getColor(maxLabel);
            const el = createClusterEl(color, pointCount, pct);

            el.addEventListener('click', () => {
              (src as unknown as { getClusterExpansionZoom: (id: number, cb: (err: unknown, zoom: number) => void) => void })
                .getClusterExpansionZoom(clusterId, (_err2, zoom) => {
                  if (zoom != null) {
                    map.easeTo({ center: coords, zoom: zoom + 1 });
                  }
                });
            });

            const marker = new MapLibreGL.Marker({ element: el })
              .setLngLat(coords)
              .addTo(map);
            markersRef.current.push(marker);
          });
      } else {
        const label = (props.label as string) ?? '';
        const color = getColor(label);
        const el = createPointEl(color);

        const marker = new MapLibreGL.Marker({ element: el })
          .setLngLat(coords)
          .addTo(map);
        markersRef.current.push(marker);
      }
    }
  }, [map, isLoaded, clearMarkers]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const handler = () => renderMarkers();
    // Small delay to let source features populate
    const initial = setTimeout(handler, 200);

    map.on('moveend', handler);
    map.on('zoomend', handler);
    map.on('sourcedata', handler);

    return () => {
      clearTimeout(initial);
      map.off('moveend', handler);
      map.off('zoomend', handler);
      map.off('sourcedata', handler);
      clearMarkers();
    };
  }, [map, isLoaded, renderMarkers, clearMarkers]);

  return null;
}
