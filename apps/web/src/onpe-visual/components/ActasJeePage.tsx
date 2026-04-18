import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const TILE_URL = 'https://encuesta.institutogoberna.com/tiles/{z}/{x}/{y}.pbf';

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

// JEE causales (from ONPE official list)
const CAUSALES: Record<string, string> = {
  '1': 'Sin datos',
  '2': 'Incompleta',
  '3': 'Error aritmético',
  '4': 'Ilegibilidad',
  '5': 'Sin firmas',
  '6': 'Votos impugnados',
  '7': 'Solicitud de nulidad',
  '8': 'Acta extraviada',
  '9': 'Acta siniestrada',
  '10': 'Dos o más observaciones',
};

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
  const [filter, setFilter] = useState<Filter>('jee');
  const [search, setSearch] = useState('');
  const [scrapedAt, setScrapedAt] = useState('');

  useEffect(() => {
    fetch('/api/actas').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.distritos) { setData(d.distritos); setScrapedAt(d.scrapedAt || ''); }
    });
  }, []);

  // Aggregate by INEI dept (2-digit) and province (4-digit) for map layers
  const { byIneiDist, deptExpr, provExpr, distExpr, filtered, stats, deptRanking } = useMemo(() => {
    const byIneiDist: Record<string, Distrito> = {};
    const deptAgg: Record<string, number> = {};
    const provAgg: Record<string, number> = {};
    const distColors: Record<string, string> = {};

    for (const d of data) {
      const inei = onpeToInei(d.ubigeo);
      byIneiDist[inei] = d;
      const val = filter === 'jee' ? d.enviadasJee : filter === 'pendientes' ? d.faltantes : d.enviadasJee + d.faltantes;
      if (val > 0) {
        distColors[inei] = heatColor(val);
        const dept2 = inei.slice(0, 2);
        const prov4 = inei.slice(0, 4);
        deptAgg[dept2] = (deptAgg[dept2] || 0) + val;
        provAgg[prov4] = (provAgg[prov4] || 0) + val;
      }
    }

    const buildExpr = (obj: Record<string, string | number>, key: any, colorFn: (v: number) => string, fallback: string) => {
      const entries = Object.entries(obj);
      if (!entries.length) return fallback as any;
      const expr: any[] = ['match', key];
      for (const [k, v] of entries) expr.push(k, typeof v === 'number' ? colorFn(v) : v);
      expr.push(fallback);
      return expr;
    };

    const deptExpr = buildExpr(deptAgg, ['get', 'coddep'], heatColor, '#e2e8f0');
    const provKey: any = ['coalesce', ['get', 'codprov_full'], ['concat', ['to-string', ['get', 'coddep']], ['to-string', ['get', 'codprov']]]];
    const provExpr = buildExpr(provAgg, provKey, heatColor, '#e2e8f0');
    const distExpr = buildExpr(distColors, ['get', 'ubigeo'], () => '', '#e2e8f0');

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

    const totalJee = data.reduce((s, d) => s + d.enviadasJee, 0);
    const totalPend = data.reduce((s, d) => s + d.faltantes, 0);
    const totalActas = data.reduce((s, d) => s + d.total, 0);
    const totalContab = data.reduce((s, d) => s + d.contab, 0);

    const byDept: Record<string, { jee: number; pend: number; contab: number; total: number }> = {};
    for (const d of data) {
      if (!byDept[d.dept]) byDept[d.dept] = { jee: 0, pend: 0, contab: 0, total: 0 };
      byDept[d.dept].jee += d.enviadasJee;
      byDept[d.dept].pend += d.faltantes;
      byDept[d.dept].contab += d.contab;
      byDept[d.dept].total += d.total;
    }
    const deptRanking = Object.entries(byDept)
      .map(([name, v]) => ({ name, ...v, falt: v.jee + v.pend }))
      .filter(d => d.falt > 0)
      .sort((a, b) => b.falt - a.falt);

    return { byIneiDist, deptExpr, provExpr, distExpr, filtered, stats: { totalJee, totalPend, totalActas, totalContab, byDept }, deptRanking };
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
          // Departments visible at all zooms
          { id: 'dept-fill', type: 'fill', source: 'peru', 'source-layer': 'departamentos',
            paint: { 'fill-color': '#e2e8f0', 'fill-opacity': 0.85 },
            maxzoom: 7,
          },
          { id: 'dept-line', type: 'line', source: 'peru', 'source-layer': 'departamentos',
            paint: { 'line-color': '#94a3b8', 'line-width': 1.2 },
          },
          // Provinces visible 5-9
          { id: 'prov-fill', type: 'fill', source: 'peru', 'source-layer': 'provincias',
            paint: { 'fill-color': '#e2e8f0', 'fill-opacity': 0.85 },
            minzoom: 7, maxzoom: 10,
          },
          { id: 'prov-line', type: 'line', source: 'peru', 'source-layer': 'provincias',
            paint: { 'line-color': 'rgba(148,163,184,.5)', 'line-width': 0.6 },
            minzoom: 7,
          },
          // Districts visible 9+
          { id: 'dist-fill', type: 'fill', source: 'peru', 'source-layer': 'distritos',
            paint: { 'fill-color': '#e2e8f0', 'fill-opacity': 0.9 },
            minzoom: 9,
          },
          { id: 'dist-line', type: 'line', source: 'peru', 'source-layer': 'distritos',
            paint: { 'line-color': 'rgba(255,255,255,.4)', 'line-width': 0.3 },
            minzoom: 9,
          },
        ],
      },
      center: [-75.0, -9.5], zoom: 5, minZoom: 4, maxZoom: 14, attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    // Hover popup
    map.on('mousemove', (e) => {
      const zoom = map.getZoom();
      const layer = zoom >= 9 ? 'dist-fill' : zoom >= 7 ? 'prov-fill' : 'dept-fill';
      const features = map.queryRenderedFeatures(e.point, { layers: [layer] });
      if (features.length) {
        const p = features[0].properties || {};
        map.getCanvas().style.cursor = 'pointer';
        if (!popupRef.current) popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14, maxWidth: '280px' });

        let html = `<div style="font-family:Montserrat,sans-serif;padding:2px 0">`;

        if (zoom >= 9) {
          // District level
          const ubigeo = p.ubigeo || '';
          const nombre = p.distrito || '?';
          const d = (window as any).__jeeByInei?.[ubigeo];
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
        } else if (zoom >= 7) {
          // Province level
          const nombre = p.provincia || '?';
          const codprov = p.codprov_full || ((p.coddep || '') + (p.codprov || ''));
          const agg = (window as any).__jeeByProv?.[codprov];
          html += `<div style="font-weight:800;font-size:14px;color:#0f172a">${nombre}</div>`;
          html += `<div style="font-size:10px;color:#94a3b8;margin:4px 0;font-family:'JetBrains Mono',monospace">Provincia</div>`;
          if (agg) {
            html += `<div style="font-size:13px;font-family:'JetBrains Mono',monospace;margin:6px 0"><strong style="color:#dc2626">${agg.jee}</strong> en JEE · <strong style="color:#d97706">${agg.pend}</strong> pendientes</div>`;
            html += `<div style="font-size:11px;color:#64748b;font-family:'JetBrains Mono',monospace">${agg.dists} distritos con faltantes</div>`;
          } else {
            html += `<div style="font-size:11px;color:#059669;margin-top:4px">✓ Completa</div>`;
          }
        } else {
          // Department level
          const nombre = p.departamento || '?';
          const coddep = p.coddep || '';
          const agg = (window as any).__jeeByDept?.[coddep];
          html += `<div style="font-weight:800;font-size:14px;color:#0f172a">${nombre}</div>`;
          html += `<div style="font-size:10px;color:#94a3b8;margin:4px 0;font-family:'JetBrains Mono',monospace">Departamento</div>`;
          if (agg) {
            html += `<div style="font-size:13px;font-family:'JetBrains Mono',monospace;margin:6px 0"><strong style="color:#dc2626">${agg.jee}</strong> en JEE · <strong style="color:#d97706">${agg.pend}</strong> pendientes</div>`;
            html += `<div style="font-size:11px;color:#64748b;font-family:'JetBrains Mono',monospace">${agg.dists} distritos · ${agg.pct.toFixed(1)}% contado</div>`;
          } else {
            html += `<div style="font-size:11px;color:#059669;margin-top:4px">✓ Completa</div>`;
          }
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

  // Update colors + expose data for popups
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data.length) return;

    (window as any).__jeeByInei = byIneiDist;

    // Build province + dept aggregates for popup
    const byProv: Record<string, { jee: number; pend: number; dists: number }> = {};
    const byDept: Record<string, { jee: number; pend: number; dists: number; contab: number; total: number }> = {};
    for (const d of data) {
      const inei = onpeToInei(d.ubigeo);
      const prov4 = inei.slice(0, 4);
      const dept2 = inei.slice(0, 2);
      const hasFalt = d.enviadasJee > 0 || d.faltantes > 0;
      if (hasFalt) {
        if (!byProv[prov4]) byProv[prov4] = { jee: 0, pend: 0, dists: 0 };
        byProv[prov4].jee += d.enviadasJee;
        byProv[prov4].pend += d.faltantes;
        byProv[prov4].dists++;
      }
      if (!byDept[dept2]) byDept[dept2] = { jee: 0, pend: 0, dists: 0, contab: 0, total: 0 };
      byDept[dept2].jee += d.enviadasJee;
      byDept[dept2].pend += d.faltantes;
      byDept[dept2].contab += d.contab;
      byDept[dept2].total += d.total;
      if (hasFalt) byDept[dept2].dists++;
    }
    // Add pct to dept
    for (const v of Object.values(byDept)) {
      (v as any).pct = v.total > 0 ? (v.contab / v.total) * 100 : 0;
    }
    (window as any).__jeeByProv = byProv;
    (window as any).__jeeByDept = byDept;

    const apply = () => {
      try {
        map.setPaintProperty('dept-fill', 'fill-color', deptExpr);
        map.setPaintProperty('prov-fill', 'fill-color', provExpr);
        map.setPaintProperty('dist-fill', 'fill-color', distExpr);
      } catch (e) { console.warn('color:', e); }
    };
    if (map.isStyleLoaded()) { apply(); map.once('idle', apply); }
    else map.once('load', () => { apply(); map.once('idle', apply); });
  }, [data, deptExpr, provExpr, distExpr, byIneiDist]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: '#f8fafc' }}>
      {/* MAP */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

        {/* Zoom hint */}
        <div style={{
          position: 'absolute', top: 16, left: 16, zIndex: 5,
          background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)',
          padding: '8px 14px', borderRadius: 8, boxShadow: '0 2px 10px rgba(15,23,42,.06)',
          fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace',
        }}>
          Zoom para ver provincias y distritos
        </div>

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 80, left: 16, zIndex: 5,
          background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(10px)',
          padding: '10px 14px', borderRadius: 10, boxShadow: '0 4px 16px rgba(15,23,42,.08)',
          fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#0f172a', letterSpacing: 1 }}>
            {filter === 'jee' ? 'ACTAS EN JEE' : filter === 'pendientes' ? 'ACTAS PENDIENTES' : 'TOTAL FALTANTES'}
          </div>
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
        <h2 style={{ fontFamily: 'Montserrat', fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
          Actas en JEE
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
            <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', fontFamily: 'JetBrains Mono, monospace' }}>{stats.totalActas > 0 ? ((stats.totalContab / stats.totalActas) * 100).toFixed(1) : '—'}%</div>
          </div>
        </div>

        {/* Causales info */}
        <details style={{ marginBottom: 14, fontSize: 11, color: '#64748b' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1, color: '#94a3b8', marginBottom: 6 }}>
            CAUSALES DE ENVÍO AL JEE
          </summary>
          <div style={{ padding: '8px 0', fontSize: 10.5, lineHeight: 1.6 }}>
            {Object.entries(CAUSALES).map(([n, desc]) => (
              <div key={n} style={{ display: 'flex', gap: 6, padding: '3px 0', borderBottom: '1px solid rgba(15,23,42,.04)' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#0f172a', minWidth: 18 }}>{n}.</span>
                <span style={{ color: '#334155' }}>{desc}</span>
              </div>
            ))}
          </div>
        </details>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['jee', 'pendientes', 'all'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              all: 'unset', cursor: 'pointer', padding: '5px 12px', borderRadius: 6,
              fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: 0.8,
              background: filter === f ? '#0f172a' : '#f1f5f9',
              color: filter === f ? '#fff' : '#64748b',
            }}>
              {f === 'all' ? 'TODOS' : f === 'jee' ? 'EN JEE' : 'PENDIENTES'}
            </button>
          ))}
        </div>

        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar distrito, provincia, depto..."
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            border: '1px solid rgba(15,23,42,.1)', fontSize: 12,
            fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box',
          }}
        />

        {/* Dept chips */}
        <div style={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>
          POR DEPARTAMENTO
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
          {deptRanking.slice(0, 15).map(d => (
            <button key={d.name} onClick={() => setSearch(s => s.toUpperCase() === d.name ? '' : d.name)} style={{
              all: 'unset', cursor: 'pointer', fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
              padding: '3px 8px', borderRadius: 5,
              background: search.toUpperCase() === d.name ? '#0f172a' : '#f1f5f9',
              color: search.toUpperCase() === d.name ? '#fff' : '#334155',
            }}>
              {d.name.slice(0, 8)} <strong style={{ color: search.toUpperCase() === d.name ? '#fbbf24' : '#dc2626' }}>{d.falt}</strong>
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>
          DISTRITOS ({filtered.length})
        </div>
        <div style={{ maxHeight: 'calc(100vh - 520px)', overflowY: 'auto' }}>
          {filtered.map(d => {
            const falt = d.enviadasJee + d.faltantes;
            return (
              <div key={d.ubigeo} style={{
                padding: '8px 10px', borderBottom: '1px solid rgba(15,23,42,.04)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: heatColor(falt), flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.dist}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{d.prov}, {d.dept}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                  {d.enviadasJee > 0 && <div style={{ color: '#dc2626', fontWeight: 700 }}>JEE: {d.enviadasJee}</div>}
                  {d.faltantes > 0 && <div style={{ color: '#d97706', fontWeight: 700 }}>Pend: {d.faltantes}</div>}
                </div>
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
