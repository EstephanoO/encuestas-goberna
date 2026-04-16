import { useEffect, useState } from 'react';
import { colorOfPartido, nombreCorto } from '../data/senadoSource';

interface Eleccion {
  key: string;
  nombre: string;
  apiUrl: string;
  pctActas?: number;
  totalVotosEmitidos?: number;
  totalVotosValidos?: number;
  blanco?: number;     // votos
  nulo?: number;       // votos
  blancoNuloPct?: number; // % sobre votos emitidos
  partidos?: Array<{ codigo: string; nombre: string; pct: number; votos: number }>;
}

const ELECCIONES_CFG: Eleccion[] = [
  { key: 'pres',  nombre: 'Presidencial',     apiUrl: '/api/onpe' },
  { key: 'sen-u', nombre: 'Senado Único',     apiUrl: '/api/senadores' },
  { key: 'dip',   nombre: 'Diputados',        apiUrl: '/api/diputados' },
  { key: 'andino',nombre: 'Parlamento Andino',apiUrl: '/api/andino' },
];

async function fetchAll(): Promise<Eleccion[]> {
  const out: Eleccion[] = [];
  for (const e of ELECCIONES_CFG) {
    try {
      const r = await fetch(`${e.apiUrl}?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) { out.push({ ...e }); continue; }
      const d = await r.json();
      // Cada API tiene shape distinto — extraemos lo común
      let pctActas, totalVotosEmitidos, totalVotosValidos;
      let partidos: any[] = [];

      if (e.key === 'pres') {
        pctActas = d.pctActas;
        totalVotosEmitidos = d.votosEmitidos;
        totalVotosValidos = Object.values(d.votes || {}).reduce((a: number, b: any) => a + (b || 0), 0);
        // pres no tiene voto blanco/nulo en projection — pero sí en el endpoint original.
        // Como mirror, si no lo tenemos, dejamos 0.
        partidos = Object.entries(d.projection || {}).map(([k, pct]) => ({
          codigo: { fujimori: '8', rla: '35', sanchez: '10', nieto: '16', belmont: '14' }[k] || '0',
          nombre: { fujimori: 'FUERZA POPULAR', rla: 'RENOVACIÓN POPULAR', sanchez: 'JUNTOS POR EL PERÚ', nieto: 'PARTIDO DEL BUEN GOBIERNO', belmont: 'PARTIDO CÍVICO OBRAS' }[k] || k,
          pct: pct as number,
          votos: d.votes?.[k] || 0,
        }));
      } else if (e.key === 'sen-u') {
        pctActas = d.nacional?.pctActas;
        totalVotosEmitidos = d.nacional?.votosEmitidos;
        totalVotosValidos = d.nacional?.totalVotosValidos;
        partidos = (d.nacional?.partidos || []).map((p: any) => ({ codigo: p.codigo, nombre: p.nombre, pct: p.pct, votos: p.votos }));
      } else if (e.key === 'dip') {
        // Diputados es por distrito; agregamos votos
        const dists = d.distritos || [];
        let votosTot = 0; let validos = 0;
        dists.forEach((di: any) => { votosTot += di.votosEmitidos || 0; validos += di.totalVotosValidos || 0; });
        totalVotosEmitidos = votosTot;
        totalVotosValidos = validos;
        const totActas = dists.reduce((s: number, x: any) => s + (x.actasTotal || 0), 0);
        const revActas = dists.reduce((s: number, x: any) => s + (x.actasRevisadas || 0), 0);
        pctActas = totActas ? (revActas / totActas) * 100 : 0;
        // Sumar votos por partido
        const sumByCod: Record<string, { nombre: string; votos: number }> = {};
        dists.forEach((di: any) => {
          (di.partidos || []).forEach((p: any) => {
            const c = String(Number(p.codigo));
            if (!sumByCod[c]) sumByCod[c] = { nombre: p.nombre, votos: 0 };
            sumByCod[c].votos += p.votos || 0;
          });
        });
        const totV = Object.values(sumByCod).reduce((a, b) => a + b.votos, 0) || 1;
        partidos = Object.entries(sumByCod).map(([codigo, v]) => ({ codigo, nombre: v.nombre, votos: v.votos, pct: (v.votos / totV) * 100 }));
      } else if (e.key === 'andino') {
        pctActas = d.pctActas;
        totalVotosEmitidos = d.votosEmitidos;
        totalVotosValidos = d.totalVotosValidos;
        partidos = (d.partidos || []).map((p: any) => ({ codigo: p.codigo, nombre: p.nombre, pct: p.pct, votos: p.votos }));
      }

      // blanco/nulo: votos emitidos - votos válidos = blanco + nulo
      let blancoNuloPct = 0;
      if (totalVotosEmitidos && totalVotosValidos) {
        blancoNuloPct = ((totalVotosEmitidos - totalVotosValidos) / totalVotosEmitidos) * 100;
      }

      partidos.sort((a, b) => b.pct - a.pct);
      out.push({ ...e, pctActas, totalVotosEmitidos, totalVotosValidos, blancoNuloPct, partidos });
    } catch {
      out.push({ ...e });
    }
  }
  return out;
}

export function InsightsRow() {
  const [data, setData] = useState<Eleccion[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchAll().then(d => { if (alive) setData(d); });
    const id = setInterval(() => fetchAll().then(d => { if (alive) setData(d); }), 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!data) return null;

  // Top 6 partidos cross-elección (por suma de votos en todas las elecciones donde aparecen)
  const partyTotals: Record<string, { nombre: string; total: number; byEleccion: Record<string, number> }> = {};
  data.forEach(e => {
    e.partidos?.forEach(p => {
      if (!partyTotals[p.codigo]) partyTotals[p.codigo] = { nombre: p.nombre, total: 0, byEleccion: {} };
      partyTotals[p.codigo].total += p.votos || 0;
      partyTotals[p.codigo].byEleccion[e.key] = p.pct;
    });
  });
  const topPartidos = Object.entries(partyTotals)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }} className="insights-grid">
      {/* Card 1: voto blanco/nulo por elección */}
      <div className="card" style={{ padding: 16 }}>
        <div className="card-title">Voto blanco + nulo por elección</div>
        <div className="card-sub">% de votos no asignados a partido sobre votos emitidos</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {data.map(e => {
            const pct = e.blancoNuloPct || 0;
            const color = pct > 25 ? '#E04848' : pct > 15 ? '#E89A3A' : pct > 8 ? '#F5C400' : '#2ECDA7';
            return (
              <div key={e.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ fontWeight: 500, color: 'var(--tx1)' }}>{e.nombre}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color }}>
                    {pct.toFixed(2)}%
                    <span style={{ color: 'var(--tx3)', marginLeft: 6, fontSize: 10 }}>· actas {(e.pctActas || 0).toFixed(1)}%</span>
                  </span>
                </div>
                <div style={{ height: 7, background: 'var(--bg-alt)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, pct * 2)}%`, background: color, borderRadius: 4, transition: 'width .5s' }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14, fontSize: 11, color: 'var(--tx3)', lineHeight: 1.4 }}>
          El voto andino tiene el mayor porcentaje de blanco/nulo: la gente vota sin saber a quién por el desconocimiento de candidatos al parlamento subregional.
        </div>
      </div>

      {/* Card 2: comparativo cruzado de partidos por elección */}
      <div className="card" style={{ padding: 16 }}>
        <div className="card-title">Comparativo de partidos por elección</div>
        <div className="card-sub">% del partido en cada cámara — revela el "voto separado"</div>
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="senado-table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 130 }}>PARTIDO</th>
                {data.map(e => (
                  <th key={e.key} className="tr" style={{ minWidth: 60 }}>{e.nombre.split(' ').pop()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topPartidos.map(([codigo, info]) => {
                const color = colorOfPartido(codigo);
                return (
                  <tr key={codigo}>
                    <td>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: color, marginRight: 6, verticalAlign: 'middle' }} />
                      <span style={{ fontWeight: 600, fontSize: 11 }}>{nombreCorto(info.nombre)}</span>
                    </td>
                    {data.map(e => {
                      const pct = info.byEleccion[e.key];
                      return (
                        <td key={e.key} className="tr" style={{ fontFamily: 'JetBrains Mono', color: pct ? color : 'var(--tx3)', fontWeight: pct ? 600 : 400 }}>
                          {pct != null ? `${pct.toFixed(1)}%` : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
