import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection } from 'geojson';
import { colorOfPartido, nombreCorto, type DiputadosData, type DistritoDiputados } from '../data/diputadosSource';
import { CandidatePhoto } from './CandidatePhoto';

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

function matchDistToGeo(distName: string): string {
  const MAP: Record<string, string> = {
    'LIMA METROPOLITANA': 'Lima', 'LIMA PROVINCIAS': 'Lima',
    'PERUANOS RESIDENTES EN EL EXTRANJERO': '',
    'ÁNCASH': 'Áncash', 'APURÍMAC': 'Apurímac', 'HUÁNUCO': 'Huánuco',
    'JUNÍN': 'Junín', 'SAN MARTÍN': 'San Martín',
  };
  if (MAP[distName] !== undefined) return MAP[distName];
  return distName.charAt(0) + distName.slice(1).toLowerCase();
}

function haversine(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = (b[1] - a[1]) * Math.PI / 180;
  const dLng = (b[0] - a[0]) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

let topoCache: Topology | null = null;

function riskLevel(d: DistritoDiputados): { icon: string; label: string; color: string } {
  if (d.pctActas >= 95) return { icon: '🟢', label: 'definido', color: '#059669' };
  if (d.pctActas >= 75) return { icon: '🟡', label: 'en disputa', color: '#d97706' };
  return { icon: '🔴', label: 'puede cambiar', color: '#dc2626' };
}

interface Props { data: DiputadosData; }

export function MapaDiputados({ data }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const [selDist, setSelDist] = useState<DistritoDiputados | null>(null);
  const [hoverDist, setHoverDist] = useState<{ dist: DistritoDiputados; x: number; y: number } | null>(null);

  const distByGeo = useMemo(() => {
    const m: Record<string, DistritoDiputados> = {};
    for (const d of data.distritos) {
      const geoName = matchDistToGeo(d.nombre);
      if (geoName) m[geoName] = d;
    }
    return m;
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    async function draw() {
      const wrap = wrapRef.current; const el = svgRef.current;
      if (!wrap || !el) return;
      el.innerHTML = '';

      const W = wrap.clientWidth || 600;
      const H = Math.round(W * 1.35);

      try { if (!topoCache) topoCache = (await d3.json<Topology>(TOPO_URL))!; }
      catch { return; }
      if (cancelled) return;

      const topo = topoCache!;
      const objKey = 'per' in topo.objects ? 'per' : Object.keys(topo.objects)[0];
      const fc = feature(topo, topo.objects[objKey] as GeometryCollection) as unknown as FeatureCollection;
      const features = fc.features;

      const margin = W * 0.05;
      const projection = d3.geoMercator().fitExtent([[margin, margin], [W - margin, H - margin]], { type: 'FeatureCollection', features } as any);
      const pathGen = d3.geoPath(projection as any);

      const assigned = new Set<string>();
      const match: Record<number, string> = {};
      const items = features.map((f, i) => ({ idx: i, centroid: d3.geoCentroid(f as any), area: pathGen.area(f as any) })).sort((a, b) => b.area - a.area);
      for (const it of items) {
        let best: string | null = null; let dist = Infinity;
        for (const [dept, ctr] of Object.entries(GEO_CENTERS)) {
          if (assigned.has(dept)) continue;
          const d = haversine([it.centroid[0], it.centroid[1]], ctr);
          if (d < dist) { dist = d; best = dept; }
        }
        if (best && dist < 300) { match[it.idx] = best; assigned.add(best); }
      }

      const svg = d3.select(el).append('svg')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('width', '100%').style('height', '100%');

      // BG
      svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#f8fafc').attr('rx', 14);

      // Defs: gradient per district
      const defs = svg.append('defs');
      features.forEach((_f, i) => {
        const dept = match[i]; if (!dept) return;
        const dist = distByGeo[dept]; if (!dist) return;
        const withSeats = dist.partidos.filter(p => p.escanos > 0).sort((a, b) => b.escanos - a.escanos);
        if (!withSeats.length) return;
        const totalSeats = withSeats.reduce((s, p) => s + p.escanos, 0);
        const grad = defs.append('linearGradient')
          .attr('id', `dgrad-${i}`)
          .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
        let acc = 0;
        for (const p of withSeats) {
          const pct = (p.escanos / totalSeats) * 100;
          const color = colorOfPartido(p.codigo);
          grad.append('stop').attr('offset', `${acc}%`).attr('stop-color', color);
          acc += pct;
          grad.append('stop').attr('offset', `${acc}%`).attr('stop-color', color);
        }
      });

      // Paths: gradient fill
      svg.selectAll('path')
        .data(features)
        .join('path')
        .attr('d', pathGen as any)
        .attr('fill', (_d, i) => {
          const dept = match[i]; const dist = dept ? distByGeo[dept] : null;
          if (!dist || !dist.partidos.some(p => p.escanos > 0)) return '#dce3ed';
          return `url(#dgrad-${i})`;
        })
        .attr('fill-opacity', 0.92)
        .attr('stroke', 'rgba(255,255,255,.7)')
        .attr('stroke-width', 1.5)
        .attr('stroke-linejoin', 'round')
        .style('cursor', (_d, i) => match[i] && distByGeo[match[i]] ? 'pointer' : 'default')
        .on('mouseenter', function(event, d) {
          const i = features.indexOf(d as any);
          const dept = match[i]; const dist = dept ? distByGeo[dept] : null;
          if (!dist) return;
          d3.select(this).attr('fill-opacity', 1).attr('stroke', '#fff').attr('stroke-width', 3);
          const rect = wrap!.getBoundingClientRect();
          setHoverDist({ dist, x: event.clientX - rect.left, y: event.clientY - rect.top });
        })
        .on('mousemove', function(event) {
          if (!hoverDist) return;
          const rect = wrap!.getBoundingClientRect();
          setHoverDist(prev => prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : null);
        })
        .on('mouseleave', function() {
          d3.select(this).attr('fill-opacity', 0.92).attr('stroke', 'rgba(255,255,255,.7)').attr('stroke-width', 1.5);
          setHoverDist(null);
        })
        .on('click', (_e, d) => {
          const i = features.indexOf(d as any);
          const dept = match[i]; const dist = dept ? distByGeo[dept] : null;
          if (dist) setSelDist(prev => prev?.nombre === dist.nombre ? null : dist);
        });

      // Labels: seat count + mini dots showing party composition
      const labelG = svg.append('g').attr('pointer-events', 'none');
      const SMALL_DEPTS: Record<string, { dx: number; dy: number }> = {
        'Callao': { dx: -50, dy: 18 }, 'Tumbes': { dx: 22, dy: -16 }, 'Moquegua': { dx: 30, dy: 10 },
      };
      features.forEach((f, i) => {
        const dept = match[i]; if (!dept) return;
        const dist = distByGeo[dept]; if (!dist) return;
        const centroid = pathGen.centroid(f as any);
        if (isNaN(centroid[0])) return;
        const small = SMALL_DEPTS[dept];
        const tx = small ? centroid[0] + small.dx : centroid[0];
        const ty = small ? centroid[1] + small.dy : centroid[1];
        const fs = W < 380 ? 13 : 16;

        if (small) {
          labelG.append('line').attr('x1', centroid[0]).attr('y1', centroid[1]).attr('x2', tx).attr('y2', ty)
            .attr('stroke', 'rgba(15,23,42,.3)').attr('stroke-width', .7);
          labelG.append('circle').attr('cx', centroid[0]).attr('cy', centroid[1]).attr('r', 1.5).attr('fill', 'rgba(15,23,42,.4)');
        }

        // White circle bg for readability
        labelG.append('circle')
          .attr('cx', tx).attr('cy', ty)
          .attr('r', fs * 0.85)
          .attr('fill', 'rgba(255,255,255,.92)')
          .attr('stroke', 'rgba(15,23,42,.1)').attr('stroke-width', .8)
          .style('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,.1))');

        // Big number
        labelG.append('text')
          .attr('x', tx).attr('y', ty + fs * 0.35).attr('text-anchor', 'middle')
          .attr('font-size', fs).attr('font-family', 'Montserrat, Inter, sans-serif')
          .attr('font-weight', 800).attr('fill', '#0f172a')
          .text(String(dist.escanos));

        // Mini composition dots below the number (max ~8 dots visible)
        const withSeats = dist.partidos.filter(p => p.escanos > 0).sort((a, b) => b.escanos - a.escanos);
        const dots: string[] = [];
        for (const p of withSeats) {
          for (let j = 0; j < Math.min(p.escanos, 10); j++) dots.push(colorOfPartido(p.codigo));
        }
        const dotR = W < 380 ? 2.5 : 3;
        const maxDots = Math.min(dots.length, 10);
        const dotSpacing = dotR * 2.6;
        const dotStartX = tx - (maxDots - 1) * dotSpacing / 2;
        const dotY = ty + fs * 0.8 + dotR + 3;
        dots.slice(0, maxDots).forEach((c, j) => {
          labelG.append('circle')
            .attr('cx', dotStartX + j * dotSpacing)
            .attr('cy', dotY)
            .attr('r', dotR)
            .attr('fill', c)
            .attr('stroke', '#fff').attr('stroke-width', .6);
        });
      });

      // Extranjero badge (bottom-left)
      const ext = data.distritos.find(d => d.nombre.includes('EXTRANJERO'));
      if (ext) {
        const ex = W * 0.12, ey = H * 0.84;
        const g = svg.append('g').style('cursor', 'pointer').on('click', () => setSelDist(ext));
        g.append('circle').attr('cx', ex).attr('cy', ey).attr('r', 20).attr('fill', colorOfPartido(ext.partidos[0]?.codigo || '')).attr('opacity', .3);
        g.append('text').attr('x', ex).attr('y', ey + 4).attr('text-anchor', 'middle')
          .attr('font-size', 14).attr('font-weight', 800).attr('fill', '#0f172a')
          .attr('font-family', 'Montserrat, sans-serif').text(String(ext.escanos));
        g.append('text').attr('x', ex).attr('y', ey + 16).attr('text-anchor', 'middle')
          .attr('font-size', 7).attr('fill', '#64748b').attr('font-weight', 700)
          .attr('font-family', 'Inter, sans-serif').text('Extranjero');
      }
    }
    draw();
    return () => { cancelled = true; };
  }, [data, distByGeo]);

  // Minidonuts for the legend
  const partySeats = useMemo(() => {
    const m: Record<string, { cod: string; name: string; seats: number }> = {};
    for (const d of data.distritos) {
      for (const p of d.partidos) {
        if (p.escanos > 0) {
          if (!m[p.codigo]) m[p.codigo] = { cod: p.codigo, name: p.nombre, seats: 0 };
          m[p.codigo].seats += p.escanos;
        }
      }
    }
    return Object.values(m).sort((a, b) => b.seats - a.seats);
  }, [data]);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: selDist ? '1fr 380px' : '1fr', gap: 16, alignItems: 'start' }}>
        <div>
          <div ref={wrapRef} style={{ position: 'relative', background: '#f8fafc', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(15,23,42,.06)' }}>
            <div ref={svgRef} style={{ width: '100%' }} />
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14, padding: '0 4px' }}>
            {partySeats.map(p => (
              <span key={p.cod} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, background: colorOfPartido(p.cod), border: '1px solid rgba(0,0,0,.08)' }} />
                <span style={{ fontWeight: 600, color: 'var(--tx1)' }}>{nombreCorto(p.name)}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--tx3)', fontWeight: 700 }}>{p.seats}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Panel lateral */}
        {selDist && (
          <div className="card" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', position: 'sticky', top: 80 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--tx1)' }}>{selDist.nombre}</div>
                <div style={{ fontSize: 12, color: 'var(--tx3)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                  {selDist.escanos} escaños · {selDist.pctActas.toFixed(2)}% actas
                </div>
              </div>
              <button onClick={() => setSelDist(null)} style={{ all: 'unset', cursor: 'pointer', fontSize: 20, color: 'var(--tx3)', lineHeight: 1 }}>✕</button>
            </div>

            {/* Mini progress bar de partidos */}
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
              {selDist.partidos.filter(p => p.escanos > 0).sort((a, b) => b.escanos - a.escanos).map(p => (
                <div key={p.codigo} style={{ flex: p.escanos, background: colorOfPartido(p.codigo), minWidth: 3 }} title={`${nombreCorto(p.nombre)}: ${p.escanos}`} />
              ))}
            </div>

            {selDist.partidos.filter(p => p.escanos > 0).sort((a, b) => b.escanos - a.escanos).map(p => (
              <div key={p.codigo} style={{ marginBottom: 16, borderLeft: `4px solid ${colorOfPartido(p.codigo)}`, paddingLeft: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: colorOfPartido(p.codigo), fontSize: 13 }}>{nombreCorto(p.nombre)}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 14, color: 'var(--tx1)' }}>{p.escanos} escaño{p.escanos > 1 ? 's' : ''}</span>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--tx3)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>
                  {p.votos.toLocaleString('es-PE')} votos · {p.pct.toFixed(2)}%
                </div>
                {p.candidatos.filter(c => c.electo).map((c, i) => (
                  <div key={c.dni || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                    <CandidatePhoto dni={c.dni} nombre={c.nombre} color={colorOfPartido(p.codigo)} size={36} ring={false} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.nombre}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--tx3)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {c.votosPreferenciales.toLocaleString('es-PE')} votos pref.
                      </div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#059669', background: 'rgba(5,150,105,.1)', padding: '3px 7px', borderRadius: 5, letterSpacing: .5 }}>ELECTO</span>
                  </div>
                ))}
              </div>
            ))}

            <details style={{ marginTop: 8, fontSize: 12 }}>
              <summary style={{ cursor: 'pointer', color: 'var(--tx3)', fontWeight: 600, fontSize: 11 }}>
                Partidos sin escaños ({selDist.partidos.filter(p => p.escanos === 0).length})
              </summary>
              <div style={{ marginTop: 6 }}>
                {selDist.partidos.filter(p => p.escanos === 0 && p.votos > 0).sort((a, b) => b.votos - a.votos).map(p => (
                  <div key={p.codigo} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11, color: 'var(--tx3)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: colorOfPartido(p.codigo) }} />
                      {nombreCorto(p.nombre)}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{p.pct.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </>
  );
}
