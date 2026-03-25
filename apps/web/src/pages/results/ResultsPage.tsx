import { Users, Trophy, Clock, TrendingUp } from 'lucide-react';
import { formatNumber, formatPercent, formatTime } from '@/lib/formatting';
import { ResultsBarChart } from '@/components/results/ResultsBarChart';
import { Podium } from '@/components/results/Podium';
import { ErrorState } from '@/components/ui/ErrorState';
import { useResultsSummary } from '@/hooks/useResultsSummary';
import { useRealtimeResults } from '@/hooks/useRealtimeResults';
import { Skeleton } from '@/components/ui/Skeleton';
import { STATIC_VOTE_OPTIONS } from '@/data/voteOptions';

const PERU_VOTING_POPULATION = 25_287_954;

const optionById: Record<string, (typeof STATIC_VOTE_OPTIONS)[number]> = Object.fromEntries(
  STATIC_VOTE_OPTIONS.map((o) => [o.id, o]),
);

const optionByLabel: Record<string, (typeof STATIC_VOTE_OPTIONS)[number]> = Object.fromEntries(
  STATIC_VOTE_OPTIONS.map((o) => [o.label, o]),
);

export default function ResultsPage() {
  const { data: snapshot, isLoading, isError, refetch } = useResultsSummary();

  const realtime = useRealtimeResults(
    snapshot
      ? {
          summary: snapshot.summary,
          bars: snapshot.bars,
          mapPoints: snapshot.mapPoints,
          recent: snapshot.recent,
        }
      : undefined,
  );

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <ErrorState
          message="No pudimos cargar los resultados. Verifica tu conexion."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const totalVotes = realtime.summary?.totalVotes ?? 0;
  const webPct = PERU_VOTING_POPULATION > 0
    ? (totalVotes / PERU_VOTING_POPULATION) * 100
    : 0;
  const leader = realtime.summary?.leader;
  const leaderOption = leader ? optionByLabel[leader.label] : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Votos en la web"
          value={isLoading ? null : formatNumber(totalVotes)}
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Poblacion electoral"
          value={formatNumber(PERU_VOTING_POPULATION)}
          sub={isLoading ? undefined : `${webPct.toFixed(4)}% participo`}
        >
          <DonutMicro percentage={webPct} size={40} />
        </KpiCard>
        <KpiCard
          icon={<Trophy className="h-5 w-5" />}
          label="Lider"
          value={isLoading ? null : (leader?.label ?? '—')}
          sub={leader ? formatPercent(leader.percentage) : undefined}
          logoUrl={leaderOption?.candidate?.partyLogoUrl}
        />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label="Actualizado"
          value={isLoading ? null : (realtime.summary ? formatTime(realtime.summary.updatedAt) : '—')}
        />
      </div>

      {/* Podium top 3 */}
      {!isLoading && realtime.bars.length >= 3 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-6 text-center text-sm font-semibold text-foreground">
            Podio — Top 3
          </h2>
          <Podium bars={realtime.bars} totalVotes={totalVotes} />
        </div>
      )}

      {/* Bar chart */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Top 10 — Resultados</h2>
        <ResultsBarChart
          bars={realtime.bars}
          loading={isLoading && realtime.bars.length === 0}
        />
      </div>

      {/* Full ranking table */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Ranking completo</h2>
        {isLoading && realtime.bars.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : (
          <RankingTable bars={realtime.bars} totalVotes={totalVotes} />
        )}
      </div>
    </div>
  );
}

/* ── KPI Card ── */

function KpiCard({
  icon,
  label,
  value,
  sub,
  logoUrl,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  sub?: string;
  logoUrl?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      {children ?? (
        logoUrl ? (
          <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 object-contain" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )
      )}
      <div className="min-w-0">
        <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
        {value === null ? (
          <Skeleton className="mt-1 h-4 w-20 rounded" />
        ) : (
          <p className="truncate text-sm font-bold leading-tight text-foreground">{value}</p>
        )}
        {sub && <p className="text-[10px] leading-tight text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Donut Micro ── */

function DonutMicro({ percentage, size = 40 }: { percentage: number; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.min(percentage, 100);
  const offset = circumference - (filled / 100) * circumference;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-muted/30"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-primary"
      />
    </svg>
  );
}

/* ── Ranking Table ── */

function RankingTable({
  bars,
  totalVotes,
}: {
  bars: { voteOptionId: string; label: string; totalVotes: number; percentage: number }[];
  totalVotes: number;
}) {
  const sorted = [...bars].sort((a, b) => b.totalVotes - a.totalVotes);

  if (sorted.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Aun no hay votos registrados.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-2 font-medium">#</th>
            <th className="pb-2 pr-2 font-medium">Candidato</th>
            <th className="pb-2 pr-2 text-right font-medium">Votos</th>
            <th className="pb-2 pr-2 text-right font-medium">%</th>
            <th className="hidden pb-2 font-medium sm:table-cell" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const option = optionById[row.voteOptionId];
            const color = option?.candidate?.partyColor ?? '#64748b';
            const pct = totalVotes > 0 ? (row.totalVotes / totalVotes) * 100 : 0;

            return (
              <tr key={row.voteOptionId} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 pr-2 font-medium text-muted-foreground">{i + 1}</td>
                <td className="py-2.5 pr-2">
                  <div className="flex items-center gap-2.5">
                    {option?.candidate?.partyLogoUrl ? (
                      <img
                        src={option.candidate.partyLogoUrl}
                        alt=""
                        className="h-7 w-7 shrink-0 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{row.label}</p>
                      {option?.candidate?.partyName && (
                        <p className="truncate text-xs text-muted-foreground">{option.candidate.partyName}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-2 text-right font-semibold tabular-nums">{formatNumber(row.totalVotes)}</td>
                <td className="py-2.5 pr-2 text-right tabular-nums text-muted-foreground">{pct.toFixed(1)}%</td>
                <td className="hidden py-2.5 sm:table-cell">
                  <div className="h-2 w-full max-w-[120px] overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
