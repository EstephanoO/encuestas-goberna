import { useEffect, useMemo, useState } from 'react';
import { CandidatePhoto } from './CandidatePhoto';

const DEPTS = [
  { ubigeo: '010000', nombre: 'Amazonas' }, { ubigeo: '020000', nombre: 'Áncash' },
  { ubigeo: '030000', nombre: 'Apurímac' }, { ubigeo: '040000', nombre: 'Arequipa' },
  { ubigeo: '050000', nombre: 'Ayacucho' }, { ubigeo: '060000', nombre: 'Cajamarca' },
  { ubigeo: '240000', nombre: 'Callao' }, { ubigeo: '070000', nombre: 'Cusco' },
  { ubigeo: '080000', nombre: 'Huancavelica' }, { ubigeo: '090000', nombre: 'Huánuco' },
  { ubigeo: '100000', nombre: 'Ica' }, { ubigeo: '110000', nombre: 'Junín' },
  { ubigeo: '120000', nombre: 'La Libertad' }, { ubigeo: '130000', nombre: 'Lambayeque' },
  { ubigeo: '140000', nombre: 'Lima' }, { ubigeo: '150000', nombre: 'Loreto' },
  { ubigeo: '160000', nombre: 'Madre de Dios' }, { ubigeo: '170000', nombre: 'Moquegua' },
  { ubigeo: '180000', nombre: 'Pasco' }, { ubigeo: '190000', nombre: 'Piura' },
  { ubigeo: '200000', nombre: 'Puno' }, { ubigeo: '210000', nombre: 'San Martín' },
  { ubigeo: '220000', nombre: 'Tacna' }, { ubigeo: '230000', nombre: 'Tumbes' },
  { ubigeo: '250000', nombre: 'Ucayali' },
];

const PRES_COLORS: Record<string, string> = {
  '8': '#F58220', '35': '#12B3CC', '16': '#F5B300', '10': '#E30613',
  '14': '#F4C300', '23': '#FF6B00', '2': '#800020',
};
const colorOf = (cod: string) => PRES_COLORS[cod] || '#6b7280';

interface Provincia { ubigeo: string; nombre: string; }
interface Partido { partido: string; candidato: string | null; codigo: string; votos: number; pct: number; }
interface Distrito {
  ubigeo: string; nombre: string;
  pctActas: number; actasContabilizadas: number; totalActas: number;
  votosEmitidos: number; votosValidos: number; participacion: number;
  ganador: Partido | null;
  partidos: Partido[];
}

export function DistritosPage() {
  const [dept, setDept] = useState<string>('140000'); // Lima default
  const [prov, setProv] = useState<string>('140100'); // Lima Centro default
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [distritos, setDistritos] = useState<Distrito[] | null>(null);
  const [loadingP, setLoadingP] = useState(false);
  const [loadingD, setLoadingD] = useState(false);
  const [filter, setFilter] = useState('');
  const [selDist, setSelDist] = useState<Distrito | null>(null);

  // Fetch provincias cuando cambia depto
  useEffect(() => {
    let alive = true;
    setLoadingP(true);
    setProvincias([]);
    fetch(`/api/ubigeos/provincias?dept=${dept}&t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (!alive) return;
        const list = Array.isArray(j) ? j : [];
        setProvincias(list);
        // si la prov actual no está en este depto, elegir la primera
        if (list.length && !list.some((p: Provincia) => p.ubigeo === prov)) setProv(list[0].ubigeo);
        setLoadingP(false);
      })
      .catch(() => setLoadingP(false));
    return () => { alive = false; };
  }, [dept]);

  // Fetch distritos cuando cambia prov
  useEffect(() => {
    if (!prov) return;
    let alive = true;
    setLoadingD(true);
    setDistritos(null);
    fetch(`/api/distritos?dept=${dept}&prov=${prov}&t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (!alive) return;
        setDistritos((j.distritos || []).sort((a: Distrito, b: Distrito) => a.nombre.localeCompare(b.nombre)));
        setLoadingD(false);
      })
      .catch(() => setLoadingD(false));
    return () => { alive = false; };
  }, [dept, prov]);

  const filtered = useMemo(() => {
    if (!distritos) return null;
    if (!filter.trim()) return distritos;
    const q = filter.toUpperCase();
    return distritos.filter(d => d.nombre.includes(q));
  }, [distritos, filter]);

  const totals = useMemo(() => {
    if (!distritos) return null;
    const t = { distritos: distritos.length, votos: 0, contabilizadas: 0, totalActas: 0 };
    distritos.forEach(d => { t.votos += d.votosEmitidos; t.contabilizadas += d.actasContabilizadas; t.totalActas += d.totalActas; });
    return t;
  }, [distritos]);

  return (
    <div className="container">
      <header className="hero">
        <div className="hero-left">
          <div className="hero-title">Resultados por distrito</div>
          <div className="hero-sub">Elección presidencial · drill al ámbito mínimo (distrito político)</div>
        </div>
        <div className="hero-center">
          <div className="hero-label">DISTRITOS EN ESTA PROVINCIA</div>
          <div className="hero-pct" key={distritos?.length}>
            <span className="num-flash">{distritos?.length ?? 0}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 4 }}>
            <span className="live-dot" /> &nbsp; ONPE en vivo
          </div>
        </div>
        <div className="hero-right" />
      </header>

      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div className="card-title">Filtros</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 10 }}>
          <Field label="Departamento">
            <select value={dept} onChange={e => setDept(e.target.value)} style={selectSt}>
              {DEPTS.map(d => <option key={d.ubigeo} value={d.ubigeo}>{d.nombre}</option>)}
            </select>
          </Field>
          <Field label="Provincia">
            <select value={prov} onChange={e => setProv(e.target.value)} style={selectSt} disabled={loadingP}>
              {loadingP && <option>cargando…</option>}
              {provincias.map(p => <option key={p.ubigeo} value={p.ubigeo}>{p.nombre}</option>)}
            </select>
          </Field>
          <Field label="Buscar distrito">
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="MIRAFLORES, SURCO…" style={{ ...selectSt, fontFamily: 'Inter' }} />
          </Field>
        </div>
        {totals && (
          <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 12, color: 'var(--tx3)' }}>
            <span><strong style={{ color: 'var(--tx1)' }}>{totals.distritos}</strong> distritos</span>
            <span><strong style={{ color: 'var(--tx1)' }}>{totals.votos.toLocaleString('es-PE')}</strong> votos emitidos</span>
            <span><strong style={{ color: 'var(--tx1)' }}>{totals.contabilizadas.toLocaleString('es-PE')}/{totals.totalActas.toLocaleString('es-PE')}</strong> actas</span>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Distritos políticos</div>
        <div className="card-sub">Click para ver el detalle por candidato · ordenado alfabéticamente</div>
        {loadingD && <div style={{ padding: 30, textAlign: 'center', color: 'var(--tx3)' }}>Cargando distritos…</div>}
        {!loadingD && filtered && filtered.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: 'var(--tx3)' }}>Sin coincidencias</div>}
        {!loadingD && filtered && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginTop: 12 }}>
            {filtered.map(d => {
              const ganColor = d.ganador ? colorOf(d.ganador.codigo) : '#888';
              return (
                <button key={d.ubigeo} onClick={() => setSelDist(d)} className="distrito-card" style={{ borderLeftColor: ganColor }}>
                  <div className="distrito-name">{d.nombre}</div>
                  <div className="distrito-meta">
                    actas {d.pctActas.toFixed(1)}% · {d.votosEmitidos.toLocaleString('es-PE')} votos · participación {d.participacion.toFixed(1)}%
                  </div>
                  {d.ganador && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CandidatePhoto dni={undefined} nombre={d.ganador.candidato || d.ganador.partido} color={ganColor} size={28} ring={false} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.ganador.candidato?.split(' ').slice(0, 3).join(' ') || d.ganador.partido}
                        </div>
                        <div style={{ fontSize: 10, color: ganColor, fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                          {d.ganador.pct.toFixed(2)}% · {d.ganador.votos.toLocaleString('es-PE')} votos
                        </div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selDist && <DistritoModal d={selDist} dept={DEPTS.find(x => x.ubigeo === dept)?.nombre || ''} onClose={() => setSelDist(null)} />}
    </div>
  );
}

const selectSt: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  background: 'var(--bg-card)', color: 'var(--tx1)',
  border: '1px solid var(--border)', borderRadius: 6,
  fontFamily: 'inherit',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.2, color: 'var(--tx3)', textTransform: 'uppercase' }}>{label}</span>
      {children}
    </label>
  );
}

function DistritoModal({ d, dept, onClose }: { d: Distrito; dept: string; onClose: () => void }) {
  const max = d.partidos[0]?.pct || 1;
  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
        <h3 style={{ fontSize: 20 }}>{d.nombre}</h3>
        <div className="region-sub" style={{ marginBottom: 14 }}>
          {dept} · actas {d.pctActas.toFixed(2)}% ({d.actasContabilizadas}/{d.totalActas}) · participación {d.participacion.toFixed(1)}% · {d.votosEmitidos.toLocaleString('es-PE')} votos emitidos
        </div>
        {d.partidos.map(p => {
          const c = colorOf(p.codigo);
          return (
            <div className="modal-row" key={p.codigo}>
              <span className="dot" style={{ background: c }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="name">{p.candidato?.split(' ').slice(0, 3).join(' ') || p.partido}</span>
                  <span className="pct" style={{ color: c }}>
                    {p.pct.toFixed(2)}%
                    <span style={{ marginLeft: 6, color: 'var(--tx3)', fontSize: 10 }}>{p.votos.toLocaleString('es-PE')}</span>
                  </span>
                </div>
                <div className="modal-bar" style={{ width: `${(p.pct / max) * 100}%`, background: c, marginTop: 4 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
