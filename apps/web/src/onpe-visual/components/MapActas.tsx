import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

const TOPO_URL = 'https://cdn.jsdelivr.net/npm/datamaps@0.5.10/src/js/data/per.topo.json';

const GEO_CENTERS: Record<string, [number, number]> = {
  'Amazonas':[-78,-6],'Áncash':[-77.5,-9.3],'Apurímac':[-73,-14],'Arequipa':[-72,-15.8],
  'Ayacucho':[-74,-13.8],'Cajamarca':[-78.5,-6.8],'Callao':[-77.12,-12.05],'Cusco':[-72,-13.2],
  'Huancavelica':[-75.2,-13],'Huánuco':[-76.2,-9.5],'Ica':[-75.5,-14.5],'Junín':[-75.3,-11.5],
  'La Libertad':[-78.5,-8],'Lambayeque':[-79.8,-6.5],'Lima':[-76.6,-12],'Loreto':[-75.5,-4.5],
  'Madre de Dios':[-70.5,-12],'Moquegua':[-70.9,-17],'Pasco':[-76,-10.4],'Piura':[-80.3,-5],
  'Puno':[-70,-15.2],'San Martín':[-76.7,-7],'Tacna':[-70.3,-17.6],'Tumbes':[-80.4,-3.7],
  'Ucayali':[-74,-9.5],
};

const SMALL_DEPTS: Record<string, { dx: number; dy: number }> = {
  'Callao':   { dx: -55, dy: 15 },
  'Tumbes':   { dx:  20, dy: -18 },
  'Moquegua': { dx:  30, dy:  10 },
};

function haversine(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = (b[1] - a[1]) * Math.PI / 180;
  const dLng = (b[0] - a[0]) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function buildGeoMatch(features: Feature<Geometry, any>[], pathGen: d3.GeoPath<any, any>): Record<number, string> {
  const assigned = new Set<string>();
  const map: Record<number, string> = {};
  const items = features.map((f, i) => ({
    idx: i,
    centroid: d3.geoCentroid(f as any),
    area: pathGen.area(f as any),
  })).sort((a, b) => b.area - a.area);
  for (const it of items) {
    let best: string | null = null;
    let dist = Infinity;
    for (const [dept, ctr] of Object.entries(GEO_CENTERS)) {
      if (assigned.has(dept)) continue;
      const d = haversine([it.centroid[0], it.centroid[1]], ctr);
      if (d < dist) { dist = d; best = dept; }
    }
    if (best && dist < 300) { map[it.idx] = best; assigned.add(best); }
  }
  return map;
}

let topoCache: Topology | null = null;

export interface DeptMetric {
  dept: string;
  faltantes: number;
  pct: number;
  velocidad?: number;
}
export interface GanadorInfo {
  key: string;
  nombre: string;
  color: string;
  pct: number;
}

export type MapMetric = 'faltantes' | 'velocidad' | 'progreso' | 'ganador';

interface Props {
  deptos: DeptMetric[];
  metric: MapMetric;
  selected?: string | null;
  onSelect: (dept: string | null) => void;
  highlight?: string[];        // deptos a pulsar (p.ej. resultado de búsqueda)
  ganadorBy?: Record<string, GanadorInfo>;
  theme?: 'light' | 'dark';
}

function fmtNum(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1000)}k`;
  if (v >= 1_000) return `${(v / 1000).toFixed(1)}k`;
  return Math.round(v).toString();
}

export function MapActas({ deptos, metric, selected, onSelect, highlight = [], ganadorBy, theme = 'light' }: Props) {
  const T = theme === 'light'
    ? { base: '#e2e8f0', stroke: '#ffffff', strokeStrong: '#0f172a', tooltipBg: 'rgba(255,255,255,.98)', tooltipBorder: 'rgba(15,23,42,.14)', tooltipTx: '#0f172a', tooltipAccent: '#0891b2', tooltipMuted: '#64748b', gridLine: '#0891b2', gridOpacity: .04, legendText: '#475569', labelStroke: '#ffffff' }
    : { base: '#1a1d26', stroke: '#0f1117', strokeStrong: '#00e5ff', tooltipBg: 'rgba(15,17,23,.95)', tooltipBorder: 'rgba(0,229,255,.3)', tooltipTx: '#e8eaed', tooltipAccent: '#00e5ff', tooltipMuted: '#5f6673', gridLine: '#00e5ff', gridOpacity: .07, legendText: '#5f6673', labelStroke: '#0f1117' };

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<{ x: number; y: number; dept: DeptMetric; winner?: GanadorInfo } | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    async function draw() {
      const wrap = wrapRef.current;
      const el = svgRef.current;
      if (!wrap || !el) return;
      el.innerHTML = '';
      setLoading(true);

      const W = wrap.clientWidth || 500;
      const H = Math.round(W * 1.33);

      try {
        if (!topoCache) topoCache = (await d3.json<Topology>(TOPO_URL))!;
      } catch { setLoading(false); return; }
      if (cancelled) return;

      const topo = topoCache!;
      const objKey = 'per' in topo.objects ? 'per' : Object.keys(topo.objects)[0];
      const obj = topo.objects[objKey] as GeometryCollection;
      const fc = feature(topo, obj) as unknown as FeatureCollection;
      const features = fc.features;

      const margin = W * 0.04;
      const projection = d3.geoMercator()
        .fitExtent([[margin, margin], [W - margin, H - margin]], { type: 'FeatureCollection', features } as any);
      const pathGen = d3.geoPath(projection as any);
      const match = buildGeoMatch(features, pathGen);

      // ─── Escalas / color fn por métrica
      const deptBy: Record<string, DeptMetric> = {};
      for (const d of deptos) deptBy[d.dept] = d;

      const metricValues: Record<string, number> = {};
      for (const d of deptos) {
        if (metric === 'velocidad') metricValues[d.dept] = d.velocidad || 0;
        else if (metric === 'progreso') metricValues[d.dept] = d.pct;
        else metricValues[d.dept] = d.faltantes;
      }
      const maxV = Math.max(1, ...Object.values(metricValues));
      const minV = Math.min(...Object.values(metricValues));

      const colorFn = (dept: string): string => {
        if (metric === 'ganador') {
          const g = ganadorBy?.[dept];
          return g?.color || T.base;
        }
        const v = metricValues[dept] ?? 0;
        if (metric === 'progreso') {
          // diverging rojo→ámbar→verde
          const t = (v - minV) / Math.max(0.01, maxV - minV);
          return d3.interpolateRdYlGn(t);
        }
        if (metric === 'velocidad') {
          if (v <= 0) return T.base;
          const t = Math.sqrt(v / maxV);
          return d3.interpolateGnBu(0.15 + 0.75 * t);
        }
        // faltantes — warm sequential
        if (v <= 0) return T.base;
        const t = Math.log10(1 + v) / Math.log10(1 + maxV);
        return d3.interpolateYlOrRd(0.15 + 0.8 * t);
      };

      const labelText = (dept: string): string => {
        if (metric === 'ganador') {
          const g = ganadorBy?.[dept];
          return g ? `${g.pct.toFixed(1)}%` : '';
        }
        if (metric === 'progreso') return `${(metricValues[dept] || 0).toFixed(1)}%`;
        if (metric === 'velocidad') {
          const v = metricValues[dept] || 0;
          return v > 0 ? v.toFixed(1) : '—';
        }
        return fmtNum(metricValues[dept] || 0);
      };

      const svg = d3.select(el).append('svg')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('width', '100%').style('height', '100%');

      // Defs
      const defs = svg.append('defs');
      const glow = defs.append('filter').attr('id', 'mactas-glow').attr('x', '-30%').attr('y', '-30%').attr('width', '160%').attr('height', '160%');
      glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'b');
      glow.append('feMerge').selectAll('feMergeNode').data(['b', 'SourceGraphic']).enter().append('feMergeNode').attr('in', d => d);

      const pulseFilter = defs.append('filter').attr('id', 'mactas-pulse').attr('x', '-40%').attr('y', '-40%').attr('width', '180%').attr('height', '180%');
      pulseFilter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'b');
      pulseFilter.append('feMerge').selectAll('feMergeNode').data(['b', 'SourceGraphic']).enter().append('feMergeNode').attr('in', d => d);

      // Grid decorativo
      const gridG = svg.append('g').attr('opacity', T.gridOpacity);
      for (let i = 0; i <= 10; i++) {
        gridG.append('line').attr('x1', 0).attr('x2', W).attr('y1', (H * i) / 10).attr('y2', (H * i) / 10).attr('stroke', T.gridLine).attr('stroke-width', .3);
        gridG.append('line').attr('y1', 0).attr('y2', H).attr('x1', (W * i) / 10).attr('x2', (W * i) / 10).attr('stroke', T.gridLine).attr('stroke-width', .3);
      }

      const hlSet = new Set(highlight);

      // ─── Paths
      const pathsG = svg.append('g');
      pathsG.selectAll('path')
        .data(features)
        .join('path')
        .attr('d', pathGen as any)
        .attr('stroke', T.stroke)
        .attr('stroke-width', 0.8)
        .attr('fill', (_d, i) => {
          const dept = match[i];
          return dept ? colorFn(dept) : T.base;
        })
        .style('cursor', (_d, i) => match[i] ? 'pointer' : 'default')
        .style('transition', 'fill .3s, stroke .2s, stroke-width .2s')
        .attr('data-dept', (_d, i) => match[i] || '')
        .on('mousemove', function(event, d) {
          const i = features.indexOf(d as any);
          const dept = match[i];
          if (!dept) return;
          d3.select(this).attr('stroke', T.strokeStrong).attr('stroke-width', 2);
          const rect = wrap.getBoundingClientRect();
          const meta = deptBy[dept];
          if (meta) setHover({ x: event.clientX - rect.left, y: event.clientY - rect.top, dept: meta, winner: ganadorBy?.[dept] });
        })
        .on('mouseleave', function(_e, d) {
          const i = features.indexOf(d as any);
          const dept = match[i];
          const isSel = dept && dept === selected;
          const isHl = dept && hlSet.has(dept);
          d3.select(this)
            .attr('stroke', isSel || isHl ? T.strokeStrong : T.stroke)
            .attr('stroke-width', isSel ? 2.2 : isHl ? 1.8 : 0.8);
          setHover(null);
        })
        .on('click', (_e, d) => {
          const i = features.indexOf(d as any);
          const dept = match[i];
          if (!dept) return;
          onSelectRef.current(selected === dept ? null : dept);
        });

      // Highlight (búsqueda)
      if (hlSet.size) {
        pathsG.selectAll('path')
          .filter((_d, i) => hlSet.has(match[i]))
          .attr('stroke', T.strokeStrong)
          .attr('stroke-width', 1.8)
          .style('filter', 'url(#mactas-pulse)');
      }
      // Selected (click)
      if (selected) {
        pathsG.selectAll('path')
          .filter((_d, i) => match[i] === selected)
          .attr('stroke', T.strokeStrong)
          .attr('stroke-width', 2.4)
          .style('filter', 'url(#mactas-glow)');
      }

      // ─── Labels con el valor de la métrica
      const labelG = svg.append('g').attr('class', 'map-labels').attr('pointer-events', 'none');
      const fontSize = W < 380 ? 8 : W < 500 ? 9 : 10;
      features.forEach((f, i) => {
        const dept = match[i];
        if (!dept) return;
        const txt = labelText(dept);
        if (!txt) return;
        const centroid = pathGen.centroid(f as any);
        if (isNaN(centroid[0])) return;

        const small = SMALL_DEPTS[dept];
        const g = labelG.append('g').style('pointer-events', 'none');
        if (small) {
          const tx = centroid[0] + small.dx;
          const ty = centroid[1] + small.dy;
          g.append('line')
            .attr('x1', centroid[0]).attr('y1', centroid[1])
            .attr('x2', tx).attr('y2', ty)
            .attr('stroke', theme === 'light' ? 'rgba(15,23,42,.35)' : 'rgba(255,255,255,.4)')
            .attr('stroke-width', 0.6);
          g.append('circle')
            .attr('cx', centroid[0]).attr('cy', centroid[1]).attr('r', 1.6)
            .attr('fill', theme === 'light' ? 'rgba(15,23,42,.5)' : 'rgba(255,255,255,.5)');
          g.append('text')
            .attr('x', tx).attr('y', ty + 3)
            .attr('text-anchor', small.dx < 0 ? 'end' : 'start')
            .attr('font-size', fontSize).attr('font-family', '"JetBrains Mono", monospace')
            .attr('font-weight', 700)
            .attr('paint-order', 'stroke').attr('stroke', T.labelStroke).attr('stroke-width', 2.5)
            .attr('fill', theme === 'light' ? '#0f172a' : '#fff')
            .text(txt);
        } else {
          // Nombre depto arriba (abreviado), número debajo
          const deptShort = dept.length > 11 ? dept.slice(0, 10) + '.' : dept;
          g.append('text')
            .attr('x', centroid[0]).attr('y', centroid[1] - 3)
            .attr('text-anchor', 'middle')
            .attr('font-size', fontSize - 1.5).attr('font-family', 'Inter, sans-serif')
            .attr('font-weight', 600)
            .attr('paint-order', 'stroke').attr('stroke', T.labelStroke).attr('stroke-width', 2.5)
            .attr('fill', theme === 'light' ? '#0f172a' : '#fff')
            .attr('opacity', 0.7)
            .text(deptShort);
          g.append('text')
            .attr('x', centroid[0]).attr('y', centroid[1] + fontSize + 1)
            .attr('text-anchor', 'middle')
            .attr('font-size', fontSize).attr('font-family', '"JetBrains Mono", monospace')
            .attr('font-weight', 700)
            .attr('paint-order', 'stroke').attr('stroke', T.labelStroke).attr('stroke-width', 2.5)
            .attr('fill', theme === 'light' ? '#0f172a' : '#fff')
            .text(txt);
        }
      });

      setLoading(false);
    }
    draw();
    return () => { cancelled = true; };
  }, [deptos, metric, selected, highlight.join('|'), ganadorBy, theme]);

  // ─── Legend
  const legend = (() => {
    if (metric === 'ganador') {
      const unique = new Map<string, GanadorInfo>();
      Object.values(ganadorBy || {}).forEach(g => { if (g) unique.set(g.key, g); });
      return (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8, fontSize: 10, fontFamily: 'Inter, sans-serif' }}>
          {[...unique.values()].map(g => (
            <span key={g.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: g.color, display: 'inline-block' }} />
              <span style={{ color: '#0f172a', fontWeight: 600 }}>{g.nombre}</span>
            </span>
          ))}
        </div>
      );
    }
    const label = metric === 'velocidad' ? 'ACTAS/MIN' : metric === 'progreso' ? '% CONTADO' : 'FALTANTES';
    const bg = metric === 'progreso'
      ? 'linear-gradient(90deg, #d73027, #fdae61, #a6d96a, #1a9850)'
      : metric === 'velocidad'
      ? 'linear-gradient(90deg, #f0f9ff, #0c4a6e)'
      : 'linear-gradient(90deg, #fff7bc, #fec44f, #fe9929, #d95f0e, #993404)';
    const accent = metric === 'progreso' ? '#059669' : metric === 'velocidad' ? '#0c4a6e' : '#993404';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 10, color: T.legendText, letterSpacing: 1, fontFamily: 'JetBrains Mono, monospace' }}>
        <span>MIN</span>
        <span style={{ flex: 1, height: 6, borderRadius: 3, background: bg }} />
        <span>MAX</span>
        <span style={{ marginLeft: 6, color: accent, fontWeight: 700 }}>{label}</span>
      </div>
    );
  })();

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div ref={wrapRef} style={{ position: 'relative', width: '100%', aspectRatio: '0.75' }}>
        <div ref={svgRef} style={{ width: '100%', height: '100%' }} />
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: T.tooltipMuted, fontSize: 12 }}>
            Cargando mapa…
          </div>
        )}
        {hover && (
          <div style={{
            position: 'absolute', left: Math.min(hover.x + 14, 260), top: hover.y + 8,
            pointerEvents: 'none', zIndex: 10,
            background: T.tooltipBg, backdropFilter: 'blur(8px)',
            border: `1px solid ${T.tooltipBorder}`, padding: '10px 14px',
            borderRadius: 10, fontSize: 11, color: T.tooltipTx,
            minWidth: 190, fontFamily: 'JetBrains Mono, monospace',
            boxShadow: '0 8px 20px rgba(15,23,42,.12)',
          }}>
            <div style={{ fontWeight: 700, color: T.tooltipAccent, letterSpacing: 1, marginBottom: 6, fontSize: 10 }}>
              {hover.dept.dept.toUpperCase()}
            </div>
            <TooltipRow label="faltan" value={hover.dept.faltantes.toLocaleString('es-PE')} color="#dc2626" muted={T.tooltipMuted} />
            <TooltipRow label="contado" value={`${hover.dept.pct.toFixed(2)}%`} muted={T.tooltipMuted} />
            {hover.dept.velocidad !== undefined && (
              <TooltipRow label="velocidad" value={`${hover.dept.velocidad.toFixed(1)}/min`} color="#059669" muted={T.tooltipMuted} />
            )}
            {hover.winner && (
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${T.tooltipBorder}`, display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: hover.winner.color }} />
                <strong style={{ color: hover.winner.color }}>{hover.winner.nombre}</strong>
                <span style={{ color: T.tooltipMuted, marginLeft: 'auto' }}>{hover.winner.pct.toFixed(1)}%</span>
              </div>
            )}
          </div>
        )}
      </div>
      {legend}
    </div>
  );
}

function TooltipRow({ label, value, color, muted }: { label: string; value: string; color?: string; muted: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, marginTop: 3 }}>
      <span style={{ color: muted }}>{label}</span>
      <strong style={{ color: color || 'inherit' }}>{value}</strong>
    </div>
  );
}
