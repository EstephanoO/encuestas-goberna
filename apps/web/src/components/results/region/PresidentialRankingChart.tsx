import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import type { CandidateRanking } from '@/data/surveyResults';

interface PresidentialRankingChartProps {
  candidates: CandidateRanking[];
}

/** Shorten long names (e.g. "Viciado / Blanco / Nulo" → "Viciado") */
function getShortName(name: string): string {
  if (name.includes('/')) return name.split('/')[0].trim();
  const parts = name.split(' ');
  if (parts.length <= 2) return name;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

/** Very short name for mobile vertical bars */
function getMobileName(name: string): string {
  if (name.includes('/')) return name.split('/')[0].trim();
  const parts = name.split(' ');
  return parts[parts.length - 1];
}

type IconType = 'ban' | 'users' | null;

function getIconType(name: string): IconType {
  const lower = name.toLowerCase();
  if (lower.includes('viciado') || lower.includes('blanco') || lower.includes('nulo')) return 'ban';
  if (lower.includes('otros')) return 'users';
  return null;
}

function BanIcon({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }) {
  const r = size / 2;
  const iconR = r * 0.55;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <circle cx={cx} cy={cy} r={iconR} fill="none" stroke="white" strokeWidth={1.8} />
      <line
        x1={cx - iconR * 0.7} y1={cy + iconR * 0.7}
        x2={cx + iconR * 0.7} y2={cy - iconR * 0.7}
        stroke="white" strokeWidth={1.8} strokeLinecap="round"
      />
    </g>
  );
}

function UsersIcon({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }) {
  const r = size / 2;
  const s = size * 0.6;
  const ox = cx - s / 2;
  const oy = cy - s / 2;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <g transform={`translate(${ox},${oy}) scale(${s / 24})`}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="4" fill="none" stroke="white" strokeWidth={2.2} />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  );
}

/** Custom Y-axis tick for desktop horizontal bars */
function CandidateTick({
  x, y, payload, data,
}: {
  x: number; y: number;
  payload: { value: string };
  data: ChartEntry[];
}) {
  const entry = data.find((d) => d.shortName === payload.value);
  if (!entry) return null;

  const imgSize = 28;
  const gap = 6;
  const iconCx = -90 - gap - imgSize / 2;

  return (
    <g transform={`translate(${x},${y})`}>
      {entry.photoUrl ? (
        <foreignObject x={-imgSize - gap - 90} y={-imgSize / 2} width={imgSize} height={imgSize}>
          <img
            src={entry.photoUrl}
            alt={entry.name}
            style={{ width: imgSize, height: imgSize, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${entry.color}` }}
          />
        </foreignObject>
      ) : entry.iconType === 'ban' ? (
        <BanIcon cx={iconCx} cy={0} size={imgSize} color={entry.color} />
      ) : entry.iconType === 'users' ? (
        <UsersIcon cx={iconCx} cy={0} size={imgSize} color={entry.color} />
      ) : (
        <circle cx={iconCx} cy={0} r={imgSize / 2} fill={entry.color} />
      )}
      <text x={-gap} y={0} textAnchor="end" dominantBaseline="central" fontSize={12} fontWeight={600} fill="#334155">
        {payload.value}
      </text>
    </g>
  );
}

/** Custom X-axis tick for mobile vertical bars — photo + name below */
function MobileCandidateTick({
  x, y, payload, data,
}: {
  x: number; y: number;
  payload: { value: string };
  data: ChartEntry[];
}) {
  const entry = data.find((d) => d.mobileName === payload.value);
  if (!entry) return null;

  const imgSize = 24;

  return (
    <g transform={`translate(${x},${y})`}>
      {entry.photoUrl ? (
        <foreignObject x={-imgSize / 2} y={8} width={imgSize} height={imgSize}>
          <img
            src={entry.photoUrl}
            alt={entry.name}
            style={{ width: imgSize, height: imgSize, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${entry.color}` }}
          />
        </foreignObject>
      ) : entry.iconType === 'ban' ? (
        <BanIcon cx={0} cy={8 + imgSize / 2} size={imgSize} color={entry.color} />
      ) : entry.iconType === 'users' ? (
        <UsersIcon cx={0} cy={8 + imgSize / 2} size={imgSize} color={entry.color} />
      ) : (
        <circle cx={0} cy={8 + imgSize / 2} r={imgSize / 2} fill={entry.color} />
      )}
      <text x={0} y={imgSize + 20} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={600} fill="#334155">
        {payload.value}
      </text>
    </g>
  );
}

interface ChartEntry {
  name: string;
  shortName: string;
  mobileName: string;
  percentage: number;
  color: string;
  photoUrl?: string;
  iconType: IconType;
}

export function PresidentialRankingChart({ candidates }: PresidentialRankingChartProps) {
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => b.percentage - a.percentage);

  const data: ChartEntry[] = sorted.map((c) => ({
    name: c.name,
    shortName: getShortName(c.name),
    mobileName: getMobileName(c.name),
    percentage: c.percentage,
    color: c.color,
    photoUrl: c.photoUrl,
    iconType: getIconType(c.name),
  }));

  const desktopHeight = Math.max(280, data.length * 52);
  const mobileHeight = 280;

  return (
    <section className="mx-2 space-y-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:mx-0 sm:p-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Ranking Presidencial</h3>
        <p className="text-xs text-muted-foreground">
          Intenci&oacute;n de voto departamental &middot; Encuesta de opini&oacute;n
        </p>
      </div>

      {/* Desktop: horizontal bars */}
      <div className="hidden sm:block">
        <ResponsiveContainer width="100%" height={desktopHeight}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis
              type="number" domain={[0, 'auto']}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              type="category" dataKey="shortName" width={120}
              tick={<CandidateTick x={0} y={0} payload={{ value: '' }} data={data} />}
              axisLine={false} tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [`${value}%`, 'Intención de voto']}
              labelFormatter={(label: string) => data.find((d) => d.shortName === label)?.name ?? label}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            />
            <Bar dataKey="percentage" radius={[0, 6, 6, 0]} maxBarSize={32} animationDuration={800}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
              <LabelList dataKey="percentage" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 12, fontWeight: 700, fill: '#334155' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Mobile: vertical bars */}
      <div className="sm:hidden">
        <ResponsiveContainer width="100%" height={mobileHeight}>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 50, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              type="category" dataKey="mobileName"
              tick={<MobileCandidateTick x={0} y={0} payload={{ value: '' }} data={data} />}
              axisLine={false} tickLine={false}
              interval={0} height={60}
            />
            <YAxis
              type="number" domain={[0, 'auto']}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false} tickLine={false}
              width={35}
            />
            <Tooltip
              formatter={(value: number) => [`${value}%`, 'Intención de voto']}
              labelFormatter={(label: string) => data.find((d) => d.mobileName === label)?.name ?? label}
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            />
            <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={36} animationDuration={800}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
              <LabelList dataKey="percentage" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fontWeight: 700, fill: '#334155' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
