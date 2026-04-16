import { useEffect, useMemo, useState } from 'react';
import { loadAndino, colorOfPartido, nombreCorto, type AndinoData } from '../data/andinoSource';
import { Hemicycle, HemicycleLegend, type SeatInfo } from './Hemicycle';
import { SeatCard } from './SeatCard';
import { CandidatePhoto } from './CandidatePhoto';

function buildSeats(data: AndinoData): SeatInfo[] {
  const out: SeatInfo[] = [];
  for (const p of data.partidos) {
    if (p.escanos <= 0) continue;
    const color = colorOfPartido(p.codigo);
    const electos = p.candidatos.filter(c => c.electo);
    for (let i = 0; i < electos.length; i++) {
      const c = electos[i];
      out.push({
        color, partyCodigo: p.codigo, partyName: p.nombre,
        candidatoNombre: c.nombre, candidatoDni: c.dni,
        votosPreferenciales: c.votosPreferenciales,
        distrito: 'Perú',
        orderInParty: i,
        partidoPct: p.pct, partidoVotos: p.votos, partidoEscanos: p.escanos,
      });
    }
  }
  return out;
}

export function AndinoPage() {
  const [data, setData] = useState<AndinoData | null>(null);
  const [seat, setSeat] = useState<SeatInfo | null>(null);

  useEffect(() => {
    let alive = true;
    async function fetchAll() {
      const d = await loadAndino();
      if (alive && d) setData(d);
    }
    fetchAll();
    const id = setInterval(fetchAll, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!data) return <div className="container"><div style={{ padding: 60, textAlign: 'center', color: 'var(--tx3)' }}>Cargando Parlamento Andino…</div></div>;

  const seats = useMemo(() => buildSeats(data), [data]);
  const partidos = data.partidos.map(p => ({ codigo: p.codigo, nombre: p.nombre }));
  const top = data.partidos.slice(0, 12);
  const maxPct = Math.max(...top.map(p => p.pct), 1);
  const partidosConEscanos = data.partidos.filter(p => p.escanos > 0);

  return (
    <div className="container">
      <header className="hero">
        <div className="hero-left">
          <div className="hero-title">Parlamento Andino · 2026</div>
          <div className="hero-sub">5 representantes peruanos · D'Hondt nacional</div>
        </div>
        <div className="hero-center">
          <div className="hero-label">ACTAS CONTABILIZADAS</div>
          <div className="hero-pct" key={data.pctActas}>
            <span className="num-flash">{data.pctActas.toFixed(2).split('.')[0]}</span>
            <span className="hero-pct-sign">.{data.pctActas.toFixed(2).split('.')[1]}%</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 4 }}>
            <span className="live-dot" /> &nbsp; {data.fechaActualizacion} · En vivo
          </div>
        </div>
        <div className="hero-right" />
      </header>

      <div className="card" style={{ marginBottom: 16, padding: 20 }}>
        <div className="card-title" style={{ fontSize: 14 }}>Composición proyectada</div>
        <div className="card-sub">{data.escanosTotales} representantes · click en un asiento para ver al electo</div>
        <Hemicycle seats={seats} total={data.escanosTotales} size="lg" onSeatClick={setSeat} />
        <HemicycleLegend escanos={data.escanos} partidos={partidos} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Ranking nacional</div>
        <div className="card-sub">Top partidos por votos válidos</div>
        <table className="senado-table">
          <thead>
            <tr><th>#</th><th>PARTIDO</th><th>VOTOS</th><th className="tr">%</th><th className="tr">ESCAÑOS</th></tr>
          </thead>
          <tbody>
            {top.map((p, i) => (
              <tr key={p.codigo}>
                <td style={{ color: 'var(--tx3)', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{i + 1}</td>
                <td>
                  <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: colorOfPartido(p.codigo), marginRight: 10, verticalAlign: 'middle', boxShadow: '0 0 0 1px rgba(0,0,0,.06)' }} />
                  <span style={{ fontWeight: 600 }}>{nombreCorto(p.nombre)}</span>
                  <span className="senado-bar">
                    <span className="senado-bar-fill" style={{ width: `${(p.pct / maxPct) * 100}%`, background: colorOfPartido(p.codigo) }} />
                  </span>
                </td>
                <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--tx2)' }}>{p.votos.toLocaleString('es-PE')}</td>
                <td className="tr" style={{ fontWeight: 600, color: colorOfPartido(p.codigo) }}>{p.pct.toFixed(2)}%</td>
                <td className="tr" style={{ fontWeight: 600, fontSize: 15 }}>{p.escanos || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-title">Representantes electos</div>
        <div className="card-sub">Top candidatos por voto preferencial dentro de los partidos con escaños</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginTop: 10 }}>
          {partidosConEscanos.flatMap(p => p.candidatos.filter(c => c.electo).map((c, i) => ({ p, c, i })))
            .sort((a, b) => b.c.votosPreferenciales - a.c.votosPreferenciales)
            .map(({ p, c, i }) => {
              const color = colorOfPartido(p.codigo);
              return (
                <button key={`${p.codigo}-${c.dni || i}`}
                  onClick={() => setSeat({
                    color, partyCodigo: p.codigo, partyName: p.nombre,
                    candidatoNombre: c.nombre, candidatoDni: c.dni,
                    votosPreferenciales: c.votosPreferenciales,
                    distrito: 'Perú', orderInParty: i,
                    partidoPct: p.pct, partidoVotos: p.votos, partidoEscanos: p.escanos,
                  })}
                  className="electo-row" style={{ ['--c' as any]: color }}>
                  <CandidatePhoto dni={c.dni} nombre={c.nombre} color={color} size={36} ring={false} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="electo-nombre">{c.nombre.split(' ').slice(0, 3).join(' ')}</div>
                    <div className="electo-pref" style={{ color }}>{nombreCorto(p.nombre)}</div>
                  </div>
                  <div className="electo-rank">{c.votosPreferenciales >= 1000 ? `${(c.votosPreferenciales / 1000).toFixed(0)}k` : c.votosPreferenciales}</div>
                </button>
              );
            })}
        </div>
      </div>

      {seat && <SeatCard seat={seat} onClose={() => setSeat(null)} />}
    </div>
  );
}
