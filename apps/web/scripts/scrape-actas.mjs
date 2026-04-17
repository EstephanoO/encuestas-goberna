// Scraper de ACTAS por distrito político (ONPE · Presidencial 2026)
// Self-scheduled loop. INTERVAL = gap mínimo entre fins (default 120 s).
//
// Escribe:
//   public/data/actas.json           — snapshot actual
//   public/data/actas-timeline.json  — serie nacional (cap 720 = 24 h × 2 min)
//   public/data/actas-history.json   — ring de últimas 30 lecturas con top60 distritos + 25 deptos
//
// Uso:
//   node scripts/scrape-actas.mjs --watch   # loop
//   INTERVAL=120 node scripts/scrape-actas.mjs --watch
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const OUT = path.join(DATA_DIR, 'actas.json');
const TIMELINE = path.join(DATA_DIR, 'actas-timeline.json');
const HISTORY = path.join(DATA_DIR, 'actas-history.json');
const CAND_OUT = path.join(DATA_DIR, 'actas-candidatos.json');
const INTERVAL = (Number(process.env.INTERVAL) || 120) * 1000;
const WATCH = process.argv.includes('--watch');
const KEEP_TIMELINE = 720;   // 24 h a 2 min
const KEEP_HISTORY = 30;     // 1 h a 2 min
const TOP_DISTRITOS = 60;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const BASE = 'https://resultadoelectoral.onpe.gob.pe/presentacion-backend';
const REF = '/main/presidenciales';
const HEADERS = {
  'Content-Type': 'application/json', 'Accept': '*/*',
  'Sec-Fetch-Site': 'same-origin', 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Dest': 'empty',
  'Referer': `https://resultadoelectoral.onpe.gob.pe${REF}`,
};

async function jget(page, url) {
  try {
    const r = await page.request.get(url, { headers: HEADERS });
    if (!r.ok() || r.status() === 204) return null;
    const txt = await r.text();
    if (txt.startsWith('<')) return null;
    return JSON.parse(txt);
  } catch { return null; }
}
async function batched(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    const r = await Promise.all(items.slice(i, i + size).map(fn));
    out.push(...r);
  }
  return out;
}
async function readJson(p, fallback) {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return fallback; }
}

async function scrape() {
  const t0 = Date.now();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA });
  const page = await ctx.newPage();
  await page.goto(`https://resultadoelectoral.onpe.gob.pe${REF}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const nacTot = (await jget(page, `${BASE}/resumen-general/totales?idEleccion=10&tipoFiltro=eleccion`))?.data;
  if (!nacTot) { await browser.close(); throw new Error('no nacTot'); }

  const deptos = (await jget(page, `${BASE}/ubigeos/departamentos?idEleccion=10&idAmbitoGeografico=1`))?.data || [];
  const distritos = [];
  for (const d of deptos) {
    const provs = (await jget(page, `${BASE}/ubigeos/provincias?idEleccion=10&idAmbitoGeografico=1&idUbigeoDepartamento=${d.ubigeo}`))?.data || [];
    for (const p of provs) {
      const dists = (await jget(page, `${BASE}/ubigeos/distritos?idEleccion=10&idAmbitoGeografico=1&idUbigeoDepartamento=${d.ubigeo}&idUbigeoProvincia=${p.ubigeo}`))?.data || [];
      for (const di of dists) distritos.push({ dept: d.nombre, deptUbi: d.ubigeo, prov: p.nombre, provUbi: p.ubigeo, dist: di.nombre, distUbi: di.ubigeo });
    }
  }

  const rows = await batched(distritos, 8, async (d) => {
    const [totResp, partResp] = await Promise.all([
      jget(page, `${BASE}/resumen-general/totales?tipoFiltro=ubigeo_nivel_03&idAmbitoGeografico=1&idUbigeoDepartamento=${d.deptUbi}&idUbigeoProvincia=${d.provUbi}&idUbigeoDistrito=${d.distUbi}&idEleccion=10`),
      jget(page, `${BASE}/eleccion-presidencial/participantes-ubicacion-geografica-nombre?tipoFiltro=ubigeo_nivel_03&idAmbitoGeografico=1&ubigeoNivel1=${d.deptUbi}&ubigeoNivel2=${d.provUbi}&ubigeoNivel3=${d.distUbi}&idEleccion=10`),
    ]);
    const tot = totResp?.data;
    if (!tot) return null;
    const contab = tot.contabilizadas ?? tot.totalActasContabilizadas ?? 0;
    const total = tot.totalActas ?? 0;
    const pendientesJee = tot.pendientesJee ?? 0;
    const enviadasJee = tot.enviadasJee ?? 0;
    // Candidatos: map a shape compacto
    const part = (partResp?.data || [])
      .filter(p => (p.totalVotosValidos ?? 0) > 0 || (p.porcentajeVotosValidos ?? 0) > 0)
      .map(p => ({
        cod: p.codigoAgrupacionPolitica,
        partido: p.nombreAgrupacionPolitica,
        cand: p.nombreCandidato || '',
        votos: p.totalVotosValidos ?? 0,
        pct: p.porcentajeVotosValidos ?? 0,
      }))
      .sort((a, b) => b.votos - a.votos);
    const ganador = part[0] || null;
    const segundo = part[1] || null;
    const margen = ganador && segundo ? (ganador.pct - segundo.pct) : null;
    return {
      dept: d.dept, prov: d.prov, dist: d.dist, ubigeo: d.distUbi,
      contab, total,
      faltantes: pendientesJee, enviadasJee, pendientesJee,
      pct: tot.actasContabilizadas ?? 0,
      votosEmitidos: tot.totalVotosEmitidos ?? 0,
      electoresHabiles: tot.totalElectoresHabiles ?? 0,
      participacion: tot.participacionCiudadana ?? null,
      ganador,
      margen,
      candidatos: part.slice(0, 3),  // top 3 para peso ligero
    };
  });
  const distritosOut = rows.filter(Boolean).sort((a, b) => b.faltantes - a.faltantes);
  await browser.close();

  // Deptos agregados
  const porDept = {};
  for (const r of distritosOut) {
    const k = r.dept;
    porDept[k] = porDept[k] || { dept: k, contab: 0, total: 0, faltantes: 0, enviadasJee: 0, distritos: 0 };
    porDept[k].contab += r.contab;
    porDept[k].total += r.total;
    porDept[k].faltantes += r.faltantes;
    porDept[k].enviadasJee += r.enviadasJee || 0;
    porDept[k].distritos += 1;
  }
  const departamentos = Object.values(porDept)
    .map(d => ({ ...d, pct: d.total ? (d.contab / d.total) * 100 : 0 }))
    .sort((a, b) => b.faltantes - a.faltantes);

  const scrapedAt = new Date().toISOString();
  const nacional = {
    contabilizadas: nacTot.contabilizadas,
    totalActas: nacTot.totalActas,
    // faltantes = SOLO pendientes (cola) — no suma enviadasJee
    faltantes: nacTot.pendientesJee ?? 0,
    pendientesJee: nacTot.pendientesJee ?? 0,
    enviadasJee: nacTot.enviadasJee ?? 0,
    pct: nacTot.actasContabilizadas,
    votosEmitidos: nacTot.totalVotosEmitidos,
  };

  const snapshot = {
    scrapedAt,
    fechaActualizacion: nacTot.fechaActualizacion,
    nacional,
    distritos: distritosOut,
    departamentos,
  };

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(snapshot, null, 2));

  // actas-candidatos.json — shape compacto para el mapa interactivo
  const candidatos = {
    scrapedAt,
    distritos: distritosOut
      .filter(d => d.ganador)
      .map(d => ({
        ubigeo: d.ubigeo, dept: d.dept, prov: d.prov, dist: d.dist,
        pct: d.pct, participacion: d.participacion,
        votosEmitidos: d.votosEmitidos,
        ganador: d.ganador,
        margen: d.margen,
        top3: d.candidatos,
      })),
  };
  await fs.writeFile(CAND_OUT, JSON.stringify(candidatos));

  // Timeline nacional
  let timeline = await readJson(TIMELINE, []);
  timeline.push({
    ts: scrapedAt,
    contab: nacional.contabilizadas, total: nacional.totalActas,
    faltantes: nacional.faltantes, pct: nacional.pct,
    enviadasJee: nacional.enviadasJee, votosEmitidos: nacional.votosEmitidos,
  });
  if (timeline.length > KEEP_TIMELINE) timeline = timeline.slice(-KEEP_TIMELINE);
  await fs.writeFile(TIMELINE, JSON.stringify(timeline));

  // History ring: 30 snapshots con top60 distritos + 25 deptos (para sparklines + velocity)
  let history = await readJson(HISTORY, []);
  history.push({
    ts: scrapedAt,
    nacional,
    deptos: departamentos.map(d => ({ d: d.dept, c: d.contab, t: d.total, f: d.faltantes })),
    tops: distritosOut.slice(0, TOP_DISTRITOS).map(x => ({
      u: x.ubigeo, n: x.dist, p: x.prov, dp: x.dept, c: x.contab, t: x.total, f: x.faltantes,
    })),
  });
  if (history.length > KEEP_HISTORY) history = history.slice(-KEEP_HISTORY);
  await fs.writeFile(HISTORY, JSON.stringify(history));

  const ms = Date.now() - t0;
  console.log(`  ✓ ${distritosOut.length}d · ${nacional.pct.toFixed(3)}% · -${nacional.faltantes.toLocaleString('es-PE')} actas · ${ms}ms`);
}

async function runOnce() {
  try { await scrape(); } catch (e) { console.error('  ✗', e.message); }
}

// Self-scheduled loop: esperar INTERVAL después de que termine la corrida anterior
console.log(`[scrape-actas] INTERVAL=${INTERVAL / 1000}s watch=${WATCH}`);
await runOnce();
if (WATCH) {
  while (true) {
    await new Promise(r => setTimeout(r, INTERVAL));
    await runOnce();
  }
}
