import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Landmark, Map as MapIcon, MapPin, Building2, ArrowLeft, ChevronRight } from 'lucide-react';
import { CandidatePhoto } from './CandidatePhoto';

const TILE_URL = 'https://encuesta.institutogoberna.com/tiles/{z}/{x}/{y}.pbf';

const CAND_COLORS: Record<string, string> = {
  fujimori: '#EF6C00', rla: '#0097A7', sanchez: '#C62828', nieto: '#FF8F00', belmont: '#00838F',
};
const CAND_NAMES: Record<string, string> = {
  fujimori: 'Keiko Fujimori', rla: 'Rafael López Aliaga', sanchez: 'Roberto Sánchez', nieto: 'José Nieto', belmont: 'Ricardo Belmont',
};
const CAND_PARTIES: Record<string, string> = {
  fujimori: 'Fuerza Popular', rla: 'Renovación Popular', sanchez: 'Juntos por el Perú', nieto: 'Buen Gobierno', belmont: 'País para Todos',
};
const CAND_DNI: Record<string, string> = {
  fujimori: '10001088', rla: '07845838', sanchez: '16002918', nieto: '06506278', belmont: '09177250',
};
// Partido cod → candidate key
const PARTIDO_TO_CAND: Record<string, string> = {
  '8': 'fujimori', '35': 'rla', '10': 'sanchez', '16': 'nieto', '14': 'belmont', '23': 'belmont',
};
const CAND_KEYS = ['fujimori', 'rla', 'sanchez', 'nieto', 'belmont'];

// INEI department codes (what the tiles use) — NOT ONPE codes
const DEPT_CODES: Record<string, string> = {
  'Amazonas':'01','Áncash':'02','Apurímac':'03','Arequipa':'04','Ayacucho':'05',
  'Cajamarca':'06','Callao':'07','Cusco':'08','Huancavelica':'09','Huánuco':'10',
  'Ica':'11','Junín':'12','La Libertad':'13','Lambayeque':'14','Lima':'15',
  'Loreto':'16','Madre de Dios':'17','Moquegua':'18','Pasco':'19','Piura':'20',
  'Puno':'21','San Martín':'22','Tacna':'23','Tumbes':'24','Ucayali':'25',
};

// Row matching sidebar layout: foto + nombre + partido + barra + pct
function buildPopupRow(
  c: { key: string; name: string; party?: string; color: string; pct: number },
  maxPct: number,
  isFirst: boolean,
) {
  const dni = CAND_DNI[c.key] || '';
  const width = Math.max(0, Math.min(100, (c.pct / (maxPct || 1)) * 100));
  const border = isFirst ? 'none' : '1px solid rgba(15,23,42,.05)';
  const party = c.party || CAND_PARTIES[c.key] || '';
  return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:${border}">
    ${dni
      ? `<img src="/fotos/${dni}.jpg" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid ${c.color};flex-shrink:0" onerror="this.style.display='none'">`
      : `<div style="width:34px;height:34px;border-radius:50%;background:${c.color}22;border:2px solid ${c.color};flex-shrink:0"></div>`}
    <div style="flex:1;min-width:0">
      <div style="font-size:12.5px;font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</div>
      ${party ? `<div style="font-size:10px;color:#94a3b8">${party}</div>` : ''}
      <div style="height:3px;background:#f1f5f9;border-radius:2px;margin-top:4px;overflow:hidden">
        <div style="height:100%;width:${width}%;background:${c.color};border-radius:2px"></div>
      </div>
    </div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:700;color:${c.color};min-width:56px;text-align:right">${c.pct.toFixed(2)}%</div>
  </div>`;
}

function buildPopupHeader(name: string, levelLabel: string, pctActas?: number, winner?: { name: string; color: string }) {
  const surname = winner ? (winner.name.split(' ').slice(-2, -1)[0] || winner.name.split(' ').pop() || '?') : '';
  return `<div style="padding:2px 0 8px;border-bottom:1px solid rgba(15,23,42,.06);margin-bottom:6px">
    <div style="font-family:Montserrat,sans-serif;font-weight:800;font-size:15px;color:#0f172a;margin-bottom:2px">${name}</div>
    <div style="display:flex;align-items:center;gap:8px;font-size:10px;font-family:'JetBrains Mono',monospace;color:#94a3b8">
      <span style="letter-spacing:1.2px;font-weight:700">${levelLabel.toUpperCase()}</span>
      ${typeof pctActas === 'number' ? `<span style="color:#cbd5e1">·</span><span>${pctActas.toFixed(1)}% actas</span>` : ''}
    </div>
    ${winner ? `<div style="margin-top:6px;display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:999px;background:${winner.color}14;border:1px solid ${winner.color}33"><span style="width:6px;height:6px;border-radius:50%;background:${winner.color}"></span><span style="font-size:9.5px;font-weight:800;letter-spacing:1.2px;font-family:'JetBrains Mono',monospace;color:${winner.color}">GANA ${surname.toUpperCase()}</span></div>` : ''}
  </div>`;
}

type Level = 'departamentos' | 'provincias' | 'distritos';

interface RegionData {
  name: string;
  winner: string;
  winnerColor: string;
  winnerPct: number;
  results: { key: string; name: string; party: string; color: string; pct: number }[];
  pctActas?: number;
}

export function MapaElectoralLab() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const levelRef = useRef<Level>('departamentos');
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const selCodeRef = useRef<{ coddep: string; codprov: string }>({ coddep: '', codprov: '' });
  const provColorExprRef = useRef<any>(null);  // cache province color expression for restore
  const distColorExprRef = useRef<any>(null);  // cache district color expression
  const [level, setLevel] = useState<Level>('departamentos');
  const [selected, setSelected] = useState<RegionData | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  const [presData, setPresData] = useState<any>(null);
  const [candData, setCandData] = useState<any>(null);
  const [ineiToOnpe, setIneiToOnpe] = useState<Record<string, string>>({});

  useEffect(() => { levelRef.current = level; }, [level]);

  useEffect(() => {
    Promise.all([
      fetch('/api/onpe').then(r => r.ok ? r.json() : null),
      fetch('/api/actas-candidatos').then(r => r.ok ? r.json() : null),
      fetch('/inei-to-onpe.json').then(r => r.ok ? r.json() : {}),
    ]).then(([p, c, m]) => { if (p) setPresData(p); if (c) setCandData(c); setIneiToOnpe(m || {}); });
  }, []);

  // Color expressions for provinces + districts derived from candData distritos.
  // Province winner = candidate with the most distritos ganados within the 4-digit prefix.
  // Distrito winner = ganador directo del distrito (ubigeo completo).
  const { provColorExprFromData, distColorExprFromData } = useMemo(() => {
    if (!candData?.distritos?.length) {
      return { provColorExprFromData: null as any, distColorExprFromData: null as any };
    }
    const distColors: Record<string, string> = {};
    const provCounts: Record<string, Record<string, number>> = {};
    for (const d of candData.distritos) {
      const cod = d.ganador?.cod;
      if (!cod) continue;
      const candKey = PARTIDO_TO_CAND[String(Number(cod))];
      if (!candKey) continue;
      const color = CAND_COLORS[candKey];
      const ubi = String(d.ubigeo ?? '').padStart(6, '0');
      if (ubi.length !== 6) continue;
      distColors[ubi] = color;
      const pcode = ubi.slice(0, 4);
      if (!provCounts[pcode]) provCounts[pcode] = {};
      provCounts[pcode][candKey] = (provCounts[pcode][candKey] || 0) + 1;
    }
    const provColors: Record<string, string> = {};
    for (const [pcode, counts] of Object.entries(provCounts)) {
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      provColors[pcode] = CAND_COLORS[top];
    }
    const buildExpr = (obj: Record<string, string>, keyExpr: any, fallback: string) => {
      const entries = Object.entries(obj);
      if (!entries.length) return null;
      const expr: any[] = ['match', keyExpr];
      for (const [k, v] of entries) expr.push(k, v);
      expr.push(fallback);
      return expr;
    };
    // Tile may expose either `codprov_full` (4-digit INEI) or split `coddep`+`codprov`.
    // Use coalesce so it works in both cases.
    const provKey: any = [
      'coalesce',
      ['get', 'codprov_full'],
      ['concat', ['to-string', ['get', 'coddep']], ['to-string', ['get', 'codprov']]],
    ];
    return {
      provColorExprFromData: buildExpr(provColors, provKey, '#cbd5e1'),
      distColorExprFromData: buildExpr(distColors, ['get', 'ubigeo'], '#bfdbfe'),
    };
  }, [candData]);

  // Color map + region data by dept
  const { deptColorExpr, regionsByCode } = useMemo(() => {
    const regions: Record<string, RegionData> = {};
    const colors: Record<string, string> = {};
    if (!presData?.regions) return { deptColorExpr: '#cbd5e1' as any, regionsByCode: regions };

    for (const r of presData.regions) {
      const results = CAND_KEYS.map(k => ({
        key: k, name: CAND_NAMES[k], party: CAND_PARTIES[k],
        color: CAND_COLORS[k], pct: r[k] ?? 0,
      })).sort((a, b) => b.pct - a.pct);
      const winner = results[0];
      const code = DEPT_CODES[r.name];
      if (code) {
        colors[code] = winner.color;
        regions[code] = {
          name: r.name, winner: winner.name, winnerColor: winner.color,
          winnerPct: winner.pct, results, pctActas: r.pct,
        };
      }
    }
    const entries = Object.entries(colors);
    if (!entries.length) return { deptColorExpr: '#cbd5e1' as any, regionsByCode: regions };
    const expr: any[] = ['match', ['get', 'coddep']];
    for (const [code, color] of entries) { expr.push(code, color); }
    expr.push('#cbd5e1');
    return { deptColorExpr: expr, regionsByCode: regions };
  }, [presData]);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: { peru: { type: 'vector', tiles: [TILE_URL], minzoom: 3, maxzoom: 14 } },
        layers: [
          { id: 'bg', type: 'background', paint: { 'background-color': '#f0f4f8' } },
          { id: 'dept-fill', type: 'fill', source: 'peru', 'source-layer': 'departamentos',
            paint: { 'fill-color': '#cbd5e1', 'fill-opacity': 0.85 },
          },
          { id: 'dept-line', type: 'line', source: 'peru', 'source-layer': 'departamentos',
            paint: { 'line-color': '#fff', 'line-width': 1.5 },
          },
          { id: 'prov-fill', type: 'fill', source: 'peru', 'source-layer': 'provincias',
            paint: { 'fill-color': '#93c5fd', 'fill-opacity': 0.7 }, layout: { visibility: 'none' },
          },
          { id: 'prov-line', type: 'line', source: 'peru', 'source-layer': 'provincias',
            paint: { 'line-color': 'rgba(255,255,255,.5)', 'line-width': 0.8 }, layout: { visibility: 'none' },
          },
          { id: 'dist-fill', type: 'fill', source: 'peru', 'source-layer': 'distritos',
            paint: { 'fill-color': '#bfdbfe', 'fill-opacity': 0.7 }, layout: { visibility: 'none' },
          },
          { id: 'dist-line', type: 'line', source: 'peru', 'source-layer': 'distritos',
            paint: { 'line-color': 'rgba(255,255,255,.3)', 'line-width': 0.5 }, layout: { visibility: 'none' },
          },
        ],
      },
      center: [-75.0, -9.5], zoom: 5, minZoom: 4, maxZoom: 14, attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    // Rich hover popup — works at all 3 levels
    map.on('mousemove', (e) => {
      const lv = levelRef.current;
      const layerId = lv === 'distritos' ? 'dist-fill' : lv === 'provincias' ? 'prov-fill' : 'dept-fill';
      const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
      if (features.length) {
        const p = features[0].properties || {};
        const name = p.departamento || p.provincia || p.distrito || '?';
        const code = p.coddep || '';
        const ubigeo = p.ubigeo || '';
        map.getCanvas().style.cursor = 'pointer';
        if (!popupRef.current) popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14, maxWidth: '320px' });

        const levelLabel = lv === 'departamentos' ? 'Departamento' : lv === 'provincias' ? 'Provincia' : 'Distrito';
        let body = '';

        if ((lv === 'departamentos' || lv === 'provincias') && (window as any).__regionsByCode?.[code]) {
          const r = (window as any).__regionsByCode[code] as RegionData;
          const ranked = [...r.results].sort((a, b) => b.pct - a.pct);
          const winner = ranked[0];
          const maxPct = winner?.pct || 1;
          body += buildPopupHeader(name, levelLabel, r.pctActas, winner ? { name: winner.name, color: winner.color } : undefined);
          ranked.forEach((c, i) => { body += buildPopupRow(c, maxPct, i === 0); });
        } else if (lv === 'distritos' && (window as any).__candByUbigeo) {
          const onpeUbi = (window as any).__ineiToOnpe?.[ubigeo] || ubigeo;
          const cd = (window as any).__candByUbigeo?.[onpeUbi];
          if (cd?.top3?.length) {
            const rows = cd.top3.map((t: any) => {
              const candKey = PARTIDO_TO_CAND[String(Number(t.cod))] || '';
              return {
                key: candKey || String(t.cod),
                name: t.cand || t.partido || '?',
                party: t.partido || CAND_PARTIES[candKey] || '',
                color: candKey ? CAND_COLORS[candKey] : '#94a3b8',
                pct: t.pct ?? 0,
              };
            }).sort((a: any, b: any) => b.pct - a.pct);
            const winner = rows[0];
            const maxPct = winner?.pct || 1;
            body += buildPopupHeader(name, levelLabel, cd.pct, winner ? { name: winner.name, color: winner.color } : undefined);
            rows.forEach((c: any, i: number) => { body += buildPopupRow(c, maxPct, i === 0); });
          } else {
            body += buildPopupHeader(name, levelLabel);
            body += `<div style="font-size:11px;color:#94a3b8;padding:10px 0;text-align:center">Sin datos de candidatos</div>`;
          }
        } else {
          body += buildPopupHeader(name, levelLabel);
          body += `<div style="font-size:11px;color:#94a3b8;padding:10px 0;text-align:center">Sin datos disponibles</div>`;
        }

        const html = `<div style="font-family:Montserrat,sans-serif;min-width:260px">${body}</div>`;
        popupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map);
      } else {
        map.getCanvas().style.cursor = '';
        popupRef.current?.remove();
      }
    });

    // Click drill-down (click outside → go back)
    map.on('click', (e) => {
      // Dismiss popup on any click
      popupRef.current?.remove();
      const lv = levelRef.current;
      const layerId = lv === 'distritos' ? 'dist-fill' : lv === 'provincias' ? 'prov-fill' : 'dept-fill';
      const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
      if (!features.length) {
        // Click outside geometry → go back one level
        if (lv !== 'departamentos') {
          document.getElementById('lab-back-btn')?.click();
        }
        return;
      }
      const p = features[0].properties || {};
      const name = p.departamento || p.provincia || p.distrito || '?';
      const code = p.coddep || '';
      const region = (window as any).__regionsByCode?.[code] || null;

      if (region) setSelected(region);
      else setSelected({ name, winner: '?', winnerColor: '#94a3b8', winnerPct: 0, results: [] });

      // Calculate bounds from the clicked feature geometry
      const geom = features[0].geometry;
      let bounds: maplibregl.LngLatBounds | null = null;
      if (geom) {
        bounds = new maplibregl.LngLatBounds();
        const addCoords = (coords: any) => {
          if (typeof coords[0] === 'number') { bounds!.extend(coords as [number, number]); return; }
          for (const c of coords) addCoords(c);
        };
        addCoords((geom as any).coordinates);
      }

      if (lv === 'distritos') {
        // Final level — focus + show district data in sidebar
        const ineiUbi = p.ubigeo || '';
        const onpeUbi = (window as any).__ineiToOnpe?.[ineiUbi] || ineiUbi;
        const cd = (window as any).__candByUbigeo?.[onpeUbi];
        if (cd?.top3?.length) {
          const results = cd.top3.map((t: any) => {
            const candKey = PARTIDO_TO_CAND[String(Number(t.cod))] || '';
            return {
              key: candKey || t.cod, name: t.cand || t.partido || '?',
              party: t.partido || '', color: candKey ? CAND_COLORS[candKey] : '#94a3b8',
              pct: t.pct ?? 0,
            };
          });
          const winner = results[0];
          setSelected({
            name, winner: winner?.name || '?', winnerColor: winner?.color || '#94a3b8',
            winnerPct: winner?.pct || 0, results,
            pctActas: cd.pct,
          });
        }
        if (bounds) map.fitBounds(bounds, { padding: 80, duration: 800 });
        return;
      }

      if (lv === 'departamentos') {
        const coddep = p.coddep || '';
        selCodeRef.current = { coddep, codprov: '' };
        setLevel('provincias');
        setBreadcrumb([name]);
        // Show only provinces of this department
        map.setLayoutProperty('prov-fill', 'visibility', 'visible');
        map.setLayoutProperty('prov-line', 'visibility', 'visible');
        map.setFilter('prov-fill', ['==', ['get', 'coddep'], coddep]);
        map.setFilter('prov-line', ['==', ['get', 'coddep'], coddep]);
        // Darken non-selected departments
        map.setPaintProperty('dept-fill', 'fill-color', ['case', ['==', ['get', 'coddep'], coddep], 'rgba(255,255,255,0.1)', 'rgba(15,23,42,0.6)']);
        map.setPaintProperty('dept-fill', 'fill-opacity', 1);
        map.setPaintProperty('dept-line', 'line-color', ['case', ['==', ['get', 'coddep'], coddep], '#fff', 'rgba(255,255,255,0.15)']);
        if (bounds) map.fitBounds(bounds, { padding: 60, duration: 1200 });
        else map.flyTo({ center: e.lngLat, zoom: 7.5, duration: 1200 });
      } else if (lv === 'provincias') {
        const codprov = p.codprov || '';
        const coddep = selCodeRef.current.coddep;
        selCodeRef.current.codprov = codprov;
        setLevel('distritos');
        setBreadcrumb(prev => [...prev, name]);
        // Show only districts of this province
        map.setLayoutProperty('dist-fill', 'visibility', 'visible');
        map.setLayoutProperty('dist-line', 'visibility', 'visible');
        map.setFilter('dist-fill', ['all', ['==', ['get', 'coddep'], coddep], ['==', ['get', 'codprov'], codprov]]);
        map.setFilter('dist-line', ['all', ['==', ['get', 'coddep'], coddep], ['==', ['get', 'codprov'], codprov]]);
        // Darken non-selected provinces
        map.setPaintProperty('prov-fill', 'fill-color', ['case',
          ['==', ['get', 'codprov'], codprov], 'rgba(255,255,255,0.1)',
          'rgba(15,23,42,0.4)'
        ]);
        map.setPaintProperty('prov-fill', 'fill-opacity', 1);
        if (bounds) map.fitBounds(bounds, { padding: 60, duration: 1200 });
        else map.flyTo({ center: e.lngLat, zoom: 10, duration: 1200 });
      }
    });

    mapRef.current = map;
    window.addEventListener('resize', () => map.resize());
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Apply colors + expose regionsByCode to popup handler
  useEffect(() => {
    (window as any).__regionsByCode = regionsByCode;
    const map = mapRef.current;
    if (!map || typeof deptColorExpr === 'string') return;
    const apply = () => {
      try {
        if (levelRef.current === 'departamentos') {
          map.setPaintProperty('dept-fill', 'fill-color', deptColorExpr);
          map.setPaintProperty('dept-fill', 'fill-opacity', 0.85);
        }
      } catch (e) { console.warn('color apply:', e); }
    };
    if (map.isStyleLoaded()) { apply(); map.once('idle', apply); }
    else map.once('load', () => map.once('idle', apply));
  }, [deptColorExpr, regionsByCode]);

  // Color provinces by aggregated winner from candData (in-memory, no static JSON file needed).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const expr = provColorExprFromData ?? (typeof deptColorExpr !== 'string' ? deptColorExpr : null);
    if (!expr) return;
    provColorExprRef.current = expr;
    const apply = () => { try { map.setPaintProperty('prov-fill', 'fill-color', expr); } catch {} };
    if (map.isStyleLoaded()) { apply(); map.once('idle', apply); }
    else map.once('load', () => { apply(); map.once('idle', apply); });
  }, [provColorExprFromData, deptColorExpr]);

  // Expose candData + INEI→ONPE mapping for popup/click handlers
  useEffect(() => {
    if (candData?.distritos) {
      const byUbi: Record<string, any> = {};
      for (const d of candData.distritos) byUbi[d.ubigeo] = d;
      (window as any).__candByUbigeo = byUbi;
    }
    (window as any).__ineiToOnpe = ineiToOnpe;
  }, [candData, ineiToOnpe]);

  // Color districts using in-memory winner map derived from candData.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !distColorExprFromData) return;
    distColorExprRef.current = distColorExprFromData;
    const apply = () => {
      try { map.setPaintProperty('dist-fill', 'fill-color', distColorExprFromData); } catch (e) { console.warn('dist color:', e); }
    };
    if (map.isStyleLoaded()) { apply(); map.once('idle', apply); }
    else map.once('load', () => { apply(); map.once('idle', apply); });
  }, [distColorExprFromData]);

  // Restore ALL paint properties to their data-driven originals
  const restoreAllColors = useCallback((map: maplibregl.Map) => {
    // Clear all filters
    ['prov-fill', 'prov-line', 'dist-fill', 'dist-line'].forEach(l => { try { map.setFilter(l, null); } catch {} });
    // Dept: restore color expression + opacity
    if (typeof deptColorExpr !== 'string') {
      try { map.setPaintProperty('dept-fill', 'fill-color', deptColorExpr); } catch {}
    }
    map.setPaintProperty('dept-fill', 'fill-opacity', 0.85);
    map.setPaintProperty('dept-line', 'line-color', '#fff');
    // Prov: restore cached color expression
    if (provColorExprRef.current) {
      try { map.setPaintProperty('prov-fill', 'fill-color', provColorExprRef.current); } catch {}
    }
    map.setPaintProperty('prov-fill', 'fill-opacity', 0.7);
    // Dist: restore cached color expression
    if (distColorExprRef.current) {
      try { map.setPaintProperty('dist-fill', 'fill-color', distColorExprRef.current); } catch {}
    }
    map.setPaintProperty('dist-fill', 'fill-opacity', 0.7);
  }, [deptColorExpr]);

  const goBack = useCallback(() => {
    const map = mapRef.current; if (!map) return;
    popupRef.current?.remove();
    if (level === 'distritos') {
      setLevel('provincias');
      // Hide districts
      map.setLayoutProperty('dist-fill', 'visibility', 'none');
      map.setLayoutProperty('dist-line', 'visibility', 'none');
      map.setFilter('dist-fill', null);
      map.setFilter('dist-line', null);
      // Restore province colors (were darkened)
      if (provColorExprRef.current) {
        try { map.setPaintProperty('prov-fill', 'fill-color', provColorExprRef.current); } catch {}
      }
      map.setPaintProperty('prov-fill', 'fill-opacity', 0.7);
      selCodeRef.current.codprov = '';
      map.flyTo({ zoom: Math.max(map.getZoom() - 2, 7), duration: 800 });
      setBreadcrumb(prev => prev.slice(0, 1));
    } else if (level === 'provincias') {
      setLevel('departamentos');
      // Hide provinces
      map.setLayoutProperty('prov-fill', 'visibility', 'none');
      map.setLayoutProperty('prov-line', 'visibility', 'none');
      // Restore dept colors
      restoreAllColors(map);
      selCodeRef.current = { coddep: '', codprov: '' };
      map.flyTo({ center: [-75, -9.5], zoom: 5, duration: 800 });
      setBreadcrumb([]);
    }
    setSelected(null);
  }, [level, restoreAllColors]);

  const goHome = useCallback(() => {
    const map = mapRef.current; if (!map) return;
    popupRef.current?.remove();
    setLevel('departamentos');
    ['prov-fill', 'prov-line', 'dist-fill', 'dist-line'].forEach(l => map.setLayoutProperty(l, 'visibility', 'none'));
    restoreAllColors(map);
    selCodeRef.current = { coddep: '', codprov: '' };
    map.flyTo({ center: [-75, -9.5], zoom: 5, duration: 800 });
    setBreadcrumb([]); setSelected(null);
  }, [restoreAllColors]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: '#f0f4f8' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Breadcrumb */}
        <div style={{
          position: 'absolute', top: 16, left: 16, zIndex: 5,
          display: 'flex', gap: 6, alignItems: 'center',
          background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(10px)',
          padding: '10px 16px', borderRadius: 12, boxShadow: '0 4px 20px rgba(15,23,42,.08)',
          fontSize: 13, fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
        }}>
          <button
            onClick={goHome}
            style={{ all: 'unset', cursor: 'pointer', color: '#0891b2', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Landmark size={14} strokeWidth={2.2} />
            <span>Perú</span>
          </button>
          {breadcrumb.map((b, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ChevronRight size={14} color="#cbd5e1" strokeWidth={2} />
              <span style={{ color: i === breadcrumb.length - 1 ? '#0f172a' : '#94a3b8' }}>{b}</span>
            </span>
          ))}
        </div>

        {/* Level badge */}
        <div style={{
          position: 'absolute', top: 16, right: 396, zIndex: 5,
          background: level === 'departamentos' ? '#0891b2' : level === 'provincias' ? '#7c3aed' : '#059669',
          color: '#fff', padding: '6px 14px', borderRadius: 8,
          fontSize: 10.5, letterSpacing: 1.5, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
          transition: 'background .3s',
          display: 'inline-flex', alignItems: 'center', gap: 7,
        }}>
          {level === 'departamentos' ? <MapIcon size={13} strokeWidth={2.4} /> : level === 'provincias' ? <MapPin size={13} strokeWidth={2.4} /> : <Building2 size={13} strokeWidth={2.4} />}
          <span>{level === 'departamentos' ? 'DEPARTAMENTOS' : level === 'provincias' ? 'PROVINCIAS' : 'DISTRITOS'}</span>
        </div>

        {level !== 'departamentos' && (
          <button id="lab-back-btn" onClick={goBack} style={{
            position: 'absolute', bottom: 80, left: 16, zIndex: 5,
            padding: '10px 18px', background: '#fff', border: '1px solid rgba(15,23,42,.08)',
            borderRadius: 10, boxShadow: '0 4px 14px rgba(15,23,42,.08)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'transform .15s',
          }} onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
             onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <ArrowLeft size={16} strokeWidth={2.4} />
              Volver
            </span>
          </button>
        )}
      </div>

      {/* SIDEBAR — live summary */}
      <div style={{
        width: 380, background: '#fff', borderLeft: '1px solid rgba(15,23,42,.06)',
        padding: '20px 22px', overflowY: 'auto', flexShrink: 0,
        transition: 'all .3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 10, letterSpacing: 2, fontWeight: 800, color: '#059669', fontFamily: 'JetBrains Mono, monospace' }}>EN VIVO</span>
          <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', marginLeft: 'auto' }}>
            {presData?.pctActas?.toFixed(2) ?? '—'}% actas
          </span>
        </div>

        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 22, fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
          {selected ? selected.name : 'Mapa Electoral'}
        </h2>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 20px' }}>
          {selected ? `${selected.pctActas?.toFixed(2) ?? '—'}% actas · ganador: ${selected.winner.split(' ').slice(-2, -1)[0] || selected.winner.split(' ').pop()}` : 'Click en un departamento para explorar'}
        </p>

        {selected && selected.results.length > 0 ? (
          <>
            {/* Winner hero */}
            <div style={{
              padding: 16, borderRadius: 12, marginBottom: 16,
              background: `linear-gradient(135deg, ${selected.winnerColor}18, ${selected.winnerColor}08)`,
              border: `1px solid ${selected.winnerColor}30`,
            }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 800, color: selected.winnerColor, fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>
                GANADOR EN {selected.name.toUpperCase()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CandidatePhoto
                  dni={CAND_DNI[selected.results[0]?.key] || undefined}
                  nombre={selected.winner}
                  color={selected.winnerColor}
                  size={56}
                  ring={false}
                />
                <div>
                  <div style={{ fontFamily: 'Montserrat', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    {selected.winner}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {selected.results[0]?.party}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: selected.winnerColor, marginTop: 2 }}>
                    {selected.winnerPct.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* All candidates */}
            <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>
              TODOS LOS CANDIDATOS
            </div>
            {selected.results.map((c, i) => {
              const maxPct = selected.results[0].pct || 1;
              return (
                <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? '1px solid rgba(15,23,42,.04)' : 'none' }}>
                  <CandidatePhoto
                    dni={CAND_DNI[c.key] || undefined}
                    nombre={c.name}
                    color={c.color}
                    size={38}
                    ring={false}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{c.party}</div>
                    <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(c.pct / maxPct) * 100}%`, background: c.color, borderRadius: 2, transition: 'width .6s ease' }} />
                    </div>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: c.color, minWidth: 55, textAlign: 'right' }}>
                    {c.pct.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </>
        ) : !selected ? (
          <>
            {/* Nacional summary when nothing selected */}
            <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginBottom: 10 }}>
              RESULTADO NACIONAL
            </div>
            {(() => {
              const ranked = CAND_KEYS
                .map(k => ({ k, pct: presData?.projection?.[k] ?? 0 }))
                .sort((a, b) => b.pct - a.pct);
              const maxPct = ranked[0]?.pct || 1;
              return ranked.map(({ k, pct }, i) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? '1px solid rgba(15,23,42,.04)' : 'none' }}>
                  <CandidatePhoto dni={CAND_DNI[k]} nombre={CAND_NAMES[k]} color={CAND_COLORS[k]} size={38} ring={false} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{CAND_NAMES[k]}</div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{CAND_PARTIES[k]}</div>
                    <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(pct / maxPct) * 100}%`, background: CAND_COLORS[k], borderRadius: 2 }} />
                    </div>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: CAND_COLORS[k], minWidth: 55, textAlign: 'right' }}>
                    {pct.toFixed(2)}%
                  </div>
                </div>
              ));
            })()}
          </>
        ) : (
          <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Sin datos para esta zona.
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(5,150,105,.5)} 50%{box-shadow:0 0 0 6px rgba(5,150,105,0)} }
        .maplibregl-popup-content { background:rgba(255,255,255,.97) !important; backdrop-filter:blur(10px); border:1px solid rgba(15,23,42,.08) !important; border-radius:12px !important; box-shadow:0 8px 24px rgba(15,23,42,.12) !important; padding:12px 16px !important; }
        .maplibregl-popup-tip { border-top-color:rgba(255,255,255,.97) !important; }
      `}</style>
    </div>
  );
}
