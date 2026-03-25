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
  provinceCount: number;
  photoUrl?: string;
}

/**
 * AP News–style horizontal bar showing province distribution per candidate.
 * Each segment represents how many provinces a candidate leads in.
 */
export function ProvinceResultsBar({
  provinceResults,
  topicLabel,
  departmentLabel,
}: ProvinceResultsBarProps) {
  if (provinceResults.length === 0) return null;

  const totalProvinces = provinceResults.length;

  // Count provinces per candidate (by label — the candidate/issue name)
  const candidateMap = new Map<string, CandidateSegment>();
  for (const r of provinceResults) {
    const existing = candidateMap.get(r.label);
    if (existing) {
      existing.provinceCount += 1;
    } else {
      candidateMap.set(r.label, {
        label: r.label,
        color: r.partyColor,
        partyName: r.partyName,
        provinceCount: 1,
        photoUrl: r.photoUrl,
      });
    }
  }

  // Sort by province count descending
  const segments = [...candidateMap.values()].sort(
    (a, b) => b.provinceCount - a.provinceCount,
  );

  const leader = segments[0];
  const runner = segments.length > 1 ? segments[1] : null;

  return (
    <div className="space-y-5">
      {/* Title */}
      <h2 className="text-center text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        Encuesta {topicLabel} — {departmentLabel}
      </h2>

      {/* Leader vs Runner header */}
      <div className="flex items-end justify-between gap-4">
        {/* Left — leader or first */}
        <div className="flex items-center gap-3">
          <div>
            <p
              className="text-4xl font-black tabular-nums leading-none sm:text-5xl"
              style={{ color: leader.color }}
            >
              {leader.provinceCount}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {leader.label}
            </p>
            {leader.partyName && (
              <p className="text-xs text-slate-500">{leader.partyName}</p>
            )}
          </div>
        </div>

        {/* Center — total */}
        <div className="flex flex-col items-center">
          <p className="text-xs font-semibold text-slate-400">
            {totalProvinces} provincias
          </p>
        </div>

        {/* Right — runner up */}
        {runner && (
          <div className="flex items-center gap-3 text-right">
            <div>
              <p
                className="text-4xl font-black tabular-nums leading-none sm:text-5xl"
                style={{ color: runner.color }}
              >
                {runner.provinceCount}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {runner.label}
              </p>
              {runner.partyName && (
                <p className="text-xs text-slate-500">{runner.partyName}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Segmented bar */}
      <div className="flex h-8 w-full overflow-hidden rounded-md shadow-inner sm:h-10">
        {segments.map((seg) => {
          const widthPercent = (seg.provinceCount / totalProvinces) * 100;
          return (
            <div
              key={seg.label}
              className="relative flex items-center justify-center transition-all duration-300"
              style={{
                width: `${widthPercent}%`,
                backgroundColor: seg.color,
              }}
              title={`${seg.label}: ${seg.provinceCount} ${seg.provinceCount === 1 ? 'provincia' : 'provincias'}`}
            >
              {widthPercent >= 15 && (
                <span className="text-xs font-bold text-white drop-shadow-sm">
                  {seg.provinceCount}
                </span>
              )}
            </div>
          );
        })}
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
                ({seg.provinceCount})
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
