import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type Map as MLMap, type MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface DistritoActas {
  dept: string; prov: string; dist: string; ubigeo: string;
  contab: number; total: number; faltantes: number; enviadasJee?: number; pendientesJee?: number;
  pct: number;
  votosEmitidos: number; electoresHabiles: number;
  participacion?: number | null;
}
interface Candidato { cod: string; partido: string; cand: string; votos: number; pct: number; }
interface DistCand {
  ubigeo: string; dept: string; prov: string; dist: string;
  pct: number; participacion?: number | null;
  votosEmitidos: number;
  ganador: Candidato | null;
  margen: number | null;
  top3: Candidato[];
}
interface CandSnap { scrapedAt: string; distritos: DistCand[]; }
interface PresData {
  projection?: Record<string, number>;     // { fujimori: 38.1, ... }
  votes?: Record<string, number>;          // total votes per candidate
  regions?: any[];
}

type Metric = 'jee' | 'cola' | 'total' | 'ganador' | 'margen' | 'contado' | 'participacion';

// Paleta de partidos (presidencial 2026)
const PARTY_COLOR: Record<string, string> = {
  '8':  '#F58220', // Fuerza Popular (Keiko) naranja
  '35': '#12B3CC', // Renovación Popular (RLA) cian
  '16': '#F5B300', // Juntos por el Perú (Sánchez) amarillo
  '10': '#E30613', // Partido del Buen Gobierno (Nieto) rojo
  '14': '#F4C300', // País para Todos (Belmont) amarillo oscuro
  '23': '#FF6B00', // naranja-rojo
  '2':  '#800020', // vino
  '18': '#6B46C1', // morado
  '11': '#059669', // verde
  '21': '#0891b2', // teal
  '25': '#db2777', // rosa
  '40': '#4B5563', // gris
};
const colorParty = (cod?: string) => (cod && PARTY_COLOR[String(Number(cod))]) || '#94a3b8';

// ─── Expresión de paint por métrica
function stepExpr(key: string, stops: number[], colors: string[]): any {
  const step: any[] = ['step', ['feature-state', key], colors[0]];
  for (let i = 0; i < stops.length; i++) { step.push(stops[i]); step.push(colors[i + 1]); }
  return ['case', ['!=', ['feature-state', key], null], step, '#eef1f5'];
}
function paintExprFor(m: Metric): any {
  switch (m) {
    case 'ganador':
      return ['case', ['!=', ['feature-state', 'ganColor'], null], ['feature-state', 'ganColor'], '#eef1f5'];
    case 'jee':
      return stepExpr('jee',        [1, 5, 20, 50],  ['#ffffff','#fef3c7','#fdba74','#ef4444','#7f1d1d']);
    case 'cola':
      return stepExpr('cola',       [1, 5, 20, 50],  ['#ffffff','#fef3c7','#fdba74','#ef4444','#7f1d1d']);
    case 'total':
      return stepExpr('total',      [1, 10, 40, 100],['#ffffff','#fef3c7','#fdba74','#ef4444','#7f1d1d']);
    case 'contado':
      return stepExpr('contado',    [50, 80, 95, 99],['#7f1d1d','#ef4444','#fdba74','#fef3c7','#ffffff']);
    case 'participacion':
      return stepExpr('participacion',[50,60,70,80], ['#f1f5f9','#bae6fd','#38bdf8','#0891b2','#0c4a6e']);
    case 'margen':
      return stepExpr('margen',     [5, 10, 20, 40], ['#fde68a','#fb923c','#ef4444','#7f1d1d','#450a0a']);
  }
}

const METRIC_META: Record<Metric, { label: string; sub: string; legend: { color: string; label: string }[] }> = {
  jee:           { label: 'En JEE',         sub: 'Actas en el Jurado Electoral', legend: [{color:'#ffffff',label:'0'},{color:'#fef3c7',label:'1–4'},{color:'#fdba74',label:'5–19'},{color:'#ef4444',label:'20–49'},{color:'#7f1d1d',label:'50+'}] },
  cola:          { label: 'Pendientes',     sub: 'Actas aún no enviadas al JEE', legend: [{color:'#ffffff',label:'0'},{color:'#fef3c7',label:'1–4'},{color:'#fdba74',label:'5–19'},{color:'#ef4444',label:'20–49'},{color:'#7f1d1d',label:'50+'}] },
  total:         { label: 'Total faltan',   sub: 'JEE + pendientes', legend: [{color:'#ffffff',label:'0'},{color:'#fef3c7',label:'1–9'},{color:'#fdba74',label:'10–39'},{color:'#ef4444',label:'40–99'},{color:'#7f1d1d',label:'100+'}] },
  ganador:       { label: 'Ganador',        sub: 'Candidato con más votos', legend: [] },
  margen:        { label: 'Margen',         sub: 'Diferencia 1° vs 2° (pp)', legend: [{color:'#fde68a',label:'<5'},{color:'#fb923c',label:'5–10'},{color:'#ef4444',label:'10–20'},{color:'#7f1d1d',label:'20–40'},{color:'#450a0a',label:'40+'}] },
  contado:       { label: '% Contado',      sub: 'Actas publicadas por ONPE', legend: [{color:'#7f1d1d',label:'<50%'},{color:'#ef4444',label:'50–80'},{color:'#fdba74',label:'80–95'},{color:'#fef3c7',label:'95–99'},{color:'#ffffff',label:'≥99'}] },
  participacion: { label: 'Participación',  sub: 'Asistentes / padrón', legend: [{color:'#f1f5f9',label:'<50%'},{color:'#bae6fd',label:'50–60'},{color:'#38bdf8',label:'60–70'},{color:'#0891b2',label:'70–80'},{color:'#0c4a6e',label:'80+'}] },
};
interface Snapshot {
  scrapedAt: string;
  nacional: { contabilizadas: number; totalActas: number; faltantes: number; pendientesJee?: number; enviadasJee: number; pct: number; votosEmitidos: number };
  distritos: DistritoActas[];
  departamentos: { dept: string; faltantes: number; enviadasJee?: number; pct: number; distritos: number; total: number; contab: number }[];
}

// ──────────────────────── Escala por CANTIDAD absoluta de actas faltantes
// Bucketizada según distribución real: 46% tiene 0, 47% tiene 1-4, cola larga hasta 209.
// ROJO oscuro = muchas faltantes · BLANCO = ya terminado.
const COLOR_SCALE = [
  { max: 1,   bg: '#ffffff', label: '0 (completo)' },
  { max: 5,   bg: '#fef3c7', label: '1–4' },
  { max: 20,  bg: '#fdba74', label: '5–19' },
  { max: 50,  bg: '#ef4444', label: '20–49' },
  { max: 9999,bg: '#7f1d1d', label: '50+' },
];
function colorFor(faltantes: number): string {
  for (const s of COLOR_SCALE) if (faltantes < s.max) return s.bg;
  return '#7f1d1d';
}
function colorForMetric(v: number, metric: Metric): string {
  if (metric === 'total') {
    if (v < 1) return '#ffffff';
    if (v < 10) return '#fef3c7';
    if (v < 40) return '#fdba74';
    if (v < 100) return '#ef4444';
    return '#7f1d1d';
  }
  return colorFor(v);
}

// ──────────────────────── CSS
const PULSO_CSS = `
.pulso-page{ position:relative; height:calc(100vh - 60px); min-height:640px; width:100%; background:#dfe7f0; overflow:hidden; color:#0f172a; font-family: 'Pontano Sans', -apple-system, sans-serif; }
.pulso-map{ position:absolute; inset:0; width:100%; height:100%; background:#dfe7f0; }
.pulso-map .maplibregl-map{ width:100% !important; height:100% !important; }
.pulso-sidebar{
  position:absolute; left:18px; top:18px; bottom:18px; width:360px; z-index:5;
  background:#fff; border:1px solid rgba(15,23,42,.08); border-radius:14px;
  box-shadow: 0 8px 30px rgba(15,23,42,.10);
  padding:18px 20px 14px; display:flex; flex-direction:column; overflow:hidden;
}
.pulso-legend{
  position:absolute; right:18px; top:18px; z-index:5;
  background:#fff; border:1px solid rgba(15,23,42,.08); border-radius:10px;
  box-shadow: 0 4px 14px rgba(15,23,42,.08);
  padding:10px 14px; font-size:11px;
}
.pulso-toast{
  position:absolute; right:18px; bottom:18px; z-index:5;
  background:#fff; border:1px solid rgba(15,23,42,.08); border-radius:10px;
  box-shadow: 0 4px 14px rgba(15,23,42,.08);
  padding:10px 14px; font-size:12px; font-family:'JetBrains Mono',monospace;
  color:#475569;
}
.pulso-live-tag{ display:inline-flex; align-items:center; gap:6px; font-size:9.5px; letter-spacing:1.6px; font-weight:800; color:#dc2626; background:rgba(220,38,38,.08); padding:3px 8px; border-radius:4px; font-family:'JetBrains Mono',monospace; }
.pulso-live-tag .dot{ width:6px; height:6px; border-radius:50%; background:#dc2626; animation: pulso-ping 1.4s infinite; }
@keyframes pulso-ping { 0%{box-shadow:0 0 0 0 rgba(220,38,38,.5)} 100%{box-shadow:0 0 0 10px rgba(220,38,38,0)} }
.pulso-title{ font-family:'Montserrat', sans-serif; font-weight:700; font-size:24px; line-height:1.15; margin:10px 0 2px; color:#0f172a; letter-spacing:-0.5px; }
.pulso-sub{ font-size:11px; color:#64748b; margin-bottom:12px; }
.pulso-big-num{ font-family:'JetBrains Mono',monospace; font-size:30px; font-weight:700; color:#dc2626; letter-spacing:-1.2px; line-height:1; }
.pulso-big-label{ font-size:9px; letter-spacing:1.4px; color:#94a3b8; font-weight:700; margin-top:3px; font-family:'JetBrains Mono',monospace; }
.pulso-progress{ height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden; display:flex; margin:12px 0 4px; }
.pulso-progress-done{ background:linear-gradient(90deg, #059669, #34d399); }
.pulso-progress-left{ background:#dc2626; }
.pulso-search{
  width:100%; padding:10px 12px; margin-top:12px; font-size:13px;
  background:#f6f8fb; color:#0f172a; border:1px solid rgba(15,23,42,.08);
  border-radius:8px; font-family:'JetBrains Mono',monospace; outline:none; transition:all .15s;
}
.pulso-search:focus{ border-color:#0891b2; background:#fff; box-shadow:0 0 0 3px rgba(8,145,178,.12); }
.pulso-list{ flex:1; overflow-y:auto; margin-top:10px; margin-right:-6px; padding-right:6px; }
.pulso-list::-webkit-scrollbar{ width:6px }
.pulso-list::-webkit-scrollbar-thumb{ background:rgba(15,23,42,.15); border-radius:3px }
.pulso-row{
  display:grid; grid-template-columns:12px 1fr auto; gap:10px; align-items:center;
  padding:8px 4px; border-bottom:1px solid rgba(15,23,42,.05);
  cursor:pointer; transition:background .12s;
}
.pulso-row:hover{ background:rgba(8,145,178,.04); }
.pulso-row.active{ background:rgba(8,145,178,.12); border-radius:6px; border-bottom-color:transparent; }
.pulso-dot{ width:12px; height:12px; border-radius:3px; border:1px solid rgba(15,23,42,.14); }
.pulso-row-name{ font-size:12.5px; font-weight:600; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pulso-row-sub{ font-size:10px; color:#94a3b8; font-family:'JetBrains Mono',monospace; margin-top:1px; }
.pulso-row-val{ text-align:right; font-family:'JetBrains Mono',monospace; font-size:13px; font-weight:700; color:#dc2626; }
.pulso-row-val small{ display:block; font-size:9px; color:#94a3b8; font-weight:700; letter-spacing:1.2px; }
.legend-swatch{ display:flex; align-items:center; gap:6px; margin-top:6px; font-family:'JetBrains Mono',monospace; font-size:10.5px; color:#475569; }
.legend-swatch i{ width:18px; height:10px; border:1px solid rgba(15,23,42,.15); border-radius:2px; display:inline-block; flex-shrink:0; }

.pulso-metric-bar{
  position:absolute; left:50%; top:18px; transform:translateX(-50%); z-index:5;
  display:flex; gap:4px; padding:5px; border-radius:999px;
  background:rgba(255,255,255,.95); backdrop-filter: blur(10px);
  border:1px solid rgba(15,23,42,.08); box-shadow: 0 4px 20px rgba(15,23,42,.08);
}
.pulso-metric-bar .pmb{
  all:unset; padding:7px 14px; font-size:11.5px; font-weight:600;
  color:#64748b; cursor:pointer; border-radius:999px; transition:all .15s;
  font-family:inherit;
}
.pulso-metric-bar .pmb:hover{ color:#0f172a; background:rgba(8,145,178,.08); }
.pulso-metric-bar .pmb.active{ background:#0f172a; color:#fff; box-shadow:0 2px 6px rgba(15,23,42,.15); }

.pulso-sim{
  position:absolute; right:18px; bottom:18px; z-index:5;
  width:340px; max-height: calc(100vh - 210px);
  background:#fff; border:1px solid rgba(15,23,42,.08);
  border-radius:14px; padding:16px 18px;
  box-shadow: 0 8px 28px rgba(15,23,42,.10);
  overflow-y:auto;
  font-family: 'Pontano Sans', sans-serif;
}
.pulso-reopen{
  all:unset; cursor:pointer; z-index:6;
  position:absolute; left:18px; bottom:18px;
  display:flex; align-items:center; gap:10px;
  padding:10px 14px; background:#fff;
  border:1px solid rgba(15,23,42,.08); border-radius:999px;
  box-shadow:0 4px 16px rgba(15,23,42,.10);
  transition: transform .15s;
}
.pulso-reopen:hover{ transform: translateY(-2px); }

.sim-toggle{
  all:unset; cursor:pointer; z-index:6; position:absolute;
  right:18px; bottom:18px; padding:9px 16px;
  background:#fff; border:1px solid rgba(15,23,42,.12); border-radius:999px;
  font-size:12px; font-weight:700; color:#0f172a;
  box-shadow:0 4px 14px rgba(15,23,42,.10);
  font-family: inherit; transition: all .15s;
}
.sim-toggle:hover{ transform: translateY(-1px); border-color:#0891b2; color:#0891b2; }
.sim-toggle.on{
  background: linear-gradient(135deg, #0891b2, #22d3ee);
  color:#fff; border-color:#0891b2;
  box-shadow: 0 4px 18px rgba(8,145,178,.35);
}
.sim-hint{
  position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); z-index:5;
  background:rgba(255,255,255,.97); backdrop-filter: blur(8px);
  padding:20px 28px; border-radius:14px;
  border:1px dashed #0891b2;
  box-shadow: 0 8px 28px rgba(15,23,42,.08);
  font-size:13px; color:#0f172a; text-align:center;
  max-width:320px;
  pointer-events:none;
}
.sim-hint strong{ color:#0891b2; }
.sim-row{
  display:grid; grid-template-columns: 1fr 160px; gap:10px; align-items:center;
  padding:6px 0; border-top:1px solid rgba(15,23,42,.04);
}
.sim-row:first-of-type{ border-top:0; }
.sim-num{
  width:52px; padding:3px 6px; font-size:11px; text-align:center;
  border:1px solid rgba(15,23,42,.15); border-radius:5px;
  font-family:'JetBrains Mono',monospace; font-weight:700; color:#0f172a;
  background:#fff;
}
.sim-num:focus{ outline:none; border-color:#0891b2; box-shadow:0 0 0 2px rgba(8,145,178,.2); }
.sim-mini-btn{
  all:unset; cursor:pointer; padding:3px 8px; font-size:10px; font-weight:700;
  border:1px solid rgba(15,23,42,.12); border-radius:5px;
  color:#475569; font-family:inherit; transition: all .1s;
}
.sim-mini-btn:hover:not(:disabled){ background:#0891b2; color:#fff; border-color:#0891b2; }
.sim-mini-btn:disabled{ opacity:.4; cursor:not-allowed; }
.sim-sum{
  font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:800;
  padding:3px 8px; border-radius:4px;
}
.sim-sum.ok{ color:#059669; background:#d1fae5; }
.sim-sum.err{ color:#dc2626; background:#fee2e2; }

/* ─── RESPONSIVE ─── */
@media (max-width: 860px) {
  .pulso-page{ height: calc(100vh - 56px); min-height: 0; }
  .pulso-sidebar{
    left:8px; right:8px; bottom:8px; top:auto;
    width:auto; max-height: 44vh; padding:12px 14px;
    border-radius:14px;
  }
  .pulso-title{ font-size: 20px; margin-top:6px; }
  .pulso-big-num{ font-size: 22px; }
  .pulso-sub{ font-size:10px; margin-bottom:8px; }
  .pulso-search{ padding:8px 10px; font-size:12px; margin-top:10px; }
  .pulso-row{ padding:6px 4px; gap:8px; }
  .pulso-row-name{ font-size:12px; }
  .pulso-row-sub{ font-size:9.5px; }
  .pulso-row-val{ font-size:12px; }
  /* Legend horizontal compacta, debajo del pill bar */
  .pulso-legend{
    left:8px; right:8px; top:62px; bottom:auto; padding:6px 10px;
    display:flex; align-items:center; gap:10px; flex-wrap:wrap;
    font-family:'JetBrains Mono',monospace;
  }
  .pulso-legend > div:first-child{ white-space:nowrap; font-size:9px; margin:0; }
  .pulso-legend .legend-swatch{ font-size: 9px; margin:0; }
  .pulso-legend .legend-swatch i{ width:12px; height:7px; }
  .pulso-metric-bar{ top:10px; padding:3px; gap:3px; flex-wrap:wrap; justify-content:center; max-width: calc(100vw - 20px); }
  .pulso-metric-bar .pmb{ padding:6px 10px; font-size:11px; }
  .pulso-sim{
    left:8px; right:8px; bottom:auto; top:auto; width:auto;
    max-height: 40vh; padding:12px 14px;
    /* cuando el sidebar está abierto, el sim va arriba */
    top: 112px;
  }
  .pulso-toast{ display:none; }
  .pulso-reopen{ left:8px; bottom:8px; padding:8px 12px; font-size:11px; }
}
@media (max-width: 480px) {
  .pulso-sidebar{ max-height: 50vh; padding:10px 12px; }
  .pulso-title{ font-size: 18px; }
  .pulso-big-num{ font-size: 20px; }
  .pulso-metric-bar .pmb{ padding:5px 8px; font-size:10.5px; }
  .pulso-legend{ top:58px; font-size:9.5px; padding:5px 8px; gap:7px; }
  .pulso-legend > div:first-child{ font-size:8.5px; }
  .pulso-sim{ top: 100px; max-height:38vh; padding:10px 12px; }
}
.pulso-page .maplibregl-popup-content{ background:#fff !important; padding:10px 14px !important; border-radius:10px !important; box-shadow: 0 6px 18px rgba(15,23,42,.12) !important; border:1px solid rgba(15,23,42,.08) !important; }
.pulso-page .maplibregl-popup-tip{ display:block !important; border-top-color:#fff !important; border-bottom-color:#fff !important; }
.pulso-page .maplibregl-ctrl-group{ box-shadow:0 4px 14px rgba(15,23,42,.08) !important; }
`;

// Normaliza: uppercase, sin tildes, sin guiones/underscores/parens, espacios únicos
function norm(s: string): string {
  return s.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, '')   // quita contenido en paréntesis: "QUISQUI (KICHKI)" → "QUISQUI"
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase().trim();
}
// Aliases distrito: nombre en geojson → nombre en ONPE (tras norm())
const DIST_ALIASES: Record<string, string> = {
  'NASCA': 'NAZCA', 'NAZCA': 'NASCA',
  'CAPAZO': 'CAPASO',
  'SANTA RITA DE SIGUAS': 'SANTA RITA DE SIHUAS',
  'SAN FRANCISCO DE RAVACAYCO': 'SAN FRANCISCO DE RIVACAYCO',
  'HUAYLLO': 'IHUAYLLO',
  'HUAYLLAY GRANDE': 'HUALLAY GRANDE',
  'SAN JUAN DE YSCOS': 'SAN JUAN DE ISCOS',
  'MAGDALENA VIEJA': 'PUEBLO LIBRE',
  'RAYMONDI': 'RAIMONDI',
  'DANIEL ALOMIAS ROBLES': 'DANIEL ALOMIA ROBLES',
  'MILPUC': 'MILPUCC',
  'HUAYA': 'HUALLA',
  'AYAUCA': 'AYAVIRI',
};
// Aliases provincia: typos del geojson INEI
const PROV_ALIASES: Record<string, string> = {
  'PUIRA': 'PIURA',
  'VICTOR FAFARDO': 'VICTOR FAJARDO',
};

export function ActasPage() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [candSnap, setCandSnap] = useState<CandSnap | null>(null);
  const [q, setQ] = useState('');
  const [metric, setMetric] = useState<Metric>('jee');
  const [selSet, setSelSet] = useState<Set<string>>(new Set());  // ONPE ubigeos seleccionados
  const [hoverDist, setHoverDist] = useState<DistritoActas | null>(null);
  const [simMode, setSimMode] = useState(false);
  useEffect(() => { (window as any).__simMode = simMode; }, [simMode]);
  const [simAlloc, setSimAlloc] = useState<Record<string, number>>({});  // cod → %
  const [pres, setPres] = useState<PresData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth > 860 : true);
  const mapRef = useRef<MLMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const selRef = useRef<Set<string>>(new Set());
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // ── Fetch data
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [r, rc, rp] = await Promise.all([
          fetch(`/api/actas?t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`/api/actas-candidatos?t=${Date.now()}`, { cache: 'no-store' }).catch(() => null as any),
          fetch(`/api/onpe?t=${Date.now()}`, { cache: 'no-store' }).catch(() => null as any),
        ]);
        if (r.ok) { const j: Snapshot = await r.json(); if (alive) setSnap(j); }
        if (rc && rc.ok) { const cj: CandSnap = await rc.json(); if (alive) setCandSnap(cj); }
        if (rp && rp.ok) { const pj: PresData = await rp.json(); if (alive) setPres(pj); }
      } catch {}
    }
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // ── Lookup ubigeo ONPE → distrito
  const dataByUbigeo = useMemo(() => {
    const m: Record<string, DistritoActas> = {};
    if (snap) for (const d of snap.distritos) m[d.ubigeo] = d;
    return m;
  }, [snap]);

  // ── El geojson GADM+ubigeo ya trae el ONPE ubigeo inyectado como f.properties.ubigeo.
  // No hace falta matching por nombre. feature.id == ubigeo ONPE.

  // ── Lookup candidato ONPE ubigeo → DistCand
  const candByUbigeo = useMemo(() => {
    const m: Record<string, DistCand> = {};
    if (candSnap) for (const d of candSnap.distritos) m[d.ubigeo] = d;
    return m;
  }, [candSnap]);

  // ── Init map (una vez)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#dfe7f0' } }],
      },
      center: [-75.0, -9.5],
      zoom: 5.0,
      minZoom: 4.2,
      maxZoom: 12,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    const onWinResize = () => map.resize();
    window.addEventListener('resize', onWinResize);
    map.on('load', () => {
      map.resize();
      // Fuentes: distrito (pintado), provincia (separador medio), depto (separador fuerte)
      map.addSource('distritos', { type: 'geojson', data: '/peru-distritos.geojson', promoteId: 'ubigeo' });
      map.addSource('provincias', { type: 'geojson', data: '/peru-provincias.geojson' });
      map.addSource('departamentos', { type: 'geojson', data: '/peru-departamentos.geojson' });

      // Fill distrito — coloreado por actas faltantes con antialiasing
      map.addLayer({
        id: 'dist-fill',
        type: 'fill',
        source: 'distritos',
        paint: {
          'fill-color': [
            'case',
            ['!=', ['feature-state', 'falt'], null],
            [
              'step', ['feature-state', 'falt'],
              '#ffffff',
              1,  '#fef3c7',
              5,  '#fdba74',
              20, '#ef4444',
              50, '#7f1d1d',
            ],
            '#eef1f5',
          ],
          'fill-opacity': 0.92,
          'fill-antialias': true,
        },
      });

      // Borde distrito — muy fino, blanco (casi invisible, solo separación)
      map.addLayer({
        id: 'dist-line',
        type: 'line',
        source: 'distritos',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#0891b2',
            ['boolean', ['feature-state', 'highlighted'], false], '#0891b2',
            'rgba(255,255,255,.85)',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 2.4,
            ['boolean', ['feature-state', 'highlighted'], false], 1.6,
            0.4,
          ],
        },
      });

      // Borde provincia — casi invisible, sutil (solo al zoom)
      map.addLayer({
        id: 'prov-line',
        type: 'line',
        source: 'provincias',
        paint: {
          'line-color': 'rgba(15,23,42,.12)',
          'line-width': 0.5,
        },
      });

      // Borde departamento — gris suave, sin casing. Modern & clean.
      map.addLayer({
        id: 'dept-line',
        type: 'line',
        source: 'departamentos',
        paint: {
          'line-color': 'rgba(100,116,139,.55)',
          'line-width': 0.9,
        },
      });

      // Hover
      let hoverId: string | null = null;
      map.on('mousemove', 'dist-fill', (e: MapMouseEvent & { features?: any[] }) => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features?.[0];
        if (!f) return;
        if (hoverId && hoverId !== f.id) map.setFeatureState({ source: 'distritos', id: hoverId }, { highlighted: false });
        hoverId = f.id;
        map.setFeatureState({ source: 'distritos', id: f.id }, { highlighted: true });
        const ubi = String(f.id);
        if (!ubi || ubi === 'undefined') return;
        const d = (window as any).__distLookup?.[ubi];
        if (d) {
          if (!popupRef.current) popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
          popupRef.current
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family:Inter,sans-serif;min-width:190px">
                <div style="font-size:10px;letter-spacing:1.2px;color:#0891b2;font-weight:800;margin-bottom:4px;font-family:'JetBrains Mono',monospace">${d.dist.toUpperCase()}</div>
                <div style="font-size:11px;color:#64748b;margin-bottom:6px">${d.prov} · ${d.dept}</div>
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:3px"><span style="color:#64748b">en JEE</span><strong style="color:#dc2626;font-family:'JetBrains Mono',monospace">${(d.enviadasJee ?? 0).toLocaleString('es-PE')} actas</strong></div>
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:3px"><span style="color:#64748b">pendientes</span><strong style="color:#d97706;font-family:'JetBrains Mono',monospace">${d.faltantes.toLocaleString('es-PE')}</strong></div>
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:3px"><span style="color:#64748b">contado</span><strong style="font-family:'JetBrains Mono',monospace">${d.pct.toFixed(2)}%</strong></div>
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:3px"><span style="color:#64748b">total</span><strong style="font-family:'JetBrains Mono',monospace">${d.total.toLocaleString('es-PE')}</strong></div>
              </div>
            `).addTo(map);
          setHoverDist(d);
        }
      });
      map.on('mouseleave', 'dist-fill', () => {
        map.getCanvas().style.cursor = '';
        if (hoverId) map.setFeatureState({ source: 'distritos', id: hoverId }, { highlighted: false });
        hoverId = null;
        popupRef.current?.remove();
        setHoverDist(null);
      });

      // Click → toggle selección (cmd/ctrl/shift añade; click simple reemplaza)
      map.on('click', 'dist-fill', (e: MapMouseEvent & { features?: any[]; originalEvent: MouseEvent }) => {
        const f = e.features?.[0];
        if (!f) return;
        const ubi = String(f.id);
        if (!ubi || ubi === 'undefined') return;
        const ev = e.originalEvent;
        const modeRef = (window as any).__simMode === true;
        const multi = modeRef || ev.shiftKey || ev.metaKey || ev.ctrlKey;
        setSelSet(prev => {
          const next = new Set(prev);
          if (multi) { next.has(ubi) ? next.delete(ubi) : next.add(ubi); }
          else { if (next.size === 1 && next.has(ubi)) next.clear(); else { next.clear(); next.add(ubi); } }
          return next;
        });
      });
    });
    mapRef.current = map;
    return () => { window.removeEventListener('resize', onWinResize); map.remove(); mapRef.current = null; };
  }, []);

  // ── Colorea cada polígono (feature.id = ONPE ubigeo directo)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !snap) return;
    (window as any).__distLookup = dataByUbigeo;
    (window as any).__candLookup = candByUbigeo;
    const apply = () => {
      for (const [onpe, d] of Object.entries(dataByUbigeo)) {
        const c = candByUbigeo[onpe];
        map.setFeatureState({ source: 'distritos', id: onpe }, {
          jee: d.enviadasJee ?? 0,
          cola: d.faltantes ?? 0,
          total: (d.enviadasJee ?? 0) + (d.faltantes ?? 0),
          contado: d.pct ?? 0,
          participacion: d.participacion ?? (c?.participacion ?? 0),
          margen: c?.margen ?? null,
          ganColor: c?.ganador ? colorParty(c.ganador.cod) : null,
        });
      }
    };
    if (map.isStyleLoaded() && map.getSource('distritos')) apply();
    else map.once('idle', apply);
  }, [snap, candSnap, dataByUbigeo, candByUbigeo]);

  // ── Cambia el fill-color según la métrica seleccionada
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const expr = paintExprFor(metric);
    const apply = () => { if (map.getLayer('dist-fill')) map.setPaintProperty('dist-fill', 'fill-color', expr); };
    if (map.isStyleLoaded()) apply(); else map.once('idle', apply);
  }, [metric]);

  // ── Búsqueda highlight + selección
  const filtered = useMemo(() => {
    if (!snap) return [] as DistritoActas[];
    let list = snap.distritos;
    if (q.trim()) {
      const up = q.toUpperCase();
      list = list.filter(d => d.dist.includes(up) || d.prov.includes(up) || d.dept.includes(up));
    }
    return list;
  }, [q, snap]);

  // ── Highlight según search (ubigeos directos)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !snap) return;
    const apply = () => {
      const prev = (window as any).__prevHL as Set<string> | undefined;
      if (prev) prev.forEach(id => map.setFeatureState({ source: 'distritos', id }, { highlighted: false }));
      if (q.trim() && filtered.length && filtered.length < snap.distritos.length) {
        const ids = new Set<string>(filtered.map(d => d.ubigeo));
        ids.forEach(id => map.setFeatureState({ source: 'distritos', id }, { highlighted: true }));
        (window as any).__prevHL = ids;
      } else {
        (window as any).__prevHL = new Set<string>();
      }
    };
    if (map.isStyleLoaded() && map.getSource('distritos')) apply();
    else map.once('idle', apply);
  }, [q, filtered, snap]);

  // ── Selección múltiple (ubigeos)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const id of selRef.current) if (!selSet.has(id)) map.setFeatureState({ source: 'distritos', id }, { selected: false });
    for (const id of selSet) map.setFeatureState({ source: 'distritos', id }, { selected: true });
    selRef.current = new Set(selSet);

    if (selSet.size === 1) {
      const only = [...selSet][0];
      const src = map.getSource('distritos') as any;
      if (src && src._data) {
        const f = (src._data.features || []).find((x: any) => x.properties?.ubigeo === only);
        if (f) {
          const c = featureCentroid(f);
          if (c) map.flyTo({ center: c, zoom: Math.max(map.getZoom(), 8.5), speed: 1.2 });
        }
      }
    }
  }, [selSet]);

  const n = snap?.nacional;
  const pctDone = n?.pct ?? 0;
  const pctLeft = 100 - pctDone;

  return (
    <div className="pulso-page">
      <style>{PULSO_CSS}</style>

      {/* SIEMPRE montado para que maplibre no pierda el ref */}
      <div className="pulso-map" ref={mapContainerRef} />

      {!snap && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 3, background: '#fff', padding: '14px 22px', borderRadius: 10, boxShadow: '0 4px 14px rgba(15,23,42,.08)', color: '#64748b', fontSize: 13 }}>
          Cargando pulso…
        </div>
      )}

      {/* BOTÓN flotante para reabrir sidebar */}
      {snap && !sidebarOpen && (
        <button
          className="pulso-reopen"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir panel"
        >
          <span className="pulso-live-tag"><span className="dot" /> PULSO</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
            {n?.enviadasJee?.toLocaleString('es-PE') ?? '—'} JEE · {n?.faltantes?.toLocaleString('es-PE') ?? '—'} pend
          </span>
          <span style={{ fontSize: 14, color: '#0891b2' }}>▲</span>
        </button>
      )}

      {/* SIDEBAR IZQUIERDA */}
      {snap && sidebarOpen && (
      <aside className="pulso-sidebar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span className="pulso-live-tag"><span className="dot" /> PULSO EN VIVO</span>
          <button onClick={() => setSidebarOpen(false)} aria-label="Ocultar" style={{ all: 'unset', cursor: 'pointer', padding: '4px 8px', fontSize: 16, color: '#64748b', lineHeight: 1 }}>✕</button>
        </div>
        <h1 className="pulso-title">Actas por contabilizar</h1>
        <div className="pulso-sub">
          Por <b>Grupo Goberna</b> · Fuente ONPE · act. {new Date(snap.scrapedAt).toLocaleTimeString('es-PE', { timeZone: 'America/Lima' })}
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
          <div>
            <div className="pulso-big-num">
              {metric === 'jee' && n.enviadasJee.toLocaleString('es-PE')}
              {metric === 'cola' && n.faltantes.toLocaleString('es-PE')}
              {metric === 'total' && (n.enviadasJee + n.faltantes).toLocaleString('es-PE')}
            </div>
            <div className="pulso-big-label">
              {metric === 'jee' && 'ACTAS EN JEE'}
              {metric === 'cola' && 'ACTAS PENDIENTES'}
              {metric === 'total' && 'TOTAL FALTANTES'}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3, fontFamily: 'JetBrains Mono,monospace' }}>
              {metric === 'jee' && <>+ <b style={{ color: '#d97706' }}>{n.faltantes.toLocaleString('es-PE')}</b> pendientes</>}
              {metric === 'cola' && <>+ <b style={{ color: '#dc2626' }}>{n.enviadasJee.toLocaleString('es-PE')}</b> en JEE</>}
              {metric === 'total' && <><b style={{ color: '#dc2626' }}>{n.enviadasJee.toLocaleString('es-PE')}</b> JEE · <b style={{ color: '#d97706' }}>{n.faltantes.toLocaleString('es-PE')}</b> pend</>}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 22, fontWeight: 700, color: '#059669', letterSpacing: -.8 }}>{pctDone.toFixed(2)}%</div>
            <div className="pulso-big-label" style={{ color: '#059669' }}>CONTADO</div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3, fontFamily: 'JetBrains Mono,monospace' }}>
              {n.contabilizadas.toLocaleString('es-PE')}/{n.totalActas.toLocaleString('es-PE')}
            </div>
          </div>
        </div>

        <div className="pulso-progress">
          <div className="pulso-progress-done" style={{ width: `${pctDone}%` }} />
          <div className="pulso-progress-left" style={{ width: `${pctLeft}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', fontFamily: 'JetBrains Mono,monospace' }}>
          <span>{n.contabilizadas.toLocaleString('es-PE')} contab.</span>
          <span>{n.totalActas.toLocaleString('es-PE')} total</span>
        </div>

        <input
          className="pulso-search" value={q} onChange={e => setQ(e.target.value)}
          placeholder="🔍  distrito, provincia, departamento…"
        />
        {q.trim() && (
          <div style={{ fontSize: 10.5, color: '#64748b', fontFamily: 'JetBrains Mono,monospace', marginTop: 6 }}>
            → <b style={{ color: '#0891b2' }}>{filtered.length}</b> distritos match · coloreados con borde cian en el mapa
          </div>
        )}

        <div className="pulso-list">
          {(q.trim() ? filtered : snap.distritos)
            .slice()
            .map(d => ({
              d,
              primary:
                metric === 'jee' ? (d.enviadasJee ?? 0) :
                metric === 'cola' ? d.faltantes :
                (d.enviadasJee ?? 0) + d.faltantes,
            }))
            .sort((a, b) => b.primary - a.primary)
            .slice(0, 80)
            .map(({ d, primary }) => {
              const enJee = d.enviadasJee ?? 0;
              const sublabel = metric === 'jee' ? `${d.faltantes} pend` : metric === 'cola' ? `${enJee} JEE` : `${enJee} JEE · ${d.faltantes} pend`;
              const valLabel = metric === 'jee' ? 'EN JEE' : metric === 'cola' ? 'PENDIENTES' : 'TOTAL';
              return (
                <div
                  key={d.ubigeo}
                  className={`pulso-row ${selSet.has(d.ubigeo) ? 'active' : ''}`}
                  onClick={(e) => {
                    const id = d.ubigeo;
                    const multi = simMode || e.shiftKey || e.metaKey || e.ctrlKey;
                    setSelSet(prev => {
                      const next = new Set(prev);
                      if (multi) { next.has(id) ? next.delete(id) : next.add(id); }
                      else { if (next.size === 1 && next.has(id)) next.clear(); else { next.clear(); next.add(id); } }
                      return next;
                    });
                  }}
                >
                  <span className="pulso-dot" style={{ background: colorFor(primary) }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="pulso-row-name">{d.dist}</div>
                    <div className="pulso-row-sub">{d.prov} · {d.dept} · {sublabel}</div>
                  </div>
                  <div className="pulso-row-val">
                    {primary.toLocaleString('es-PE')}
                    <small>{valLabel}</small>
                  </div>
                </div>
              );
            })}
          {(q.trim() ? filtered : snap.distritos).length > 80 && (
            <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 10, color: '#94a3b8', fontFamily: 'JetBrains Mono,monospace' }}>
              mostrando 80 de {(q.trim() ? filtered : snap.distritos).length.toLocaleString('es-PE')} · refina la búsqueda
            </div>
          )}
        </div>
      </aside>
      )}

      {/* METRIC SWITCHER · TOP CENTER */}
      <div className="pulso-metric-bar">
        {(['jee','cola','total'] as Metric[]).map(m => (
          <button key={m} onClick={() => setMetric(m)} className={metric === m ? 'pmb active' : 'pmb'}>
            {METRIC_META[m].label}
          </button>
        ))}
      </div>

      {/* LEYENDA TOP-RIGHT */}
      <div className="pulso-legend">
        <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 700, color: '#64748b', fontFamily: 'JetBrains Mono,monospace', marginBottom: 2 }}>{METRIC_META[metric].label.toUpperCase()}</div>
        <div style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'JetBrains Mono,monospace', marginBottom: 6 }}>{METRIC_META[metric].sub}</div>
        {metric === 'ganador' ? (
          <div style={{ maxWidth: 180 }}>
            {Array.from(new Set((candSnap?.distritos || []).map(d => d.ganador?.cod).filter(Boolean) as string[])).slice(0, 8).map(cod => {
              const d = (candSnap?.distritos || []).find(x => x.ganador?.cod === cod);
              const name = d?.ganador?.partido || cod;
              return (
                <div key={cod} className="legend-swatch">
                  <i style={{ background: colorParty(cod) }} />
                  <span style={{ fontSize: 9.5 }}>{name.split(' ').slice(0,3).join(' ')}</span>
                </div>
              );
            })}
          </div>
        ) : METRIC_META[metric].legend.map(s => (
          <div key={s.label} className="legend-swatch">
            <i style={{ background: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* SIMULATION PANEL · BOTTOM-RIGHT (aparece al seleccionar) */}
      {/* TOGGLE MODO SIMULACIÓN (top-right, abajo de la legend) */}
      {snap && (
        <button onClick={() => setSimMode(m => !m)} className={`sim-toggle ${simMode ? 'on' : ''}`}>
          {simMode ? '● SIMULANDO' : '▶ Simular'}
        </button>
      )}

      {simMode && selSet.size > 0 && <SimPanel
        selSet={selSet}
        candByUbigeo={candByUbigeo} dataByUbigeo={dataByUbigeo}
        pres={pres}
        simAlloc={simAlloc} onSimAlloc={setSimAlloc}
        onClear={() => setSelSet(new Set())}
      />}
      {simMode && selSet.size === 0 && (
        <div className="sim-hint">
          <strong>Modo simulación activo.</strong><br />
          Haz click en distritos del mapa o de la lista para añadirlos al escenario.
        </div>
      )}

      {/* TOAST HOVER */}
      {hoverDist && (
        <div className="pulso-toast">
          <b style={{ color: '#0f172a' }}>{hoverDist.dist}</b> <span style={{ color: '#94a3b8' }}>·</span> <span style={{ color: '#dc2626' }}>{(hoverDist.enviadasJee ?? 0).toLocaleString('es-PE')} en JEE</span> <span style={{ color: '#94a3b8' }}>·</span> <span style={{ color: '#d97706' }}>{hoverDist.faltantes} pendientes</span> <span style={{ color: '#94a3b8' }}>·</span> {hoverDist.pct.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

// ─── SIM PANEL ─ sliders por candidato + preview nacional
function SimPanel({ selSet, candByUbigeo, dataByUbigeo, pres, simAlloc, onSimAlloc, onClear }: {
  selSet: Set<string>;
  candByUbigeo: Record<string, DistCand>;
  dataByUbigeo: Record<string, DistritoActas>;
  pres: PresData | null;
  simAlloc: Record<string, number>;
  onSimAlloc: (a: Record<string, number>) => void;
  onClear: () => void;
}) {
  // Agregados
  const agg = useMemo(() => {
    let votosEmit = 0;
    const byCand: Record<string, { cod: string; partido: string; cand: string; votos: number }> = {};
    for (const onpe of selSet) {
      const d = dataByUbigeo[onpe]; const c = candByUbigeo[onpe];
      if (d) votosEmit += d.votosEmitidos || 0;
      if (c) for (const t of c.top3) {
        byCand[t.cod] = byCand[t.cod] || { cod: t.cod, partido: t.partido, cand: t.cand, votos: 0 };
        byCand[t.cod].votos += t.votos || 0;
      }
    }
    return { votosEmit, byCand };
  }, [selSet, dataByUbigeo, candByUbigeo]);

  const candList = useMemo(() => Object.values(agg.byCand).sort((a,b) => b.votos - a.votos).slice(0, 6), [agg]);
  const totalSelVotos = candList.reduce((a, x) => a + x.votos, 0);

  // Nacional totales agregando TODA la data que tenemos (aproximación)
  const nacTotals = useMemo(() => {
    const m: Record<string, { cod: string; partido: string; cand: string; votos: number }> = {};
    for (const c of Object.values(candByUbigeo)) {
      for (const t of c.top3) {
        m[t.cod] = m[t.cod] || { cod: t.cod, partido: t.partido, cand: t.cand, votos: 0 };
        m[t.cod].votos += t.votos || 0;
      }
    }
    return m;
  }, [candByUbigeo]);
  const totalNacVotos = Object.values(nacTotals).reduce((a, x) => a + x.votos, 0);

  // Inicializar simAlloc con % actual al primer render
  useEffect(() => {
    if (Object.keys(simAlloc).length === 0 && candList.length > 0 && totalSelVotos > 0) {
      const init: Record<string, number> = {};
      candList.forEach(c => { init[c.cod] = Number(((c.votos / totalSelVotos) * 100).toFixed(1)); });
      onSimAlloc(init);
    }
  }, [candList, totalSelVotos]);

  const allocSum = Object.values(simAlloc).reduce((a, v) => a + v, 0);
  const allocValid = Math.abs(allocSum - 100) < 0.05;

  const setPct = (cod: string, v: number) => {
    const next = { ...simAlloc, [cod]: Math.max(0, Math.min(100, v)) };
    onSimAlloc(next);
  };
  const autoDistribute = () => {
    if (totalSelVotos === 0) return;
    const init: Record<string, number> = {};
    candList.forEach(c => { init[c.cod] = Number(((c.votos / totalSelVotos) * 100).toFixed(1)); });
    onSimAlloc(init);
  };
  const normalize = () => {
    if (allocSum === 0) return;
    const next: Record<string, number> = {};
    for (const [k, v] of Object.entries(simAlloc)) next[k] = Number((v * 100 / allocSum).toFixed(1));
    onSimAlloc(next);
  };

  // Preview nacional: sustituir los votos actuales en sel por los del escenario
  const nacPreview = useMemo(() => {
    const preview: Record<string, number> = {};
    for (const [cod, info] of Object.entries(nacTotals)) {
      const inSel = agg.byCand[cod]?.votos || 0;
      const alloc = simAlloc[cod] ?? 0;
      const newInSel = allocValid ? (totalSelVotos * alloc / 100) : inSel;
      preview[cod] = info.votos - inSel + newInSel;
    }
    return preview;
  }, [nacTotals, agg, simAlloc, totalSelVotos, allocValid]);
  const totalNacPreview = Object.values(nacPreview).reduce((a, v) => a + v, 0);

  return (
    <div className="pulso-sim">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 1.4, fontWeight: 800, color: '#0891b2', fontFamily: 'JetBrains Mono,monospace' }}>ESCENARIO</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{selSet.size} {selSet.size === 1 ? 'distrito' : 'distritos'} · {totalSelVotos.toLocaleString('es-PE')} votos</div>
        </div>
        <button onClick={onClear} aria-label="Limpiar" style={{ all: 'unset', cursor: 'pointer', padding: '4px 8px', fontSize: 16, color: '#94a3b8', borderRadius: 6, lineHeight: 1 }}>✕</button>
      </div>

      {candList.length === 0 ? (
        <div style={{ padding: 20, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
          Datos de candidatos aún no cargados…
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 6px' }}>
            <div style={{ fontSize: 9.5, letterSpacing: 1.4, fontWeight: 700, color: '#64748b', fontFamily: 'JetBrains Mono,monospace' }}>ASIGNACIÓN</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={autoDistribute} className="sim-mini-btn">Actual</button>
              <button onClick={normalize} className="sim-mini-btn" disabled={allocSum === 0}>↻ 100%</button>
              <span className={`sim-sum ${allocValid ? 'ok' : 'err'}`}>{allocSum.toFixed(1)}%</span>
            </div>
          </div>

          {candList.map(c => {
            const v = simAlloc[c.cod] ?? 0;
            const currentPct = totalSelVotos ? (c.votos / totalSelVotos) * 100 : 0;
            return (
              <div key={c.cod} className="sim-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: colorParty(c.cod), flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.cand ? (c.cand.split(' ').slice(-2, -1)[0] || c.cand.split(' ').pop()) : c.partido.split(' ').slice(0,2).join(' ')}
                  </span>
                  <span style={{ fontSize: 9.5, color: '#94a3b8', fontFamily: 'JetBrains Mono,monospace' }}>({currentPct.toFixed(1)}%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="range" min="0" max="100" step="0.5" value={v} onChange={e => setPct(c.cod, Number(e.target.value))}
                    style={{ flex: 1, accentColor: colorParty(c.cod) }} />
                  <input type="number" min="0" max="100" step="0.5" value={v} onChange={e => setPct(c.cod, Number(e.target.value))}
                    className="sim-num" />
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: 14, padding: 10, background: allocValid ? '#f0fdf4' : '#fef2f2', border: `1px solid ${allocValid ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8 }}>
            <div style={{ fontSize: 9.5, letterSpacing: 1.3, color: allocValid ? '#059669' : '#dc2626', fontWeight: 800, fontFamily: 'JetBrains Mono,monospace', marginBottom: 6 }}>
              {allocValid ? '✓ IMPACTO NACIONAL' : '⚠ AJUSTA A 100%'}
            </div>
            {allocValid && candList.map(c => {
              const curPct = totalNacVotos ? (nacTotals[c.cod].votos / totalNacVotos) * 100 : 0;
              const newPct = totalNacPreview ? (nacPreview[c.cod] / totalNacPreview) * 100 : 0;
              const delta = newPct - curPct;
              return (
                <div key={c.cod} style={{ display: 'grid', gridTemplateColumns: '10px 1fr auto auto', gap: 6, alignItems: 'center', fontSize: 11, padding: '3px 0' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: colorParty(c.cod) }} />
                  <span style={{ color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.cand ? (c.cand.split(' ').slice(-2, -1)[0] || c.cand.split(' ').pop()) : c.partido.split(' ').slice(0,2).join(' ')}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10.5, color: '#64748b' }}>{curPct.toFixed(2)}→</span>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, fontWeight: 700, color: colorParty(c.cod), whiteSpace: 'nowrap' }}>
                    {newPct.toFixed(2)}% <span style={{ color: delta > 0 ? '#059669' : delta < 0 ? '#dc2626' : '#94a3b8', fontSize: 9.5 }}>({delta > 0 ? '+' : ''}{delta.toFixed(2)})</span>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Centroide aproximado de una feature Polygon/MultiPolygon
function featureCentroid(f: any): [number, number] | null {
  const g = f.geometry;
  if (!g) return null;
  let coords: number[][] = [];
  if (g.type === 'Polygon') coords = g.coordinates[0] as number[][];
  else if (g.type === 'MultiPolygon') coords = (g.coordinates[0]?.[0] ?? []) as number[][];
  if (!coords.length) return null;
  let sx = 0, sy = 0;
  for (const [x, y] of coords) { sx += x; sy += y; }
  return [sx / coords.length, sy / coords.length];
}
