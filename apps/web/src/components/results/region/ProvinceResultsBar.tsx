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
 * AP News–style horizontal bar.
 * Each province is an individual block whose width is proportional
 * to the percentage the winning candidate got IN THAT province.
 * Blocks are grouped by candidate: leader on the left, runner on the right.
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
  // Order: leader provinces → middle candidates → runner provinces
  const middle = candidates.slice(2);
  const orderedCandidates = [leader, ...middle, ...(runner ? [runner] : [])];

  // Build block list: each province is one block
  const blocks: { province: string; label: string; color: string; percentage: number }[] = [];
  for (const cand of orderedCandidates) {
    // Get this candidate's provinces sorted by percentage descending
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
            {leaderPct}%
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {leader.name}
          </p>
          {leader.party && (
            <p className="text-xs text-slate-500">{leader.party}</p>
          )}
        </div>

        {/* Center — total provinces */}
        <div className="flex flex-col items-center">
          <p className="text-xs font-semibold text-slate-400">
            {provinceResults.length} provincias
          </p>
        </div>

        {/* Right — runner up */}
        {runner && (
          <div className="text-right">
            <p
              className="text-4xl font-black tabular-nums leading-none sm:text-5xl"
              style={{ color: runner.color }}
            >
              {runnerPct}%
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

      {/* Segmented bar — each block width IS the percentage value directly */}
      <div className="flex h-8 w-full gap-[2px] overflow-hidden sm:h-10">
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
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
        {candidates.map((cand) => (
          <div key={cand.name} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: cand.color }}
            />
            <span className="text-xs text-slate-600">
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
