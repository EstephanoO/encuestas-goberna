import { useEffect, useMemo, useState } from 'react';
import {
  loadDiputados, colorOfPartido, nombreCorto,
  type DiputadosData, type DistritoDiputados, type CandidatoElecto, type PartidoDiputados,
} from '../data/diputadosSource';
import { Hemicycle, HemicycleLegend, type SeatInfo } from './Hemicycle';
import { SeatCard } from './SeatCard';
import { MapExplorer } from './MapExplorer';
import { MapaDiputados } from './MapaDiputados';
import { CandidatePhoto } from './CandidatePhoto';

interface DipSearchResult {
  cand: CandidatoElecto;
  partido: PartidoDiputados;
  partyColor: string;
  distrito: string;
  escanosDeLista: number;
  rankInList: number;
  totalInList: number;
  entra: boolean;
  margen: number;
  umbralEntrada: number;
}

function buildDipSearchIndex(data: DiputadosData): DipSearchResult[] {
  const out: DipSearchResult[] = [];
  for (const d of data.distritos) {
    for (const p of d.partidos) {
      const sorted = [...p.candidatos].sort((a, b) => b.votosPreferenciales - a.votosPreferenciales);
      const seats = p.escanos || 0;
      sorted.forEach((c, i) => {
        const umbral = seats > 0 && sorted[seats - 1] ? sorted[seats - 1].votosPreferenciales : 0;
        out.push({
          cand: c, partido: p, partyColor: colorOfPartido(p.codigo),
          distrito: d.nombre, escanosDeLista: seats,
          rankInList: i + 1, totalInList: sorted.length,
          entra: c.electo || i < seats,
          margen: c.votosPreferenciales - umbral,
          umbralEntrada: umbral,
        });
      });
    }
  }
  return out;
}

type SubTab = 'nacional' | 'distritos' | 'mapa';


function buildSeatsFromDistrito(d: DistritoDiputados): SeatInfo[] {
  const seats: SeatInfo[] = [];
  for (const p of d.partidos) {
    if (p.escanos <= 0) continue;
    const color = colorOfPartido(p.codigo);
    const electos = p.candidatos.filter(c => c.electo);
    for (let i = 0; i < electos.length; i++) {
      const c = electos[i];
      seats.push({
        color,
        partyCodigo: p.codigo,
        partyName: p.nombre,
        candidatoNombre: c.nombre,
        candidatoDni: c.dni,
        votosPreferenciales: c.votosPreferenciales,
        distrito: d.nombre,
        orderInParty: i,
        partidoPct: p.pct,
        partidoVotos: p.votos,
        partidoEscanos: p.escanos,
      });
    }
  }
  return seats;
}

function buildSeatsNacional(data: DiputadosData): SeatInfo[] {
  const all: SeatInfo[] = [];
  for (const d of data.distritos) {
    all.push(...buildSeatsFromDistrito(d));
  }
  return all;
}

export function DiputadosPage() {
  const [data, setData] = useState<DiputadosData | null>(null);
  const [sub, setSub] = useState<SubTab>('nacional');
  const [seatSelected, setSeatSelected] = useState<SeatInfo | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    let alive = true;
    async function fetchAll() {
      const d = await loadDiputados();
      if (alive && d) setData(d);
    }
    fetchAll();
    const id = setInterval(fetchAll, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const searchIndex = useMemo(() => data ? buildDipSearchIndex(data) : [], [data]);
  const searchResults = useMemo(() => {
    if (!searchQ.trim() || searchQ.length < 2) return [];
    const q = searchQ.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return searchIndex.filter(r => {
      const name = r.cand.nombre.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const dist = r.distrito.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const part = r.partido.nombre.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return name.includes(q) || dist.includes(q) || part.includes(q);
    }).sort((a, b) => (b.entra ? 1 : 0) - (a.entra ? 1 : 0) || b.cand.votosPreferenciales - a.cand.votosPreferenciales).slice(0, 30);
  }, [searchQ, searchIndex]);

  if (!data) {
    return (
      <div className="container">
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--tx3)' }}>
          Cargando datos de Diputados…
        </div>
      </div>
    );
  }

  const totActas = data.distritos.reduce((s, d) => s + d.actasTotal, 0);
  const revActas = data.distritos.reduce((s, d) => s + d.actasRevisadas, 0);
  const pctActas = totActas ? (revActas / totActas) * 100 : 0;

  return (
    <div className="container">
      <header className="hero">
        <div className="hero-left">
          <div className="hero-title">Cámara de Diputados · 2026</div>
          <div className="hero-sub">Congreso Bicameral · voto preferencial · D'Hondt por distrito</div>
        </div>
        <div className="hero-center">
          <div className="hero-label">ACTAS CONTABILIZADAS</div>
          <div className="hero-pct" key={pctActas.toFixed(2)}>
            <span className="num-flash">{pctActas.toFixed(2).split('.')[0]}</span>
            <span className="hero-pct-sign">.{pctActas.toFixed(2).split('.')[1]}%</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 4 }}>
            <span className="live-dot" /> &nbsp; {data.totalEscanos} escaños · {data.distritos.length} distritos · En vivo
          </div>
        </div>
        <div className="hero-right" />
      </header>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${sub === 'nacional' ? 'active' : ''}`} onClick={() => setSub('nacional')}>
          Vista Nacional
        </button>
        <button className={`tab ${sub === 'distritos' ? 'active' : ''}`} onClick={() => setSub('distritos')}>
          Por Distrito Electoral <span style={{ opacity: .5, marginLeft: 4 }}>({data.distritos.length})</span>
        </button>
        <button className={`tab ${sub === 'mapa' ? 'active' : ''}`} onClick={() => setSub('mapa')}>
          Mapa Electoral
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>🔍</span>
          <input
            value={searchQ} onChange={e => { setSearchQ(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            placeholder="Buscar por candidato, distrito o partido… (ej. Áncash, Aliaga, Fuerza Popular)"
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
                No se encontraron candidatos con "{searchQ}"
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 10.5, color: 'var(--tx3)', letterSpacing: 1.2, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                  {searchResults.length} RESULTADO{searchResults.length > 1 ? 'S' : ''}
                </div>
                {searchResults.map((r, idx) => {
                  const statusColor = r.entra ? '#059669' : r.escanosDeLista === 0 ? '#94a3b8' : '#dc2626';
                  const statusLabel = r.entra ? '✓ ENTRA' : r.escanosDeLista === 0 ? '✗ SIN ESCAÑOS' : `✗ FUERA (#${r.rankInList}/${r.escanosDeLista})`;
                  return (
                    <div key={`${r.cand.dni || idx}-${r.distrito}`} style={{
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
                          <span>📍 {r.distrito}</span>
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
                              {r.entra ? ` · +${r.margen.toLocaleString('es-PE')} ventaja` : ` · faltan ${Math.abs(r.margen).toLocaleString('es-PE')}`}
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{
                        display: 'inline-block', padding: '4px 10px', borderRadius: 6, fontSize: 10.5,
                        fontWeight: 800, letterSpacing: .8, fontFamily: 'JetBrains Mono, monospace',
                        background: r.entra ? 'rgba(5,150,105,.12)' : 'rgba(220,38,38,.12)', color: statusColor,
                      }}>
                        {statusLabel}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {sub === 'nacional' && <NacionalTab data={data} onSeatClick={setSeatSelected} />}
      {sub === 'distritos' && <MapExplorer data={data} onSeatClick={setSeatSelected} />}
      {sub === 'mapa' && <MapaDiputados data={data} />}

      {seatSelected && <SeatCard seat={seatSelected} onClose={() => setSeatSelected(null)} />}
    </div>
  );
}

function NacionalTab({ data, onSeatClick }: { data: DiputadosData; onSeatClick: (s: SeatInfo) => void }) {
  const top = data.resumenPartidos;
  const escanos: Record<string, number> = {};
  data.resumenPartidos.forEach(p => { escanos[p.codigo] = p.escanos; });
  const partidos = data.resumenPartidos.map(p => ({ codigo: p.codigo, nombre: p.nombre }));
  const seats = useMemo(() => buildSeatsNacional(data), [data]);

  const votosNacional: Record<string, number> = {};
  data.distritos.forEach(d => {
    d.partidos.forEach(p => {
      votosNacional[p.codigo] = (votosNacional[p.codigo] || 0) + p.votos;
    });
  });
  const totalNac = Object.values(votosNacional).reduce((a, b) => a + b, 0) || 1;
  const maxPct = Math.max(...top.map(t => ((votosNacional[t.codigo] || 0) / totalNac) * 100), 1);

  return (
    <>
      <div className="card" style={{ marginBottom: 16, padding: '20px' }}>
        <div className="card-title" style={{ fontSize: 14 }}>Composición proyectada de la Cámara</div>
        <div className="card-sub">
          {data.totalEscanos} escaños · click en un asiento para ver al diputado electo
        </div>
        <Hemicycle seats={seats} total={data.totalEscanos} size="lg" onSeatClick={onSeatClick} />
        <HemicycleLegend escanos={escanos} partidos={partidos} />
      </div>

      <div className="card">
        <div className="card-title">Ranking nacional</div>
        <div className="card-sub">Top partidos por escaños proyectados · suma de votos en los 27 distritos</div>
        <table className="senado-table">
          <thead>
            <tr>
              <th>#</th><th>PARTIDO</th><th>VOTOS TOTALES</th><th className="tr">%</th><th className="tr">ESCAÑOS</th>
            </tr>
          </thead>
          <tbody>
            {top.map((p, i) => {
              const votos = votosNacional[p.codigo] || 0;
              const pct = (votos / totalNac) * 100;
              return (
                <tr key={p.codigo}>
                  <td style={{ color: 'var(--tx3)', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{i + 1}</td>
                  <td>
                    <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: colorOfPartido(p.codigo), marginRight: 10, verticalAlign: 'middle', boxShadow: '0 0 0 1px rgba(0,0,0,.06)' }} />
                    <span style={{ fontWeight: 600 }}>{nombreCorto(p.nombre)}</span>
                    <span className="senado-bar">
                      <span className="senado-bar-fill" style={{ width: `${(pct / maxPct) * 100}%`, background: colorOfPartido(p.codigo) }} />
                    </span>
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--tx2)' }}>{votos.toLocaleString('es-PE')}</td>
                  <td className="tr" style={{ fontWeight: 600, color: colorOfPartido(p.codigo) }}>{pct.toFixed(2)}%</td>
                  <td className="tr" style={{ fontWeight: 600, fontSize: 15 }}>{p.escanos || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
