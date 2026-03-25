import { Users, Trophy, Clock } from 'lucide-react';
import { formatNumber, formatPercent, formatTime } from '@/lib/formatting';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ResultsSummary } from '@encuesta/shared-types';

interface ResultsSummaryCardsProps {
  summary: ResultsSummary | null;
  loading?: boolean;
}

export function ResultsSummaryCards({
  summary,
  loading,
}: ResultsSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SummaryCard
        icon={<Users className="h-5 w-5" />}
        label="Total de votos"
        value={summary ? formatNumber(summary.totalVotes) : '—'}
      />
      <SummaryCard
        icon={<Trophy className="h-5 w-5" />}
        label="Opción líder"
        value={summary?.leader?.label ?? '—'}
        sub={summary?.leader ? formatPercent(summary.leader.percentage) : undefined}
      />
      <SummaryCard
        icon={<Clock className="h-5 w-5" />}
        label="Última actualización"
        value={summary ? formatTime(summary.updatedAt) : '—'}
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}
