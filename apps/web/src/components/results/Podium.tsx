import { cn } from '@/lib/utils';
import { formatNumber, formatPercent } from '@/lib/formatting';
import { STATIC_VOTE_OPTIONS } from '@/data/voteOptions';

const optionById: Record<string, (typeof STATIC_VOTE_OPTIONS)[number]> =
  Object.fromEntries(STATIC_VOTE_OPTIONS.map((o) => [o.id, o]));

interface PodiumEntry {
  voteOptionId: string;
  label: string;
  totalVotes: number;
  percentage: number;
}

interface PodiumProps {
  bars: PodiumEntry[];
  totalVotes: number;
}

const PODIUM_CONFIG = [
  { order: 'order-2', height: 'h-40', rank: 1, badge: 'bg-yellow-400 text-yellow-900' },
  { order: 'order-1', height: 'h-28', rank: 2, badge: 'bg-slate-300 text-slate-700' },
  { order: 'order-3', height: 'h-24', rank: 3, badge: 'bg-amber-600 text-amber-50' },
] as const;

export function Podium({ bars, totalVotes }: PodiumProps) {
  const top3 = [...bars].sort((a, b) => b.totalVotes - a.totalVotes).slice(0, 3);

  if (top3.length < 3) return null;

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-5">
      {top3.map((entry, i) => {
        const config = PODIUM_CONFIG[i];
        const option = optionById[entry.voteOptionId];
        const partyColor = option?.candidate?.partyColor ?? '#64748b';
        const photoUrl = option?.candidate?.candidatePhotoUrl;
        const pct = totalVotes > 0 ? (entry.totalVotes / totalVotes) * 100 : 0;

        return (
          <div
            key={entry.voteOptionId}
            className={cn('flex flex-col items-center', config.order)}
          >
            {/* Candidate info above the podium block */}
            <div className="mb-3 flex flex-col items-center gap-1.5">
              {photoUrl && (
                <img
                  src={photoUrl}
                  alt={entry.label}
                  className={cn(
                    'rounded-full border-2 border-white object-cover shadow-md',
                    i === 0 ? 'h-16 w-16' : 'h-12 w-12',
                  )}
                  style={{ borderColor: partyColor }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <p
                className={cn(
                  'max-w-[120px] truncate text-center font-bold text-foreground sm:max-w-[160px]',
                  i === 0 ? 'text-sm' : 'text-xs',
                )}
                title={entry.label}
              >
                {entry.label}
              </p>
              <p className="text-lg font-extrabold tabular-nums" style={{ color: partyColor }}>
                {formatPercent(pct)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatNumber(entry.totalVotes)} votos
              </p>
            </div>

            {/* Podium block */}
            <div
              className={cn(
                'flex w-24 flex-col items-center justify-start rounded-t-xl pt-3 sm:w-32',
                config.height,
              )}
              style={{ backgroundColor: partyColor }}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                  config.badge,
                )}
              >
                {config.rank}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
