import { useEffect, useState } from 'react';

const CAND_COLORS: Record<string, string> = {
  fujimori: '#EF6C00', rla: '#003DA5', sanchez: '#C62828', nieto: '#FF8F00', belmont: '#2ECC71',
};
const CAND_SHORT: Record<string, string> = {
  fujimori: 'Fujimori', rla: 'López A.', sanchez: 'Sánchez', nieto: 'Nieto', belmont: 'Belmont',
};

interface MonitorData {
  current: {
    pctActas: number;
    actasContab: number;
    actasTotal: number;
    actasFaltantes: number;
    ranking: string[];
    pcts: Record<string, number>;
    votos: Record<string, number>;
    gap12: { keys: string[]; pct: number; votos: number };
    gap23: { keys: string[]; pct: number; votos: number };
  };
  delta: {
    dtMin: number;
    newActas: number;
    actasPerMin: number;
    newVotos: number;
    voteDelta: Record<string, { votos: number; pct: number }>;
    gap12Trend: number;
    gap23Trend: number;
    gap23CloseMin: number | null;
    etaMin: number | null;
    positionChanged: boolean;
  } | null;
  velocityChart: { ts: string; actasPerMin: number; gap23: number; gap12: number }[];
  regionDeltas: { name: string; dPct: number; dActas: number }[];
  updatedAt: string;
}

function fmtN(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString('es-PE');
}

function fmtEta(min: number | null | undefined): string {
  if (!min || min <= 0) return '—';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

export function MonitorPresidencial() {
  const [data, setData] = useState<MonitorData | null>(null);

  useEffect(() => {
    const load = () => fetch('/api/monitor').then(r => r.ok ? r.json() : null).then(d => { if (d) setData(d); });
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!data?.current) return null;

  const { current: c, delta: d, velocityChart: vc, regionDeltas: rd } = data;
  const [first, second, third] = c.ranking;

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', boxShadow: '0 0 0 3px rgba(5,150,105,.2)', animation: 'pulse 2s infinite' }} />
        <div className="card-title" style={{ margin: 0 }}>Monitor Presidencial</div>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
          cada 2 min · {c.pctActas.toFixed(2)}% contado
        </span>
      </div>

      {/* KPIs row */}
      {d && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KPI label="NUEVAS ACTAS" value={`+${fmtN(d.newActas)}`} sub={`${d.actasPerMin}/min`} color="#0891b2" />
          <KPI label="NUEVOS VOTOS" value={`+${fmtN(d.newVotos)}`} sub={`en ${d.dtMin.toFixed(0)}min`} color="#7c3aed" />
          <KPI label="ACTAS RESTANTES" value={fmtN(c.actasFaltantes)} sub={`ETA: ${fmtEta(d.etaMin)}`} color="#dc2626" />
          <KPI label="VELOCIDAD" value={`${d.actasPerMin}`} sub="actas/min" color="#059669" />
        </div>
      )}

      {/* Gaps */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <GapCard
          label="BRECHA 1° vs 2°"
          a={first} b={second}
          votos={c.gap12.votos} pct={c.gap12.pct}
          trend={d?.gap12Trend}
        />
        <GapCard
          label="BRECHA 2° vs 3°"
          a={second} b={third}
          votos={c.gap23.votos} pct={c.gap23.pct}
          trend={d?.gap23Trend}
          closeMin={d?.gap23CloseMin}
          critical
        />
      </div>

      {/* Per-candidate deltas */}
      {d && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>
            VARIACIÓN ÚLTIMA LECTURA
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {c.ranking.map(k => {
              const vd = d.voteDelta[k];
              if (!vd) return null;
              const up = vd.pct >= 0;
              return (
                <div key={k} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px', borderRadius: 8,
                  background: `${CAND_COLORS[k]}0a`,
                  border: `1px solid ${CAND_COLORS[k]}22`,
                  fontSize: 11.5, fontFamily: 'JetBrains Mono, monospace',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: CAND_COLORS[k] }} />
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{CAND_SHORT[k]}</span>
                  <span style={{ color: up ? '#059669' : '#dc2626', fontWeight: 700 }}>
                    {up ? '▲' : '▼'} {Math.abs(vd.pct).toFixed(3)}pp
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: 10 }}>+{fmtN(vd.votos)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Velocity mini chart (text-based sparkline) */}
      {vc.length > 3 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>
            VELOCIDAD DE CONTEO (últimas lecturas)
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
            {vc.slice(-30).map((v, i) => {
              const max = Math.max(...vc.slice(-30).map(x => x.actasPerMin), 1);
              const h = Math.max(2, (v.actasPerMin / max) * 36);
              return (
                <div key={i} style={{
                  flex: 1, height: h, borderRadius: 2,
                  background: v.actasPerMin > max * 0.7 ? '#059669' : v.actasPerMin > max * 0.3 ? '#0891b2' : '#94a3b8',
                  transition: 'height .3s',
                }} title={`${v.actasPerMin}/min`} />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', marginTop: 3 }}>
            <span>{vc.length > 30 ? '' : ''}{new Date(vc[Math.max(0, vc.length - 30)].ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' })}</span>
            <span>{new Date(vc[vc.length - 1].ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' })}</span>
          </div>
        </div>
      )}

      {/* Gap 2-3 trend chart */}
      {vc.length > 3 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>
            EVOLUCIÓN BRECHA 2°-3° ({CAND_SHORT[second]} vs {CAND_SHORT[third]})
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
            {vc.slice(-30).map((v, i) => {
              const max = Math.max(...vc.slice(-30).map(x => x.gap23), 1);
              const min = Math.min(...vc.slice(-30).map(x => x.gap23));
              const range = max - min || 1;
              const h = Math.max(2, ((v.gap23 - min) / range) * 36);
              const closing = i > 0 && v.gap23 < vc[Math.max(0, vc.length - 30 + i - 1)]?.gap23;
              return (
                <div key={i} style={{
                  flex: 1, height: h, borderRadius: 2,
                  background: closing ? '#dc2626' : '#059669',
                  transition: 'height .3s',
                }} title={`${fmtN(v.gap23)} votos`} />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', marginTop: 3 }}>
            <span>{fmtN(vc[Math.max(0, vc.length - 30)].gap23)} votos</span>
            <span>{fmtN(vc[vc.length - 1].gap23)} votos</span>
          </div>
        </div>
      )}

      {/* Top regions with new actas */}
      {rd.length > 0 && (
        <div>
          <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>
            DEPARTAMENTOS CON MÁS ACTAS NUEVAS
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {rd.slice(0, 6).map(r => (
              <span key={r.name} style={{
                fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace',
                padding: '3px 8px', borderRadius: 6,
                background: '#f1f5f9', color: '#334155',
              }}>
                {r.name} <strong style={{ color: '#0891b2' }}>+{r.dActas}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Position change alert */}
      {d?.positionChanged && (
        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 8,
          background: '#fef2f2', border: '1px solid #fecaca',
          fontSize: 12, fontWeight: 700, color: '#dc2626',
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5,
        }}>
          ⚠ CAMBIO DE POSICIÓN DETECTADO
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: `${color}08`, border: `1px solid ${color}18` }}>
      <div style={{ fontSize: 9, letterSpacing: 1.2, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function GapCard({ label, a, b, votos, pct, trend, closeMin, critical }: {
  label: string; a: string; b: string; votos: number; pct: number;
  trend?: number; closeMin?: number | null; critical?: boolean;
}) {
  const closing = (trend ?? 0) < 0;
  const trendColor = closing ? '#dc2626' : '#059669';
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: critical && closing ? '#fef2f2' : '#f8fafc',
      border: `1px solid ${critical && closing ? '#fecaca' : 'rgba(15,23,42,.06)'}`,
    }}>
      <div style={{ fontSize: 9, letterSpacing: 1.2, fontWeight: 700, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#0f172a' }}>{fmtN(votos)}</span>
        <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>votos</span>
      </div>
      <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
        {pct.toFixed(3)}pp · <span style={{ color: CAND_COLORS[a], fontWeight: 700 }}>{CAND_SHORT[a]}</span> vs <span style={{ color: CAND_COLORS[b], fontWeight: 700 }}>{CAND_SHORT[b]}</span>
      </div>
      {typeof trend === 'number' && trend !== 0 && (
        <div style={{ fontSize: 10, color: trendColor, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
          {closing ? '▼ cerrándose' : '▲ abriéndose'} ({trend > 0 ? '+' : ''}{fmtN(trend)} votos)
          {closeMin ? ` · ~${fmtEta(closeMin)} para empate` : ''}
        </div>
      )}
    </div>
  );
}
