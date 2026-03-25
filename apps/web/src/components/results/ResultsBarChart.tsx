import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatNumber } from '@/lib/formatting';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarChart2 } from 'lucide-react';
import { STATIC_VOTE_OPTIONS } from '@/data/voteOptions';
import type { ResultsBarItem } from '@encuesta/shared-types';

interface ResultsBarChartProps {
  bars: ResultsBarItem[];
  loading?: boolean;
}

const FALLBACK_COLOR = '#64748b';

const optionMap: Record<string, (typeof STATIC_VOTE_OPTIONS)[number]> = Object.fromEntries(
  STATIC_VOTE_OPTIONS.map((o) => [o.id, o]),
);

function getShortLabel(label: string): string {
  const parts = label.split(' ');
  return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : label;
}

function LogoTick({ x, y, payload, data }: { x: number; y: number; payload: { value: string }; data: { shortLabel: string; logoUrl: string | null }[] }) {
  const entry = data.find((d) => d.shortLabel === payload.value);
  const logoUrl = entry?.logoUrl;
  const size = 22;

  return (
    <g transform={`translate(${x},${y + 4})`}>
      {logoUrl ? (
        <foreignObject x={-size / 2} y={0} width={size} height={size}>
          <img
            src={logoUrl}
            alt={payload.value}
            style={{ width: size, height: size, objectFit: 'contain' }}
          />
        </foreignObject>
      ) : (
        <text x={0} y={size / 2 + 4} textAnchor="middle" fontSize={8} fill="#64748b">
          {payload.value.charAt(0)}
        </text>
      )}
    </g>
  );
}

export function ResultsBarChart({ bars, loading }: ResultsBarChartProps) {
  if (loading) return <Skeleton className="h-64 rounded-xl" />;

  if (bars.length === 0) {
    return (
      <EmptyState
        title="Aun no hay votos"
        description="Los resultados apareceran aqui en tiempo real."
        icon={<BarChart2 className="h-8 w-8" />}
      />
    );
  }

  const sorted = [...bars]
    .sort((a, b) => b.totalVotes - a.totalVotes)
    .slice(0, 10)
    .map((item) => ({
      ...item,
      shortLabel: getShortLabel(item.label),
      logoUrl: optionMap[item.voteOptionId]?.candidate?.partyLogoUrl ?? null,
      color: optionMap[item.voteOptionId]?.candidate?.partyColor ?? FALLBACK_COLOR,
    }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={sorted} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="shortLabel"
          tick={<LogoTick x={0} y={0} payload={{ value: '' }} data={sorted} />}
          height={36}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 10 }}
          tickFormatter={(v: number) => formatNumber(v)}
          width={45}
        />
        <Tooltip
          formatter={(value: number) => [`${formatNumber(value)} votos`, 'Total']}
          labelFormatter={(label: string) => label}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar dataKey="totalVotes" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {sorted.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
