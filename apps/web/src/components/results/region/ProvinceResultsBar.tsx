import type { ProvinceResult, CandidateRanking } from '@/data/surveyResults';

interface ProvinceResultsBarProps {
  provinceResults: ProvinceResult[];
  /** Department-level rankings (used only for leader/runner header info) */
  departmentRankings: CandidateRanking[];
  topicLabel: string;
  departmentLabel: string;
}

interface CandidateSummary {
  name: string;
  color: string;
  party: string;
  provinceCount: number;
  /** Sum of all province percentages for this candidate */
  totalPercentage: number;
}

/**
 * AP News–style horizontal segmented bar.
 * Each province is an individual block whose width is proportional
 * to the percentage the winning candidate got IN THAT province.
 */
export function ProvinceResultsBar({
  provinceResults,
  departmentRankings,
  topicLabel,
  departmentLabel,
}: ProvinceResultsBarProps) {
  if (provinceResults.length === 0) return null;

  // Group provinces by candidate and sum their percentages
  const candidateMap = new Map<string, CandidateSummary>();
  for (const r of provinceResults) {
    const existing = candidateMap.get(r.label);
    if (existing) {
      existing.provinceCount += 1;
      existing.totalPercentage += r.percentage;
    } else {
      candidateMap.set(r.label, {
        name: r.label,
        color: r.partyColor,
        party: r.partyName,
        provinceCount: 1,
        totalPercentage: r.percentage,
      });
    }
  }

  // Sort candidates by total percentage descending
  const candidates = [...candidateMap.values()].sort(
    (a, b) => b.totalPercentage - a.totalPercentage,
  );

  if (candidates.length === 0) return null;

  const leader = candidates[0];
  const runner = candidates.length > 1 ? candidates[1] : null;

  // Build individual province blocks grouped by candidate
  const middle = candidates.slice(2);
  const orderedCandidates = [leader, ...middle, ...(runner ? [runner] : [])];

  const blocks: { province: string; label: string; color: string; percentage: number }[] = [];
  for (const cand of orderedCandidates) {
    const provs = provinceResults
      .filter((r) => r.label === cand.name)
      .sort((a, b) => b.percentage - a.percentage);
    for (const p of provs) {
      blocks.push({
        province: p.province,
        label: p.label,
        color: p.partyColor,
        percentage: p.percentage,
      });
    }
  }

  // Use department ranking percentage for header if available, otherwise average
  function getHeaderPercentage(candidateName: string, summary: CandidateSummary): number {
    const ranking = departmentRankings.find((r) => r.name === candidateName);
    if (ranking) return ranking.percentage;
    return Math.round(summary.totalPercentage / summary.provinceCount);
  }

  const leaderPct = getHeaderPercentage(leader.name, leader);
  const runnerPct = runner ? getHeaderPercentage(runner.name, runner) : 0;

  return (
    <div className="mx-2 space-y-4 sm:mx-0 sm:space-y-5">
      {/* Title */}
      <h2 className="text-center text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
        Encuesta {topicLabel} — {departmentLabel}
      </h2>

      {/* Leader vs Runner header */}
      <div className="flex items-end justify-between gap-3 sm:gap-4">
        <div>
          <p
            className="text-3xl font-black tabular-nums leading-none sm:text-4xl md:text-5xl"
            style={{ color: leader.color }}
          >
            {leaderPct}%
          </p>
          <p className="mt-1 text-xs font-bold text-slate-900 sm:text-sm">
            {leader.name}
          </p>
          {leader.party && (
            <p className="text-[10px] text-slate-500 sm:text-xs">{leader.party}</p>
          )}
        </div>

        <div className="flex flex-col items-center">
          <p className="text-[10px] font-semibold text-slate-400 sm:text-xs">
            {provinceResults.length} provincias
          </p>
        </div>

        {runner && (
          <div className="text-right">
            <p
              className="text-3xl font-black tabular-nums leading-none sm:text-4xl md:text-5xl"
              style={{ color: runner.color }}
            >
              {runnerPct}%
            </p>
            <p className="mt-1 text-xs font-bold text-slate-900 sm:text-sm">
              {runner.name}
            </p>
            {runner.party && (
              <p className="text-[10px] text-slate-500 sm:text-xs">{runner.party}</p>
            )}
          </div>
        )}
      </div>

      {/* Horizontal segmented bar */}
      <div className="flex h-7 w-full gap-[2px] sm:h-10 sm:gap-[3px]">
        {blocks.map((block) => (
          <div
            key={block.province}
            className="rounded-[3px] transition-all duration-300"
            style={{
              width: `${block.percentage}%`,
              backgroundColor: block.color,
            }}
            title={`${block.province.charAt(0) + block.province.slice(1).toLowerCase()} — ${block.label} ${block.percentage}%`}
          />
        ))}
      </div>

      {/* Bottom labels */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 sm:gap-x-5">
        {candidates.map((cand) => (
          <div key={cand.name} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: cand.color }}
            />
            <span className="text-[10px] text-slate-600 sm:text-xs">
              {cand.name}{' '}
              <span className="font-bold">
                {getHeaderPercentage(cand.name, cand)}%
              </span>
              <span className="text-slate-400">
                {' '}({cand.provinceCount} prov.)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
