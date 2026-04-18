import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const TILE_URL = 'https://encuesta.institutogoberna.com/tiles/{z}/{x}/{y}.pbf';

// ONPE dept code → INEI dept code
const ONPE_TO_INEI_DEPT: Record<string, string> = {
  '01':'01','02':'02','03':'03','04':'04','05':'05','06':'06',
  '07':'08','08':'09','09':'10','10':'11','11':'12','12':'13',
  '13':'14','14':'15','15':'16','16':'17','17':'18','18':'19',
  '19':'20','20':'21','21':'22','22':'23','23':'24','24':'07','25':'25',
};
function onpeToInei(ubi: string): string {
  const u = String(ubi).padStart(6, '0');
  const d = ONPE_TO_INEI_DEPT[u.slice(0, 2)];
  return d ? d + u.slice(2) : u;
}

interface Distrito {
  dept: string; prov: string; dist: string; ubigeo: string;
  contab: number; total: number; faltantes: number; enviadasJee: number;
  pct: number; ganador?: { cand: string; partido: string; pct: number };
}

type Filter = 'all' | 'jee' | 'pendientes';

function fmtN(n: number) {
  if (n >= 1_000_000) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1e3).toFixed(1)}k`;
  return n.toLocaleString('es-PE');
}

// Heat color: more missing actas → redder
function heatColor(count: number): string {
  if (count <= 0) return '#e2e8f0';
  if (count <= 5) return '#fef3c7';
  if (count <= 15) return '#fdba74';
  if (count <= 40) return '#f87171';
  if (count <= 80) return '#dc2626';
  return '#7f1d1d';
}

export function ActasJeePage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [data, setData] = useState<Distrito[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [_hovered, setHovered] = useState<Distrito | null>(null);
  const [scrapedAt, setScrapedAt] = useState('');

  // Fetch actas data
  useEffect(() => {
    fetch('/api/actas').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.distritos) {
        setData(d.distritos);
        setScrapedAt(d.scrapedAt || '');
      }
    });
  }, []);

  // Index by INEI ubigeo for map coloring
  const { byInei, colorExpr, filtered, stats } = useMemo(() => {
    const byInei: Record<string, Distrito> = {};
    for (const d of data) {
      const inei = onpeToInei(d.ubigeo);
      byInei[inei] = d;
    }

    // Filter
    const filtered = data.filter(d => {
      if (filter === 'jee') return d.enviadasJee > 0;
      if (filter === 'pendientes') return d.faltantes > 0;
      return d.enviadasJee > 0 || d.faltantes > 0;
    }).filter(d => {
      if (!search.trim()) return true;
      const q = search.toUpperCase();
      return d.dist.includes(q) || d.prov.includes(q) || d.dept.includes(q);
    }).sort((a, b) => {
      const va = filter === 'jee' ? a.enviadasJee : filter === 'pendientes' ? a.faltantes : a.enviadasJee + a.faltantes;
      const vb = filter === 'jee' ? b.enviadasJee : filter === 'pendientes' ? b.faltantes : b.enviadasJee + b.faltantes;
      return vb - va;
    });

    // Build color expression
    const entries: [string, string][] = [];
    for (const [inei, d] of Object.entries(byInei)) {
      const val = filter === 'jee' ? d.enviadasJee : filter === 'pendientes' ? d.faltantes : d.enviadasJee + d.faltantes;
      if (val > 0) entries.push([inei, heatColor(val)]);
    }
    let colorExpr: any = '#e2e8f0';
    if (entries.length) {
      const expr: any[] = ['match', ['get', 'ubigeo']];
      for (const [k, v] of entries) { expr.push(k, v); }
      expr.push('#e2e8f0');
      colorExpr = expr;
    }

    // Stats
    const totalJee = data.reduce((s, d) => s + d.enviadasJee, 0);
    const totalPend = data.reduce((s, d) => s + d.faltantes, 0);
    const totalActas = data.reduce((s, d) => s + d.total, 0);
    const totalContab = data.reduce((s, d) => s + d.contab, 0);

    // By dept
    const byDept: Record<string, { jee: number; pend: number; contab: number; total: number }> = {};
    for (const d of data) {
      if (!byDept[d.dept]) byDept[d.dept] = { jee: 0, pend: 0, contab: 0, total: 0 };
      byDept[d.dept].jee += d.enviadasJee;
      byDept[d.dept].pend += d.faltantes;
      byDept[d.dept].contab += d.contab;
      byDept[d.dept].total += d.total;
    }

    return { byInei, colorExpr, filtered, stats: { totalJee, totalPend, totalActas, totalContab, byDept } };
  }, [data, filter, search]);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: { peru: { type: 'vector', tiles: [TILE_URL], minzoom: 3, maxzoom: 14 } },
        layers: [
          { id: 'bg', type: 'background', paint: { 'background-color': '#f8fafc' } },
          { id: 'dist-fill', type: 'fill', source: 'peru', 'source-layer': 'distritos',
            paint: { 'fill-color': '#e2e8f0', 'fill-opacity': 0.9 },
          },
          { id: 'dist-line', type: 'line', source: 'peru', 'source-layer': 'distritos',
            paint: { 'line-color': 'rgba(255,255,255,.4)', 'line-width': 0.3 },
          },
          { id: 'dept-line', type: 'line', source: 'peru', 'source-layer': 'departamentos',
            paint: { 'line-color': '#94a3b8', 'line-width': 1 },
          },
        ],
      },
      center: [-75.0, -9.5], zoom: 5, minZoom: 4, maxZoom: 14, attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    // Hover popup
    map.on('mousemove', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['dist-fill'] });
      if (features.length) {
        const ubigeo = features[0].properties?.ubigeo || '';
        const nombre = features[0].properties?.distrito || '?';
        const d = (window as any).__jeeByInei?.[ubigeo];
        map.getCanvas().style.cursor = 'pointer';
        if (!popupRef.current) popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14, maxWidth: '280px' });

        let html = `<div style="font-family:Montserrat,sans-serif;padding:2px 0">`;
        html += `<div style="font-weight:800;font-size:14px;color:#0f172a">${nombre}</div>`;
        if (d) {
          html += `<div style="font-size:10px;color:#94a3b8;margin:4px 0;font-family:'JetBrains Mono',monospace">${d.prov} · ${d.dept}</div>`;
          html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px">`;
          html += `<div style="padding:6px 8px;border-radius:6px;background:#dc262610;text-align:center"><div style="font-size:9px;color:#dc2626;font-weight:700;letter-spacing:1px;font-family:'JetBrains Mono',monospace">EN JEE</div><div style="font-size:18px;font-weight:800;color:#dc2626;font-family:'JetBrains Mono',monospace">${d.enviadasJee}</div></div>`;
          html += `<div style="padding:6px 8px;border-radius:6px;background:#d9770610;text-align:center"><div style="font-size:9px;color:#d97706;font-weight:700;letter-spacing:1px;font-family:'JetBrains Mono',monospace">PENDIENTE</div><div style="font-size:18px;font-weight:800;color:#d97706;font-family:'JetBrains Mono',monospace">${d.faltantes}</div></div>`;
          html += `</div>`;
          html += `<div style="margin-top:6px;font-size:11px;color:#64748b;font-family:'JetBrains Mono',monospace">${d.contab}/${d.total} contab · ${d.pct.toFixed(1)}%</div>`;
          if (d.ganador) html += `<div style="margin-top:4px;font-size:10.5px;color:#0f172a">Ganando: <strong>${d.ganador.cand.split(' ').pop()}</strong> ${d.ganador.pct.toFixed(1)}%</div>`;
        } else {
          html += `<div style="font-size:11px;color:#059669;margin-top:4px">✓ Sin actas pendientes</div>`;
        }
        html += `</div>`;
        popupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map);
      } else {
        map.getCanvas().style.cursor = '';
        popupRef.current?.remove();
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update map colors when data/filter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    (window as any).__jeeByInei = byInei;
    const apply = () => {
      try { map.setPaintProperty('dist-fill', 'fill-color', colorExpr); } catch {}
    };
    if (map.isStyleLoaded()) { apply(); map.once('idle', apply); }
    else map.once('load', () => { apply(); map.once('idle', apply); });
  }, [colorExpr, byInei]);

  // Dept ranking
  const deptRanking = useMemo(() => {
    return Object.entries(stats.byDept)
      .map(([name, v]) => ({ name, ...v, falt: v.jee + v.pend }))
      .filter(d => d.falt > 0)
      .sort((a, b) => b.falt - a.falt);
  }, [stats]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: '#f8fafc' }}>
      {/* MAP */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 80, left: 16, zIndex: 5,
          background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(10px)',
          padding: '10px 14px', borderRadius: 10, boxShadow: '0 4px 16px rgba(15,23,42,.08)',
          fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#0f172a', letterSpacing: 1 }}>ACTAS FALTANTES</div>
          {[
            { color: '#e2e8f0', label: '0' },
            { color: '#fef3c7', label: '1–5' },
            { color: '#fdba74', label: '6–15' },
            { color: '#f87171', label: '16–40' },
            { color: '#dc2626', label: '41–80' },
            { color: '#7f1d1d', label: '80+' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
              <div style={{ width: 14, height: 10, borderRadius: 2, background: s.color }} />
              <span style={{ color: '#64748b' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SIDEBAR */}
      <div style={{
        width: 400, background: '#fff', borderLeft: '1px solid rgba(15,23,42,.06)',
        padding: '16px 18px', overflowY: 'auto', flexShrink: 0,
      }}>
        {/* Header */}
        <h2 style={{ fontFamily: 'Montserrat', fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
          Actas JEE & Pendientes
        </h2>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 14px', fontFamily: 'JetBrains Mono, monospace' }}>
          act. {scrapedAt ? new Date(scrapedAt).toLocaleTimeString('es-PE', { timeZone: 'America/Lima' }) : '—'}
        </p>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div style={{ padding: '10px', borderRadius: 8, background: '#dc262608', textAlign: 'center' }}>
            <div style={{ fontSize: 9, letterSpacing: 1.2, fontWeight: 700, color: '#dc2626', fontFamily: 'JetBrains Mono, monospace' }}>EN JEE</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626', fontFamily: 'JetBrains Mono, monospace' }}>{fmtN(stats.totalJee)}</div>
          </div>
          <div style={{ padding: '10px', borderRadius: 8, background: '#d9770608', textAlign: 'center' }}>
            <div style={{ fontSize: 9, letterSpacing: 1.2, fontWeight: 700, color: '#d97706', fontFamily: 'JetBrains Mono, monospace' }}>PENDIENTES</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706', fontFamily: 'JetBrains Mono, monospace' }}>{fmtN(stats.totalPend)}</div>
          </div>
          <div style={{ padding: '10px', borderRadius: 8, background: '#05966908', textAlign: 'center' }}>
            <div style={{ fontSize: 9, letterSpacing: 1.2, fontWeight: 700, color: '#059669', fontFamily: 'JetBrains Mono, monospace' }}>CONTADO</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', fontFamily: 'JetBrains Mono, monospace' }}>{((stats.totalContab / stats.totalActas) * 100).toFixed(1)}%</div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['all', 'jee', 'pendientes'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              all: 'unset', cursor: 'pointer', padding: '5px 12px', borderRadius: 6,
              fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: 0.8,
              background: filter === f ? '#0f172a' : '#f1f5f9',
              color: filter === f ? '#fff' : '#64748b',
              transition: 'all .15s',
            }}>
              {f === 'all' ? 'TODOS' : f === 'jee' ? 'EN JEE' : 'PENDIENTES'}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar distrito, provincia, depto..."
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            border: '1px solid rgba(15,23,42,.1)', fontSize: 12,
            fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box',
          }}
        />

        {/* Department summary */}
        <div style={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>
          POR DEPARTAMENTO ({deptRanking.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
          {deptRanking.slice(0, 12).map(d => (
            <button key={d.name} onClick={() => setSearch(d.name)} style={{
              all: 'unset', cursor: 'pointer',
              fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
              padding: '3px 8px', borderRadius: 5,
              background: search.toUpperCase() === d.name ? '#0f172a' : '#f1f5f9',
              color: search.toUpperCase() === d.name ? '#fff' : '#334155',
            }}>
              {d.name.slice(0, 8)} <strong style={{ color: search.toUpperCase() === d.name ? '#fbbf24' : '#dc2626' }}>{d.falt}</strong>
            </button>
          ))}
        </div>

        {/* District list */}
        <div style={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>
          DISTRITOS ({filtered.length})
        </div>
        <div style={{ maxHeight: 'calc(100vh - 480px)', overflowY: 'auto' }}>
          {filtered.map(d => {
            const falt = d.enviadasJee + d.faltantes;
            return (
              <div key={d.ubigeo} style={{
                padding: '8px 10px', borderBottom: '1px solid rgba(15,23,42,.04)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
                onMouseEnter={() => setHovered(d)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Heat dot */}
                <div style={{ width: 10, height: 10, borderRadius: 2, background: heatColor(falt), flexShrink: 0 }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.dist}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{d.prov}, {d.dept}</div>
                </div>

                {/* Numbers */}
                <div style={{ textAlign: 'right', flexShrink: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                  {d.enviadasJee > 0 && <div style={{ color: '#dc2626', fontWeight: 700 }}>JEE: {d.enviadasJee}</div>}
                  {d.faltantes > 0 && <div style={{ color: '#d97706', fontWeight: 700 }}>Pend: {d.faltantes}</div>}
                </div>

                {/* % bar */}
                <div style={{ width: 40, flexShrink: 0 }}>
                  <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${d.pct}%`, background: d.pct >= 95 ? '#059669' : d.pct >= 85 ? '#d97706' : '#dc2626', borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', marginTop: 1 }}>{d.pct.toFixed(0)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .maplibregl-popup-content { background:rgba(255,255,255,.97) !important; backdrop-filter:blur(10px); border:1px solid rgba(15,23,42,.08) !important; border-radius:12px !important; box-shadow:0 8px 24px rgba(15,23,42,.12) !important; padding:12px 16px !important; }
        .maplibregl-popup-tip { border-top-color:rgba(255,255,255,.97) !important; }
      `}</style>
    </div>
  );
}
