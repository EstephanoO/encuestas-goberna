import { useEffect, useMemo, useState } from 'react';
import { loadSenado, colorOfPartido, nombreCorto, type SenadoData, type CandidatoSenado, type PartidoVotos } from '../data/senadoSource';
import { Hemicycle, HemicycleLegend, type SeatInfo } from './Hemicycle';
import { SeatCard } from './SeatCard';
import { SenadoExplorer } from './SenadoExplorer';
import { CandidatePhoto } from './CandidatePhoto';

interface CandSearchResult {
  cand: CandidatoSenado;
  partido: PartidoVotos;
  partyColor: string;
  scope: 'nacional' | string; // 'nacional' o nombre del distrito
  escanosDeLista: number;      // cuántos escaños tiene la lista
  rankInList: number;          // posición por voto preferencial (1-based)
  totalInList: number;         // total candidatos en la lista
  entra: boolean;              // ¿entra con D'Hondt actual?
  margen: number;              // votos de ventaja sobre el último que entra (o gap negativo)
  umbralEntrada: number;       // votos del último que entraría
}

/** Construye seats con candidato real (nombre + DNI) para el Senado Nacional. */
function seatsFromPartyMap(escanos: Record<string, number>, partidos: { codigo: string; nombre: string; candidatos?: number | CandidatoSenado[]; pct?: number; votos?: number }[]): SeatInfo[] {
  const out: SeatInfo[] = [];
  const ordered = partidos
    .map(p => ({ ...p, n: escanos[p.codigo] || 0 }))
    .filter(p => p.n > 0)
    .sort((a, b) => b.n - a.n);
  for (const p of ordered) {
    const clist: CandidatoSenado[] = Array.isArray(p.candidatos) ? p.candidatos : [];
    for (let i = 0; i < p.n; i++) {
      const c = clist[i];
      out.push({
        color: colorOfPartido(p.codigo),
        partyCodigo: p.codigo,
        partyName: p.nombre,
        candidatoNombre: c?.nombre,
        candidatoDni: c?.dni,
        votosPreferenciales: c?.votosPreferenciales,
        orderInParty: i,
        partidoPct: p.pct,
        partidoVotos: p.votos,
        partidoEscanos: p.n,
      });
    }
  }
  return out;
}

type SubTab = 'nacional' | 'regional';

function buildSearchIndex(data: SenadoData): CandSearchResult[] {
  const out: CandSearchResult[] = [];
  // Nacional
  const n = data.nacional;
  for (const p of n.partidos) {
    const cands: CandidatoSenado[] = Array.isArray(p.candidatos) ? p.candidatos : [];
    const sorted = [...cands].sort((a, b) => b.votosPreferenciales - a.votosPreferenciales);
    const seats = n.escanos[p.codigo] || 0;
    sorted.forEach((c, i) => {
      const umbral = seats > 0 && sorted[seats - 1] ? sorted[seats - 1].votosPreferenciales : 0;
      out.push({
        cand: c, partido: p, partyColor: colorOfPartido(p.codigo),
        scope: 'nacional', escanosDeLista: seats,
        rankInList: i + 1, totalInList: sorted.length,
        entra: i < seats, margen: c.votosPreferenciales - umbral,
        umbralEntrada: umbral,
      });
    });
  }
  // Regional
  for (const d of data.regional.distritos) {
    for (const p of d.partidos) {
      const cands = p.candidatosList || (Array.isArray(p.candidatos) ? p.candidatos : []);
      const sorted = [...cands].sort((a, b) => b.votosPreferenciales - a.votosPreferenciales);
      const seats = d.asignacion?.[p.codigo] || 0;
      sorted.forEach((c, i) => {
        const umbral = seats > 0 && sorted[seats - 1] ? sorted[seats - 1].votosPreferenciales : 0;
        out.push({
          cand: c, partido: p, partyColor: colorOfPartido(p.codigo),
          scope: d.nombre, escanosDeLista: seats,
          rankInList: i + 1, totalInList: sorted.length,
          entra: i < seats, margen: c.votosPreferenciales - umbral,
          umbralEntrada: umbral,
        });
      });
    }
  }
  return out;
}

export function SenadoPage() {
  const [data, setData] = useState<SenadoData | null>(null);
  const [sub, setSub] = useState<SubTab>('nacional');
  const [seatSelected, setSeatSelected] = useState<SeatInfo | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    let alive = true;
    async function fetchAll() {
      const d = await loadSenado();
      if (alive && d) setData(d);
    }
    fetchAll();
    const id = setInterval(fetchAll, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const searchIndex = useMemo(() => data ? buildSearchIndex(data) : [], [data]);
  const searchResults = useMemo(() => {
    if (!searchQ.trim() || searchQ.length < 2) return [];
    const q = searchQ.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return searchIndex.filter(r => {
      const name = r.cand.nombre.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const scope = r.scope.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const part = r.partido.nombre.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return name.includes(q) || scope.includes(q) || part.includes(q);
    }).sort((a, b) => (b.entra ? 1 : 0) - (a.entra ? 1 : 0) || b.cand.votosPreferenciales - a.cand.votosPreferenciales).slice(0, 30);
  }, [searchQ, searchIndex]);

  if (!data) {
    return (
      <div className="container">
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--tx3)' }}>
          Cargando datos del Senado…
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="hero">
        <div className="hero-left">
          <div className="hero-title">Senado · Perú 2026</div>
          <div className="hero-sub">60 senadores · {data.nacional.escanosTotales} distrito único + 30 distrital múltiple ({data.regional.distritos.length} distritos)</div>
        </div>
        <div className="hero-center">
          <div className="hero-label">ACTAS CONTABILIZADAS</div>
          <div className="hero-pct" key={data.nacional.pctActas}>
            <span className="num-flash">{data.nacional.pctActas.toFixed(3).split('.')[0]}</span>
            <span className="hero-pct-sign">.{data.nacional.pctActas.toFixed(3).split('.')[1]}%</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 4 }}>
            <span className="live-dot" /> &nbsp; {data.nacional.fechaActualizacion} · En vivo
          </div>
        </div>
        <div className="hero-right" />
      </header>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${sub === 'nacional' ? 'active' : ''}`} onClick={() => setSub('nacional')}>
          Senado Nacional <span style={{ opacity: .5, marginLeft: 4 }}>({data.nacional.escanosTotales})</span>
        </button>
        <button className={`tab ${sub === 'regional' ? 'active' : ''}`} onClick={() => setSub('regional')}>
          Senado Regional <span style={{ opacity: .5, marginLeft: 4 }}>({data.regional.escanosTotales})</span>
        </button>
      </div>

      {/* BUSCADOR DE CANDIDATO */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>🔍</span>
          <input
            value={searchQ} onChange={e => { setSearchQ(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            placeholder="Buscar por candidato, distrito o partido… (ej. Lima, Aliaga, Fuerza Popular)"
            style={{
              flex: 1, padding: '10px 14px', fontSize: 14, background: 'var(--bg-alt)', color: 'var(--tx1)',
              border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'Pontano Sans, Inter, sans-serif', outline: 'none',
            }}
          />
          {searchQ && <button onClick={() => { setSearchQ(''); setShowSearch(false); }} style={{ all: 'unset', cursor: 'pointer', color: 'var(--tx3)', fontSize: 16 }}>✕</button>}
        </div>

        {showSearch && searchQ.length >= 2 && (
          <div style={{ marginTop: 12 }}>
            {searchResults.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
                No se encontró "{searchQ}" en los {searchIndex.length} candidatos disponibles.
                <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--tx3)' }}>
                  ONPE expone solo los ~56 candidatos nacionales con más votos preferenciales.
                  <br />Buscá también por distrito o partido (ej. "Lima", "Fuerza Popular").
                  <br /><a href="https://resultadoelectoral.onpe.gob.pe/main/senadores-distrito-nacional-unico" target="_blank" rel="noopener" style={{ color: 'var(--c-rla)', textDecoration: 'underline' }}>Ver lista completa en ONPE →</a>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 10.5, color: 'var(--tx3)', letterSpacing: 1.2, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                  {searchResults.length} RESULTADO{searchResults.length > 1 ? 'S' : ''}
                </div>
                {searchResults.map((r, idx) => (
                  <CandResultCard key={`${r.cand.dni || idx}-${r.scope}`} result={r} pctActas={data!.nacional.pctActas} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {sub === 'nacional' && <NacionalTab data={data} onSeatClick={setSeatSelected} />}
      {sub === 'regional' && <SenadoExplorer data={data} onSeatClick={setSeatSelected} />}

      {seatSelected && <SeatCard seat={seatSelected} onClose={() => setSeatSelected(null)} />}
    </div>
  );
}

function CandResultCard({ result: r, pctActas }: { result: CandSearchResult; pctActas: number }) {
  const statusColor = r.entra ? '#059669' : r.margen > -500 ? '#d97706' : '#dc2626';
  const statusLabel = r.entra ? '✓ ENTRA' : r.escanosDeLista === 0 ? '✗ PARTIDO SIN ESCAÑOS' : `✗ FUERA (pos ${r.rankInList}/${r.escanosDeLista})`;
  const pctContado = pctActas;
  const proyVotos = pctContado > 10 ? Math.round(r.cand.votosPreferenciales / (pctContado / 100)) : null;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 14, alignItems: 'start',
      padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderLeft: `4px solid ${r.partyColor}`, borderRadius: 10,
    }}>
      <CandidatePhoto dni={r.cand.dni} nombre={r.cand.nombre} color={r.partyColor} size={44} ring={false} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.cand.nombre}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--tx2)', marginTop: 2 }}>
          <span style={{ color: r.partyColor, fontWeight: 600 }}>{nombreCorto(r.partido.nombre)}</span>
          <span style={{ color: 'var(--tx3)', margin: '0 6px' }}>·</span>
          <span>{r.scope === 'nacional' ? '🏛 Senado Nacional' : `📍 ${r.scope}`}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap', fontSize: 11.5 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
            {r.cand.votosPreferenciales.toLocaleString('es-PE')} <span style={{ color: 'var(--tx3)', fontWeight: 500 }}>votos pref.</span>
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            #{r.rankInList} <span style={{ color: 'var(--tx3)' }}>de {r.totalInList}</span>
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {r.escanosDeLista} <span style={{ color: 'var(--tx3)' }}>escaños</span>
          </span>
        </div>
        {/* Barra de progreso hacia el umbral */}
        {r.escanosDeLista > 0 && r.umbralEntrada > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 5, background: 'var(--bg-alt)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${Math.min(100, (r.cand.votosPreferenciales / r.umbralEntrada) * 100)}%`,
                background: r.entra ? 'linear-gradient(90deg, #059669, #34d399)' : 'linear-gradient(90deg, #dc2626, #f87171)',
              }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>
              umbral: {r.umbralEntrada.toLocaleString('es-PE')} votos
              {r.entra
                ? ` · +${r.margen.toLocaleString('es-PE')} de ventaja`
                : ` · le faltan ${Math.abs(r.margen).toLocaleString('es-PE')}`}
            </div>
          </div>
        )}
        {/* Proyección al 100% */}
        {proyVotos && pctContado < 98 && (
          <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--tx2)', fontFamily: 'JetBrains Mono, monospace' }}>
            📊 Al 100% actas: ≈ {proyVotos.toLocaleString('es-PE')} votos pref. (extrapolación lineal)
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          display: 'inline-block', padding: '4px 10px', borderRadius: 6, fontSize: 10.5,
          fontWeight: 800, letterSpacing: .8, fontFamily: 'JetBrains Mono, monospace',
          background: r.entra ? 'rgba(5,150,105,.12)' : r.escanosDeLista === 0 ? 'rgba(148,163,184,.12)' : 'rgba(220,38,38,.12)',
          color: statusColor,
        }}>
          {statusLabel}
        </div>
      </div>
    </div>
  );
}

function NacionalTab({ data, onSeatClick }: { data: SenadoData; onSeatClick: (s: SeatInfo) => void }) {
  const n = data.nacional;
  const pasaValla = n.partidos.filter(p => p.pct >= n.valla);
  const maxPct = Math.max(...n.partidos.map(p => p.pct), 1);
  const nacSeats = useMemo(() => seatsFromPartyMap(n.escanos, n.partidos), [n]);

  return (
    <>
      <div className="card" style={{ marginBottom: 16, padding: '20px 20px 24px' }}>
        <div className="card-title" style={{ fontSize: 14 }}>Distribución proyectada del Senado</div>
        <div className="card-sub">
          Asignación por D'Hondt · valla {n.valla}% · {pasaValla.length} partido{pasaValla.length !== 1 ? 's' : ''} pasa{pasaValla.length === 1 ? '' : 'n'}
        </div>

        <Hemicycle seats={nacSeats} total={n.escanosTotales} size="lg" onSeatClick={onSeatClick} />

        <HemicycleLegend escanos={n.escanos} partidos={n.partidos} />
      </div>

      <div className="card">
        <div className="card-title">Ranking nacional · Distrito Único</div>
        <div className="card-sub">Todos los partidos · D'Hondt · valla {n.valla}% · {n.escanosTotales} escaños</div>
        <table className="senado-table">
          <thead>
            <tr>
              <th>#</th>
              <th>PARTIDO</th>
              <th>VOTOS</th>
              <th className="tr">%</th>
              <th className="tr">ESCAÑOS</th>
            </tr>
          </thead>
          <tbody>
            {n.partidos.map((p, i) => {
              const seats = n.escanos[p.codigo] || 0;
              const dentro = p.pct >= n.valla;
              return (
                <tr key={p.codigo} className={dentro ? '' : 'under-valla'}>
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
                  <td className="tr" style={{ fontWeight: 600, fontSize: 15 }}>{seats || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
