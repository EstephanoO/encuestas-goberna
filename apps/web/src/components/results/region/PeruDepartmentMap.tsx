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
  /** Selected survey topic label for the legend title */
  topicLabel?: string;
}

export function PeruDepartmentMap({
  activeDepartmentId,
  provinceResults,
  topicLabel = 'Presidencial',
}: PeruDepartmentMapProps) {
  const [hoveredProv, setHoveredProv] = useState<string | null>(null);

  const nombdep = ID_TO_NOMBDEP[activeDepartmentId] ?? '';
  const provinces = PROVINCE_PATHS[nombdep] ?? [];

  // Build a lookup: province name → result data
  const resultByProvince = new Map<string, ProvinceResult>();
  for (const r of provinceResults) {
    resultByProvince.set(r.province, r);
  }

  // Build unique legend entries
  const legendEntries = new Map<string, { label: string; color: string; partyName: string }>();
  for (const r of provinceResults) {
    if (!legendEntries.has(r.label)) {
      legendEntries.set(r.label, {
        label: r.label,
        color: r.partyColor,
        partyName: r.partyName,
      });
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-12">
      {/* SVG Map */}
      <div className="relative w-full max-w-[420px] flex-shrink-0">
        <svg
          viewBox={`0 0 ${PROVINCE_SVG_SIZE} ${PROVINCE_SVG_SIZE}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Mapa de provincias — ${topicLabel}`}
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

      {/* Legend */}
      <div className="w-full lg:w-auto">
        <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
          Lidera / Gana
        </h4>
        <div className="flex flex-wrap gap-x-6 gap-y-3 lg:flex-col">
          {[...legendEntries.values()].map((entry) => (
            <div key={entry.label} className="flex items-center gap-2.5">
              <span
                className="inline-block h-3.5 w-3.5 flex-shrink-0 rounded-sm shadow-sm"
                style={{ backgroundColor: entry.color }}
              />
              <div>
                <span className="text-sm font-semibold text-slate-800">
                  {entry.label}
                </span>
                {entry.partyName && (
                  <span className="ml-1.5 text-xs text-slate-400">
                    {entry.partyName}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
