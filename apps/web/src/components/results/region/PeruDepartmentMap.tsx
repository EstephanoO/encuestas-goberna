import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  DEPARTMENT_PATHS,
  PERU_SVG_WIDTH,
  PERU_SVG_HEIGHT,
} from '@/data/peruDepartmentPaths';
import type { CandidateRanking } from '@/data/surveyResults';

/** Map from app department slug to NOMBDEP in GeoJSON/SVG paths */
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

const NOMBDEP_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(ID_TO_NOMBDEP).map(([k, v]) => [v, k]),
);

/** Short labels for department abbreviations on the map */
const DEPT_ABBREVIATIONS: Record<string, string> = {
  AMAZONAS: 'AMA',
  ANCASH: 'ANC',
  APURIMAC: 'APU',
  AREQUIPA: 'ARE',
  AYACUCHO: 'AYA',
  CAJAMARCA: 'CAJ',
  CALLAO: 'CAL',
  CUSCO: 'CUS',
  HUANCAVELICA: 'HCV',
  HUANUCO: 'HUA',
  ICA: 'ICA',
  JUNIN: 'JUN',
  'LA LIBERTAD': 'LAL',
  LAMBAYEQUE: 'LAM',
  LIMA: 'LIM',
  LORETO: 'LOR',
  'MADRE DE DIOS': 'MDD',
  MOQUEGUA: 'MOQ',
  PASCO: 'PAS',
  PIURA: 'PIU',
  PUNO: 'PUN',
  'SAN MARTIN': 'SM',
  TACNA: 'TAC',
  TUMBES: 'TUM',
  UCAYALI: 'UCA',
};

interface PeruDepartmentMapProps {
  /** Currently viewed department ID (slug) */
  activeDepartmentId: string;
  /** Rankings per department — key is department slug, value is candidate array */
  departmentRankings: Record<string, CandidateRanking[]>;
  /** Selected survey topic label for the legend title */
  topicLabel?: string;
}

/**
 * Gets the fill color for a department based on who is leading.
 * Skips "Viciado / Blanco / Nulo" and "Otros" entries — uses the first
 * real candidate's color.
 */
function getLeaderColor(rankings: CandidateRanking[] | undefined): string {
  if (!rankings || rankings.length === 0) return '#e2e8f0'; // slate-200
  const leader = rankings.find(
    (r) =>
      r.party !== '' &&
      !r.name.toLowerCase().includes('viciado') &&
      !r.name.toLowerCase().includes('otros'),
  );
  return leader?.color ?? rankings[0].color;
}

function getLeaderInfo(rankings: CandidateRanking[] | undefined) {
  if (!rankings || rankings.length === 0) return null;
  const leader = rankings.find(
    (r) =>
      r.party !== '' &&
      !r.name.toLowerCase().includes('viciado') &&
      !r.name.toLowerCase().includes('otros'),
  );
  return leader ?? null;
}

export function PeruDepartmentMap({
  activeDepartmentId,
  departmentRankings,
  topicLabel = 'Presidencial',
}: PeruDepartmentMapProps) {
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);
  const activeNombdep = ID_TO_NOMBDEP[activeDepartmentId] ?? '';

  // Build unique legend entries from departments that have data
  const legendEntries = new Map<string, { name: string; color: string; party: string }>();
  for (const rankings of Object.values(departmentRankings)) {
    const leader = getLeaderInfo(rankings);
    if (leader && !legendEntries.has(leader.name)) {
      legendEntries.set(leader.name, {
        name: leader.name,
        color: leader.color,
        party: leader.party,
      });
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:gap-10">
      {/* SVG Map */}
      <div className="relative w-full max-w-[320px] flex-shrink-0 lg:max-w-[280px]">
        <svg
          viewBox={`0 0 ${PERU_SVG_WIDTH} ${PERU_SVG_HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Mapa de Perú — Resultados ${topicLabel}`}
        >
          {/* Background */}
          <rect width={PERU_SVG_WIDTH} height={PERU_SVG_HEIGHT} fill="#f8fafc" rx="8" />

          {DEPARTMENT_PATHS.map((dept) => {
            const deptSlug = NOMBDEP_TO_ID[dept.nombdep];
            const rankings = deptSlug ? departmentRankings[deptSlug] : undefined;
            const hasData = rankings && rankings.length > 0;
            const fillColor = hasData ? getLeaderColor(rankings) : '#e2e8f0';
            const isActive = dept.nombdep === activeNombdep;
            const isHovered = hoveredDept === dept.nombdep;
            const abbr = DEPT_ABBREVIATIONS[dept.nombdep] ?? '';

            return (
              <g key={dept.nombdep}>
                <path
                  d={dept.d}
                  fill={fillColor}
                  fillOpacity={hasData ? (isActive ? 1 : isHovered ? 0.9 : 0.7) : 0.3}
                  stroke={isActive ? '#0f172a' : '#ffffff'}
                  strokeWidth={isActive ? 2.5 : 1}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredDept(dept.nombdep)}
                  onMouseLeave={() => setHoveredDept(null)}
                />
                {/* Department abbreviation label */}
                <text
                  x={dept.cx}
                  y={dept.cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn(
                    'pointer-events-none select-none font-bold',
                    isActive ? 'fill-white' : hasData ? 'fill-white/90' : 'fill-slate-400',
                  )}
                  fontSize={dept.nombdep === 'CALLAO' ? 7 : 9}
                  style={{
                    textShadow: hasData
                      ? '0 1px 2px rgba(0,0,0,0.5)'
                      : 'none',
                  }}
                >
                  {abbr}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip on hover */}
        {hoveredDept && (
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
            <p className="text-xs font-bold text-slate-900">
              {hoveredDept.charAt(0) + hoveredDept.slice(1).toLowerCase()}
            </p>
            {(() => {
              const slug = NOMBDEP_TO_ID[hoveredDept];
              const leader = slug ? getLeaderInfo(departmentRankings[slug]) : null;
              if (!leader) return <p className="text-[11px] text-slate-400">Sin datos</p>;
              return (
                <p className="text-[11px] text-slate-600">
                  <span
                    className="mr-1.5 inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: leader.color }}
                  />
                  {leader.name} — {leader.percentage}%
                </p>
              );
            })()}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="w-full lg:w-auto">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
          Lidera / Gana
        </h4>
        <div className="flex flex-wrap gap-x-5 gap-y-2 lg:flex-col">
          {[...legendEntries.values()].map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 flex-shrink-0 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm font-medium text-slate-700">
                {entry.name}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 flex-shrink-0 rounded-sm bg-slate-200" />
            <span className="text-sm font-medium text-slate-400">Sin datos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
