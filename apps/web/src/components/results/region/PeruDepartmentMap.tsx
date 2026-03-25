import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PROVINCE_PATHS, PROVINCE_SVG_SIZE } from '@/data/provincePaths';
import type { ProvinceResult } from '@/data/surveyResults';

/** Map from app department slug to NOMBDEP (key in PROVINCE_PATHS) */
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

interface PeruDepartmentMapProps {
  /** Currently viewed department ID (slug) */
  activeDepartmentId: string;
  /** Province-level results for the selected topic + department */
  provinceResults: ProvinceResult[];
}

export function PeruDepartmentMap({
  activeDepartmentId,
  provinceResults,
}: PeruDepartmentMapProps) {
  const [hoveredProv, setHoveredProv] = useState<string | null>(null);

  const nombdep = ID_TO_NOMBDEP[activeDepartmentId] ?? '';
  const provinces = PROVINCE_PATHS[nombdep] ?? [];

  // Build a lookup: province name → result data
  const resultByProvince = new Map<string, ProvinceResult>();
  for (const r of provinceResults) {
    resultByProvince.set(r.province, r);
  }

  return (
    <div className="flex flex-col items-center">
      {/* SVG Map */}
      <div className="relative w-full max-w-[420px] flex-shrink-0">
        <svg
          viewBox={`0 0 ${PROVINCE_SVG_SIZE} ${PROVINCE_SVG_SIZE}`}
          className="h-auto w-full"
          role="img"
          aria-label="Mapa de provincias"
        >
          {provinces.map((prov) => {
            const result = resultByProvince.get(prov.nombprov);
            const fillColor = result?.partyColor ?? '#e2e8f0';
            const hasData = !!result;
            const isHovered = hoveredProv === prov.nombprov;

            return (
              <g key={prov.nombprov}>
                <path
                  d={prov.d}
                  fill={fillColor}
                  fillOpacity={hasData ? (isHovered ? 1 : 0.82) : 0.25}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredProv(prov.nombprov)}
                  onMouseLeave={() => setHoveredProv(null)}
                />
                {/* Province name label */}
                <text
                  x={prov.cx}
                  y={prov.cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn(
                    'pointer-events-none select-none font-bold',
                    hasData ? 'fill-white' : 'fill-slate-400',
                  )}
                  fontSize={8}
                  style={{
                    textShadow: hasData
                      ? '0 1px 3px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,0.3)'
                      : 'none',
                  }}
                >
                  {prov.nombprov.length > 12
                    ? prov.nombprov.slice(0, 10) + '…'
                    : prov.nombprov}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip on hover */}
        {hoveredProv && (() => {
          const result = resultByProvince.get(hoveredProv);
          return (
            <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-white/95 px-4 py-2.5 shadow-xl backdrop-blur-sm">
              <p className="text-xs font-bold text-slate-900">
                {hoveredProv.charAt(0) + hoveredProv.slice(1).toLowerCase()}
              </p>
              {result ? (
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: result.partyColor }}
                  />
                  <span className="text-[12px] text-slate-600">
                    {result.label} — <span className="font-bold">{result.percentage}%</span>
                  </span>
                </div>
              ) : (
                <p className="mt-0.5 text-[11px] text-slate-400">Sin datos</p>
              )}
            </div>
          );
        })()}
      </div>


    </div>
  );
}
