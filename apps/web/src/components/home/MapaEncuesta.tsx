import type { StyleSpecification } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import {
  Map as BaseMap,
  MapClusterLayer,
  MapControls,
  MapMarker,
  MarkerContent,
  useMap,
} from '@/components/ui/map';
import {
  DEPARTMENT_GEO,
  generateDepartmentPoints,
} from '@/data/departmentGeo';
import { ProvinceLabelsLayer } from '@/components/home/ProvinceLabelsLayer';
import type { ProvinceResult } from '@/data/surveyResults';

const PERU_CENTER: [number, number] = [-75.0, -9.19];
const PERU_ZOOM = 4.8;
const DEPT_SOURCE = 'peru-departamentos';
const HOVER_FILL = 'hover-dept-fill';
const HOVER_OUTLINE = 'hover-dept-outline';

const PROV_SOURCE = 'peru-provincias';
const PROV_FILL = 'province-fill';
const PROV_OUTLINE = 'province-outline';

const LIGHT_MAP_STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    cartoLight: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
  layers: [
    {
      id: 'carto-light-base',
      type: 'raster',
      source: 'cartoLight',
    },
  ],
};

/** Map from app department IDs to NOMBDEP values in GeoJSON */
const ID_TO_NOMBDEP: Record<string, string> = {
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

interface MapaEncuestaProps {
  activeDepartmentId: string | null;
  hoveredDepartmentId?: string | null;
  provinceResults?: ProvinceResult[];
  showPhoto?: boolean;
  /** When true the map fills its parent height instead of using a fixed height */
  fullHeight?: boolean;
}

function FlyToDepartment({
  departmentId,
}: {
  departmentId: string | null;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    if (!departmentId) {
      map.flyTo({
        center: PERU_CENTER,
        zoom: PERU_ZOOM,
        duration: 1200,
      });
      return;
    }

    const geo = DEPARTMENT_GEO[departmentId];
    if (!geo) return;

    map.flyTo({
      center: geo.center,
      zoom: geo.zoom,
      duration: 1200,
    });
  }, [map, isLoaded, departmentId]);

  return null;
}

function DepartmentHighlight({
  hoveredId,
  activeId,
}: {
  hoveredId: string | null;
  activeId: string | null;
}) {
  const { map, isLoaded } = useMap();
  const sourceLoaded = useRef(false);

  // Load the GeoJSON source once
  useEffect(() => {
    if (!map || !isLoaded || sourceLoaded.current) return;
    if (map.getSource(DEPT_SOURCE)) {
      sourceLoaded.current = true;
      return;
    }

    map.addSource(DEPT_SOURCE, {
      type: 'geojson',
      data: '/peru-departamentos.geojson',
    });

    map.addLayer({
      id: HOVER_FILL,
      type: 'fill',
      source: DEPT_SOURCE,
      paint: {
        'fill-color': '#3a86ff',
        'fill-opacity': 0.25,
      },
      filter: ['==', 'NOMBDEP', ''],
    });

    map.addLayer({
      id: HOVER_OUTLINE,
      type: 'line',
      source: DEPT_SOURCE,
      paint: {
        'line-color': '#3a86ff',
        'line-width': 2.5,
        'line-opacity': 0.7,
      },
      filter: ['==', 'NOMBDEP', ''],
    });

    sourceLoaded.current = true;
  }, [map, isLoaded]);

  // Update filter when hover/active changes
  useEffect(() => {
    if (!map || !isLoaded || !sourceLoaded.current) return;
    if (!map.getLayer(HOVER_FILL)) return;

    const targetId = hoveredId && hoveredId !== activeId ? hoveredId : activeId;
    const nombdep = targetId ? ID_TO_NOMBDEP[targetId] : null;

    const filter: ['==', string, string] = ['==', 'NOMBDEP', nombdep ?? ''];
    map.setFilter(HOVER_FILL, filter);
    map.setFilter(HOVER_OUTLINE, filter);

    // Gentle pan on hover (only if no department is actively selected)
    if (nombdep && !activeId) {
      const geo = DEPARTMENT_GEO[targetId!];
      if (geo) {
        map.flyTo({
          center: geo.center,
          zoom: Math.min(geo.zoom - 1, 6),
          duration: 600,
        });
      }
    }
  }, [map, isLoaded, hoveredId, activeId]);

  return null;
}

function ProvinceChoropleth({
  active,
  results,
  departmentId,
}: {
  active: boolean;
  results: ProvinceResult[];
  departmentId: string | null;
}) {
  const { map, isLoaded } = useMap();
  const sourceLoaded = useRef(false);

  // Initialize source + layers once
  useEffect(() => {
    if (!map || !isLoaded || sourceLoaded.current) return;
    if (map.getSource(PROV_SOURCE)) {
      sourceLoaded.current = true;
      return;
    }

    map.addSource(PROV_SOURCE, {
      type: 'geojson',
      data: '/peru-provincias.geojson',
    });

    map.addLayer({
      id: PROV_FILL,
      type: 'fill',
      source: PROV_SOURCE,
      filter: ['==', 'FIRST_NOMB', ''],
      paint: {
        'fill-color': 'transparent',
        'fill-opacity': 0.32,
      },
      layout: { visibility: 'none' },
    });

    map.addLayer({
      id: PROV_OUTLINE,
      type: 'line',
      source: PROV_SOURCE,
      filter: ['==', 'FIRST_NOMB', ''],
      paint: {
        'line-color': '#0f172a',
        'line-width': 2,
        'line-opacity': 0.85,
      },
      layout: { visibility: 'none' },
    });

    sourceLoaded.current = true;
  }, [map, isLoaded]);

  // Update visibility, filter, and colors when active/results/department change
  useEffect(() => {
    if (!map || !isLoaded || !sourceLoaded.current) return;
    if (!map.getLayer(PROV_FILL)) return;

    const nombdep = departmentId ? (ID_TO_NOMBDEP[departmentId] ?? '') : '';
    const deptFilter: ['==', string, string] = ['==', 'FIRST_NOMB', nombdep];
    map.setFilter(PROV_FILL, deptFilter);
    map.setFilter(PROV_OUTLINE, deptFilter);

    const vis = active ? 'visible' : 'none';
    map.setLayoutProperty(PROV_FILL, 'visibility', vis);
    map.setLayoutProperty(PROV_OUTLINE, 'visibility', vis);

    if (active && results.length > 0) {
      const colorExpr: unknown[] = ['match', ['get', 'NOMBPROV']];
      for (const r of results) {
        colorExpr.push(r.province, r.partyColor);
      }
      colorExpr.push('transparent');
      map.setPaintProperty(PROV_FILL, 'fill-color', colorExpr);
    }
  }, [map, isLoaded, active, results, departmentId]);

  return null;
}

export function MapaEncuesta({
  activeDepartmentId,
  hoveredDepartmentId,
  provinceResults = [],
  showPhoto = false,
  fullHeight = false,
}: MapaEncuestaProps) {
  const showChoropleth = provinceResults.length > 0;

  const geojson = activeDepartmentId
    ? generateDepartmentPoints(activeDepartmentId)
    : null;

  return (
    <div
      id="mapa-encuesta"
      className={
        fullHeight
          ? 'h-full w-full overflow-hidden bg-[#edf4f7]'
          : 'h-[480px] w-full overflow-hidden rounded-xl border border-slate-200 bg-[#edf4f7] sm:h-[560px] lg:h-[640px]'
      }
    >
      <BaseMap
        center={PERU_CENTER}
        zoom={PERU_ZOOM}
        theme="light"
        styles={{ light: LIGHT_MAP_STYLE }}
        className="h-full w-full"
        minZoom={3}
        maxZoom={14}
      >
        <FlyToDepartment departmentId={activeDepartmentId} />
        <DepartmentHighlight
          hoveredId={hoveredDepartmentId ?? null}
          activeId={activeDepartmentId}
        />
        <ProvinceChoropleth active={showChoropleth} results={provinceResults} departmentId={activeDepartmentId} />
        <ProvinceLabelsLayer active={showChoropleth} departmentId={activeDepartmentId} />

        {/* Cluster dots for departments WITHOUT choropleth data */}
        {geojson && !showChoropleth && (
          <MapClusterLayer
            data={geojson}
            clusterRadius={60}
            clusterMaxZoom={12}
            clusterColors={['#00ff87', '#3a86ff', '#f72585']}
            clusterThresholds={[10, 50]}
            pointColor={['get', 'partyColor']}
          />
        )}

        {/* Province name labels — rendered AFTER candidate markers so they appear on top */}
        {showChoropleth &&
          provinceResults.map((r) => (
            <MapMarker
              key={r.province}
              longitude={r.center[0]}
              latitude={r.center[1]}
              anchor="bottom"
              offset={[0, -10]}
            >
              <MarkerContent className="relative z-20 flex flex-col items-center">
                {showPhoto && r.photoUrl ? (
                  <div className="rounded-2xl border border-white/80 bg-white/95 p-1 shadow-xl ring-1 ring-slate-200 backdrop-blur-sm">
                    <img
                      src={r.photoUrl}
                      alt={r.label}
                      className="h-10 w-10 rounded-full border-2 object-cover shadow-md"
                      style={{ borderColor: r.partyColor }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="max-w-[150px] rounded-2xl border border-white/80 bg-white/95 px-2.5 py-2 text-center shadow-xl ring-1 ring-slate-200 backdrop-blur-sm">
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                      style={{ backgroundColor: r.partyColor }}
                    >
                      {r.label}
                    </span>
                    <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-tight text-slate-700">
                      {r.partyName}
                    </p>
                  </div>
                )}
                <span
                  className="mt-1 rounded-full border border-white/70 px-2 py-1 text-[11px] font-bold leading-none text-white shadow-lg"
                  style={{ backgroundColor: r.partyColor }}
                >
                  {r.percentage}%
                </span>
                <span
                  className="mt-1 h-3 w-0.5 rounded-full bg-slate-900/70"
                  aria-hidden="true"
                />
              </MarkerContent>
            </MapMarker>
          ))}

        <MapControls position="bottom-right" showZoom />
      </BaseMap>
    </div>
  );
}
