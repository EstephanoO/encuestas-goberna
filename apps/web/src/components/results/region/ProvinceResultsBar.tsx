import type { ProvinceResult, CandidateRanking } from '@/data/surveyResults';

interface ProvinceResultsBarProps {
  provinceResults: ProvinceResult[];
  /** Department-level rankings with percentage for each candidate */
  departmentRankings: CandidateRanking[];
  topicLabel: string;
  departmentLabel: string;
}

interface BarSegment {
  name: string;
  color: string;
  party: string;
  percentage: number;
  provinceCount: number;
}

/**
 * AP News–style horizontal bar where each candidate segment's width
 * is proportional to their department-level survey percentage.
 * Inside each segment, individual province blocks are shown.
 */
export function ProvinceResultsBar({
  provinceResults,
  departmentRankings,
  topicLabel,
  departmentLabel,
}: ProvinceResultsBarProps) {
  if (departmentRankings.length === 0) return null;

  // Count provinces per candidate from province results
  const provinceCountByName = new Map<string, number>();
  for (const r of provinceResults) {
    provinceCountByName.set(r.label, (provinceCountByName.get(r.label) ?? 0) + 1);
  }

  // Build segments ONLY from candidates who won at least one province
  const segments: BarSegment[] = departmentRankings
    .filter(
      (r) =>
        r.party !== '' &&
        !r.name.toLowerCase().includes('viciado') &&
        !r.name.toLowerCase().includes('otros') &&
        (provinceCountByName.get(r.name) ?? 0) > 0,
    )
    .map((r) => ({
      name: r.name,
      color: r.color,
      party: r.party,
      percentage: r.percentage,
      provinceCount: provinceCountByName.get(r.name) ?? 0,
    }));

  if (segments.length === 0) return null;

  const totalPercentage = segments.reduce((sum, s) => sum + s.percentage, 0);
  const leader = segments[0];
  const runner = segments.length > 1 ? segments[1] : null;

  // Reorder for the bar: leader (left) → middle candidates → runner (right)
  const middle = segments.slice(2);
  const barOrder: BarSegment[] = [
    leader,
    ...middle,
    ...(runner ? [runner] : []),
  ];

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
            {leader.percentage}%
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {leader.name}
          </p>
          {leader.party && (
            <p className="text-xs text-slate-500">{leader.party}</p>
          )}
        </div>

        {/* Center — total provinces */}
        {provinceResults.length > 0 && (
          <div className="flex flex-col items-center">
            <p className="text-xs font-semibold text-slate-400">
              {provinceResults.length} provincias
            </p>
          </div>
        )}

        {/* Right — runner up */}
        {runner && (
          <div className="text-right">
            <p
              className="text-4xl font-black tabular-nums leading-none sm:text-5xl"
              style={{ color: runner.color }}
            >
              {runner.percentage}%
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {runner.name}
            </p>
            {runner.party && (
              <p className="text-xs text-slate-500">{runner.party}</p>
            )}
          </div>
        )}
      </div>

      {/* Segmented bar — leader left, runner right, rest in center */}
      <div className="flex h-8 w-full gap-[2px] overflow-hidden sm:h-10">
        {barOrder.map((seg) => {
          const widthPercent = (seg.percentage / totalPercentage) * 100;
          // Split this segment into individual province blocks
          const provCount = seg.provinceCount;

          return (
            <div
              key={seg.name}
              className="flex gap-[2px]"
              style={{ width: `${widthPercent}%` }}
            >
              {provCount > 0 ? (
                Array.from({ length: provCount }).map((_, i) => (
                  <div
                    key={`${seg.name}-${String(i)}`}
                    className="flex-1 rounded-[3px] transition-all duration-300"
                    style={{ backgroundColor: seg.color }}
                    title={`${seg.name} — ${seg.percentage}%`}
                  />
                ))
              ) : (
                <div
                  className="flex-1 rounded-[3px] transition-all duration-300"
                  style={{ backgroundColor: seg.color }}
                  title={`${seg.name} — ${seg.percentage}%`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom labels — all candidates */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
        {segments.map((seg) => (
          <div key={seg.name} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-xs text-slate-600">
              {seg.name}{' '}
              <span className="font-bold">{seg.percentage}%</span>
              {seg.provinceCount > 0 && (
                <span className="text-slate-400">
                  {' '}({seg.provinceCount} prov.)
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
