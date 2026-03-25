import type { ProvinceResult } from '@/data/surveyResults';

interface ProvinceResultsBarProps {
  provinceResults: ProvinceResult[];
  topicLabel: string;
  departmentLabel: string;
}

interface CandidateSegment {
  label: string;
  color: string;
  partyName: string;
  provinces: string[];
}

/**
 * AP News–style horizontal bar where each block is an individual province,
 * colored by whoever leads there. Provinces are grouped by candidate so
 * same-color blocks sit together.
 */
export function ProvinceResultsBar({
  provinceResults,
  topicLabel,
  departmentLabel,
}: ProvinceResultsBarProps) {
  if (provinceResults.length === 0) return null;

  const totalProvinces = provinceResults.length;

  // Group provinces per candidate
  const candidateMap = new Map<string, CandidateSegment>();
  for (const r of provinceResults) {
    const existing = candidateMap.get(r.label);
    if (existing) {
      existing.provinces.push(r.province);
    } else {
      candidateMap.set(r.label, {
        label: r.label,
        color: r.partyColor,
        partyName: r.partyName,
        provinces: [r.province],
      });
    }
  }

  // Sort candidates by province count descending
  const segments = [...candidateMap.values()].sort(
    (a, b) => b.provinces.length - a.provinces.length,
  );

  const leader = segments[0];
  const runner = segments.length > 1 ? segments[1] : null;

  // Build ordered list of individual province blocks (grouped by candidate)
  const blocks = segments.flatMap((seg) =>
    seg.provinces.map((prov) => ({
      province: prov,
      label: seg.label,
      color: seg.color,
    })),
  );

  return (
    <div className="space-y-5">
      {/* Title */}
      <h2 className="text-center text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        Encuesta {topicLabel} — {departmentLabel}
      </h2>

      {/* Leader vs Runner header */}
      <div className="flex items-end justify-between gap-4">
        {/* Left — leader */}
        <div>
          <p
            className="text-4xl font-black tabular-nums leading-none sm:text-5xl"
            style={{ color: leader.color }}
          >
            {leader.provinces.length}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {leader.label}
          </p>
          {leader.partyName && (
            <p className="text-xs text-slate-500">{leader.partyName}</p>
          )}
        </div>

        {/* Center — total */}
        <div className="flex flex-col items-center">
          <p className="text-xs font-semibold text-slate-400">
            {totalProvinces} provincias
          </p>
        </div>

        {/* Right — runner up */}
        {runner && (
          <div className="text-right">
            <p
              className="text-4xl font-black tabular-nums leading-none sm:text-5xl"
              style={{ color: runner.color }}
            >
              {runner.provinces.length}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {runner.label}
            </p>
            {runner.partyName && (
              <p className="text-xs text-slate-500">{runner.partyName}</p>
            )}
          </div>
        )}
      </div>

      {/* Segmented bar — one block per province */}
      <div className="flex h-8 w-full gap-[2px] sm:h-10">
        {blocks.map((block) => (
          <div
            key={block.province}
            className="relative flex flex-1 items-center justify-center rounded-[3px] transition-all duration-300"
            style={{ backgroundColor: block.color }}
            title={`${block.province.charAt(0) + block.province.slice(1).toLowerCase()} — ${block.label}`}
          />
        ))}
      </div>

      {/* Bottom labels — all candidates */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-xs text-slate-600">
              {seg.label}{' '}
              <span className="font-bold">
                ({seg.provinces.length})
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
