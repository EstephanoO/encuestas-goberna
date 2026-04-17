// Dashboard analytics propio — parsea el access log de nginx
// Sin deps externas. Puerto 8090 (solo loopback, detrás de basic auth en nginx).
//
// ENV:
//   ACCESS_LOG = /var/log/nginx/encuesta-goberna.access.log
//   PORT       = 8090
import http from 'node:http';
import fs from 'node:fs';
import readline from 'node:readline';
import geoip from 'geoip-lite';

const LOG = process.env.ACCESS_LOG || '/var/log/nginx/encuesta-goberna.access.log';
const PORT = Number(process.env.PORT) || 8090;
const BEACON_LOG = process.env.BEACON_LOG || '/home/deploy/onpe-visual/public/data/beacons.jsonl';
const BEACON_MAX_LINES = 200_000;

// ISO-3166 alpha2 → Español
const COUNTRY_ES = {
  PE: 'Perú', US: 'Estados Unidos', BR: 'Brasil', AR: 'Argentina', CL: 'Chile',
  CO: 'Colombia', MX: 'México', VE: 'Venezuela', EC: 'Ecuador', BO: 'Bolivia',
  PY: 'Paraguay', UY: 'Uruguay', CR: 'Costa Rica', PA: 'Panamá', DO: 'R. Dominicana',
  CU: 'Cuba', GT: 'Guatemala', HN: 'Honduras', SV: 'El Salvador', NI: 'Nicaragua',
  ES: 'España', FR: 'Francia', DE: 'Alemania', IT: 'Italia', GB: 'Reino Unido',
  PT: 'Portugal', NL: 'Países Bajos', BE: 'Bélgica', CH: 'Suiza', SE: 'Suecia',
  NO: 'Noruega', DK: 'Dinamarca', FI: 'Finlandia', PL: 'Polonia', RU: 'Rusia',
  CN: 'China', JP: 'Japón', KR: 'Corea del Sur', IN: 'India', TH: 'Tailandia',
  AU: 'Australia', NZ: 'Nueva Zelanda', CA: 'Canadá', ZA: 'Sudáfrica',
  IL: 'Israel', TR: 'Turquía', AE: 'EAU', SA: 'Arabia Saudita', EG: 'Egipto',
};
const FLAG = {
  PE: '🇵🇪', US: '🇺🇸', BR: '🇧🇷', AR: '🇦🇷', CL: '🇨🇱', CO: '🇨🇴', MX: '🇲🇽',
  VE: '🇻🇪', EC: '🇪🇨', BO: '🇧🇴', PY: '🇵🇾', UY: '🇺🇾', CR: '🇨🇷', PA: '🇵🇦',
  DO: '🇩🇴', CU: '🇨🇺', GT: '🇬🇹', HN: '🇭🇳', SV: '🇸🇻', NI: '🇳🇮', ES: '🇪🇸',
  FR: '🇫🇷', DE: '🇩🇪', IT: '🇮🇹', GB: '🇬🇧', PT: '🇵🇹', NL: '🇳🇱', BE: '🇧🇪',
  CH: '🇨🇭', SE: '🇸🇪', NO: '🇳🇴', DK: '🇩🇰', FI: '🇫🇮', PL: '🇵🇱', RU: '🇷🇺',
  CN: '🇨🇳', JP: '🇯🇵', KR: '🇰🇷', IN: '🇮🇳', TH: '🇹🇭', AU: '🇦🇺', NZ: '🇳🇿',
  CA: '🇨🇦', ZA: '🇿🇦', IL: '🇮🇱', TR: '🇹🇷', AE: '🇦🇪', SA: '🇸🇦', EG: '🇪🇬',
};

// combined log format:
//   $remote_addr - - [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
const LINE_RE = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) ([^"]+) [^"]+" (\d+) \d+ "([^"]*)" "([^"]*)"/;

const MONTHS = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
function parseDate(s) {
  // 15/Apr/2026:10:32:14 -0500
  const m = /^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s*([+-]\d{4})/.exec(s);
  if (!m) return null;
  const utc = new Date(Date.UTC(+m[3], MONTHS[m[2]] ?? 0, +m[1], +m[4], +m[5], +m[6]));
  // Ajustar timezone offset: -0500 → restar -5h → sumar 5h
  const offStr = m[7]; // e.g. "-0500"
  const offSign = offStr[0] === '-' ? -1 : 1;
  const offH = parseInt(offStr.slice(1, 3), 10);
  const offM = parseInt(offStr.slice(3, 5), 10);
  utc.setTime(utc.getTime() - offSign * (offH * 3600000 + offM * 60000));
  return utc;
}

// Lookup via geoip-lite (MaxMind GeoLite2 embebida, sin red)
function ipCountry(ip) {
  if (!ip) return { name: '—', code: '', flag: '' };
  if (ip === '127.0.0.1' || ip === '::1') return { name: 'local', code: '', flag: '' };
  const g = geoip.lookup(ip);
  if (!g || !g.country) return { name: '—', code: '', flag: '' };
  const code = g.country;
  return {
    name: COUNTRY_ES[code] || code,
    code,
    flag: FLAG[code] || '🌐',
    city: g.city || '',
    region: g.region || '',
  };
}
function ipCity(ip) {
  if (!ip) return null;
  const g = geoip.lookup(ip);
  if (!g || !g.city) return null;
  const code = g.country;
  const country = COUNTRY_ES[code] || code;
  return `${g.city}, ${country}`;
}

// Referrer parser → host
function refHost(ref) {
  if (!ref || ref === '-') return '(directo)';
  try {
    const u = new URL(ref);
    const h = u.hostname.toLowerCase();
    if (h === 'encuesta.institutogoberna.com') return '(navegación interna)';
    return h;
  } catch { return ref.slice(0, 60); }
}

function uaDevice(ua) {
  if (!ua) return 'otro';
  const u = ua.toLowerCase();
  if (u.includes('bot') || u.includes('spider') || u.includes('crawl') || u.includes('curl') || u.includes('wget')) return 'bot';
  if (u.includes('iphone') || u.includes('ipad') || u.includes('android')) return 'móvil';
  if (u.includes('mac os') || u.includes('macintosh')) return 'mac';
  if (u.includes('windows')) return 'windows';
  if (u.includes('linux')) return 'linux';
  return 'otro';
}

function uaBrowser(ua) {
  if (!ua) return 'otro';
  const u = ua.toLowerCase();
  if (u.includes('bot') || u.includes('spider') || u.includes('curl') || u.includes('wget')) return 'bot';
  if (u.includes('edg/')) return 'Edge';
  if (u.includes('chrome') && !u.includes('edg/')) return 'Chrome';
  if (u.includes('safari') && !u.includes('chrome')) return 'Safari';
  if (u.includes('firefox')) return 'Firefox';
  return 'otro';
}

function normalizePath(p) {
  if (!p) return '/';
  const q = p.split('?')[0];
  // agrupar assets en un bucket
  if (/\.(js|css|woff2?|ttf|svg|png|jpe?g|webp|avif|ico|map)$/i.test(q)) return '[asset]';
  if (q.startsWith('/api/')) return `[api] ${q}`;
  return q;
}

// ─── lee el log y construye un aggregate
async function buildStats() {
  if (!fs.existsSync(LOG)) return { error: 'log not found', path: LOG };

  // Leer log actual + rotado (.1) para no perder historial al rotar
  const logFiles = [LOG];
  const rotated = LOG + '.1';
  if (fs.existsSync(rotated)) logFiles.unshift(rotated); // .1 primero (más viejo)

  const now = Date.now();
  const DAY = 24 * 3600 * 1000;
  const HOUR = 3600 * 1000;
  const since7d = now - 7 * DAY;
  const since24h = now - 24 * HOUR;
  const since1h = now - HOUR;

  const total = { all: 0, pageViews: 0, apiHits: 0, assets: 0, bots: 0 };
  const byHourKey = new Map();
  const uniqPerHour = new Map();
  const byHour24 = new Map();
  const pages = new Map();
  const referrers = new Map();
  const countries = new Map();
  const countriesMeta = new Map();
  const cities = new Map();
  const devices = new Map();
  const browsers = new Map();
  const topIPs = new Map();
  const ipCountryCache = new Map();
  const last24h = { hits: 0, uniq: new Set() };
  const last1h = { hits: 0, uniq: new Set() };
  const last5m = { hits: 0, uniq: new Set() };  // activos ahora
  const last7d = { hits: 0, uniq: new Set() };
  const allTimeUniq = new Set();
  const since5m = now - 5 * 60 * 1000;
  // Nuevos vs recurrentes: trackear días en que cada IP aparece
  const ipDays = new Map(); // ip → Set<dayKey>
  // Ayer vs hoy para growth
  const todayKey = new Date(now - 5*3600*1000).toISOString().slice(0,10); // Lima timezone
  const yesterdayKey = new Date(now - 5*3600*1000 - 24*3600*1000).toISOString().slice(0,10);
  const dayStats = new Map(); // dayKey → {hits, uniq: Set}

  // Leer todos los logs secuencialmente
  async function* readAllLogs() {
    for (const f of logFiles) {
      const rl = readline.createInterface({ input: fs.createReadStream(f) });
      for await (const line of rl) yield line;
    }
  }

  for await (const line of readAllLogs()) {
    const m = LINE_RE.exec(line);
    if (!m) continue;
    const [, ip, ts, method, path, status, ref, ua] = m;
    if (method !== 'GET') continue;
    if (status !== '200' && status !== '304') continue;
    const dt = parseDate(ts);
    if (!dt) continue;

    total.all++;
    const np = normalizePath(path);
    const isPage = !np.startsWith('[');
    const isApi = np.startsWith('[api]');
    const isAsset = np === '[asset]';
    const device = uaDevice(ua);
    const isBot = device === 'bot';

    if (isAsset) total.assets++;
    else if (isApi) total.apiHits++;
    else if (!isBot) total.pageViews++;
    if (isBot) total.bots++;

    // por página
    if (isPage) {
      pages.set(np, (pages.get(np) || 0) + 1);
    }

    // referrer
    const rh = refHost(ref);
    if (isPage && !isBot) referrers.set(rh, (referrers.get(rh) || 0) + 1);

    // país / ciudad (geoip-lite) — por IP ÚNICA, no por hit
    if (isPage && !isBot) {
      let c = ipCountryCache.get(ip);
      if (!c) { c = ipCountry(ip); ipCountryCache.set(ip, c); }
      const key = c.code || c.name || '—';
      countriesMeta.set(key, { name: c.name, flag: c.flag });
      // Solo contar si esta IP no fue contada antes para este país
      if (!countries.has(key)) countries.set(key, new Set());
      countries.get(key).add(ip);
      if (c.city) {
        const cityKey = `${c.city}, ${c.name}`;
        if (!cities.has(cityKey)) cities.set(cityKey, new Set());
        cities.get(cityKey).add(ip);
      }
    }

    // dispositivo / browser
    if (isPage && !isBot) {
      devices.set(device, (devices.get(device) || 0) + 1);
      const b = uaBrowser(ua);
      browsers.set(b, (browsers.get(b) || 0) + 1);
    }

    // IPs
    if (isPage && !isBot) {
      topIPs.set(ip, (topIPs.get(ip) || 0) + 1);
    }

    const tms = dt.getTime();
    // Bucket horario (en hora Lima, UTC-5) para tendencia continua
    const lima = new Date(tms - 5 * 3600 * 1000);
    const hourKey = lima.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    if (isPage && !isBot) {
      byHourKey.set(hourKey, (byHourKey.get(hourKey) || 0) + 1);
      if (!uniqPerHour.has(hourKey)) uniqPerHour.set(hourKey, new Set());
      uniqPerHour.get(hourKey).add(ip);
    }
    if (isPage && !isBot) {
      allTimeUniq.add(ip);
      // IP × día para nuevos vs recurrentes
      const dayKey = dt.toISOString().slice(0, 10);
      if (!ipDays.has(ip)) ipDays.set(ip, new Set());
      ipDays.get(ip).add(dayKey);
      // Day stats para growth
      if (!dayStats.has(dayKey)) dayStats.set(dayKey, { hits: 0, uniq: new Set() });
      dayStats.get(dayKey).hits++;
      dayStats.get(dayKey).uniq.add(ip);

      if (tms >= since7d) { last7d.hits++; last7d.uniq.add(ip); }
      if (tms >= since24h) {
        last24h.hits++; last24h.uniq.add(ip);
        const h = String(lima.getUTCHours()).padStart(2, '0');
        byHour24.set(h, (byHour24.get(h) || 0) + 1);
      }
      if (tms >= since1h) { last1h.hits++; last1h.uniq.add(ip); }
      if (tms >= since5m) { last5m.hits++; last5m.uniq.add(ip); }
    }
  }

  // Serie horaria continua (14 días completos, el frontend elige qué ventana mostrar)
  const HOURS = 14 * 24;
  const hourSeries = [];
  const nowLima = new Date(Date.now() - 5 * 3600 * 1000);
  nowLima.setUTCMinutes(0, 0, 0);
  for (let i = HOURS - 1; i >= 0; i--) {
    const h = new Date(nowLima.getTime() - i * 3600 * 1000);
    const key = h.toISOString().slice(0, 13);
    hourSeries.push({
      ts: key,
      hits: byHourKey.get(key) || 0,
      uniq: uniqPerHour.get(key)?.size || 0,
    });
  }

  const mapTop = (m, n = 15) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ k, v }));

  const topCountries = [...countries.entries()]
    .map(([code, ipSet]) => ({ code, v: ipSet.size, ...(countriesMeta.get(code) || { name: code, flag: '🌐' }) }))
    .sort((a, b) => b.v - a.v).slice(0, 12);

  // Top IPs con país resuelto
  const topIPsWithCountry = mapTop(topIPs, 15).map(r => {
    const c = ipCountryCache.get(r.k) || ipCountry(r.k);
    return { ...r, country: c.name, flag: c.flag, city: c.city || '' };
  });

  const newVisitors = [...ipDays.values()].filter(s => s.size === 1).length;
  const returning = allTimeUniq.size - newVisitors;
  const todayS = dayStats.get(todayKey);
  const yesterdayS = dayStats.get(yesterdayKey);
  const growthPct = (todayS && yesterdayS && yesterdayS.uniq.size > 0)
    ? ((todayS.uniq.size - yesterdayS.uniq.size) / yesterdayS.uniq.size * 100)
    : null;
  const avgPages = last24h.uniq.size > 0 ? (last24h.hits / last24h.uniq.size) : 0;

  return {
    generatedAt: new Date().toISOString(),
    logPath: LOG,
    total,
    activeNow: { hits: last5m.hits, uniq: last5m.uniq.size },
    last1h: { hits: last1h.hits, uniq: last1h.uniq.size },
    last24h: { hits: last24h.hits, uniq: last24h.uniq.size },
    last7d: { hits: last7d.hits, uniq: last7d.uniq.size },
    allTime: { hits: total.pageViews, uniq: allTimeUniq.size },
    newVisitors, returning,
    growthPct: growthPct !== null ? Number(growthPct.toFixed(1)) : null,
    todayUniq: todayS?.uniq?.size || 0,
    yesterdayUniq: yesterdayS?.uniq?.size || 0,
    avgPagesPerVisitor: Number(avgPages.toFixed(1)),
    hourSeries,  // 336 puntos horarios en hora Lima
    byHour24: [...byHour24.entries()].sort().map(([h, n]) => ({ h, n })),
    topPages: mapTop(pages, 15),
    topReferrers: mapTop(referrers, 10),
    topCountries,
    topCities: [...cities.entries()].map(([k, s]) => ({k, v: s.size})).sort((a,b) => b.v - a.v).slice(0, 10),
    topIPs: topIPsWithCountry,
    devices: mapTop(devices, 10),
    browsers: mapTop(browsers, 10),
  };
}

// ─── helpers: SVG line chart horario
// Solo muestra las últimas N horas (default 72) con labels cada 6 h
const DIAS = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' };
function renderLineChart(fullSeries, windowH = 72) {
  const series = fullSeries.slice(-windowH);
  if (!series.length) return '<div style="padding:30px;text-align:center;color:var(--tx3)">Sin datos</div>';
  const W = 1100, H = 200, padL = 38, padR = 12, padT = 20, padB = 44;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxH = Math.max(1, ...series.map(p => p.hits));
  const maxU = Math.max(1, ...series.map(p => p.uniq));
  const maxY = Math.max(maxH, maxU);
  const x = (i) => padL + (i / Math.max(1, series.length - 1)) * innerW;
  const y = (v) => padT + innerH - (v / maxY) * innerH;
  const pathHits = series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.hits).toFixed(1)}`).join(' ');
  const pathUniq = series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.uniq).toFixed(1)}`).join(' ');
  const areaHits = pathHits + ` L${x(series.length - 1).toFixed(1)},${padT + innerH} L${x(0).toFixed(1)},${padT + innerH} Z`;

  // Tick horario cada 6h (00, 06, 12, 18). Marca día solo en las de 00h.
  const ticks = [];
  for (let i = 0; i < series.length; i++) {
    const hour = Number(series[i].ts.slice(11, 13));
    if (hour % 6 !== 0) continue;
    const d = new Date(series[i].ts + ':00:00Z');
    const dia = DIAS[d.getUTCDay()];
    ticks.push({
      i, hour,
      hourLabel: `${String(hour).padStart(2, '0')}h`,
      dayLabel: hour === 0 ? `${dia} ${series[i].ts.slice(8, 10)}/${series[i].ts.slice(5, 7)}` : '',
    });
  }
  const gridY = [0, 0.25, 0.5, 0.75, 1].map(t => padT + innerH * (1 - t));
  const yLabels = gridY.map((_, i) => Math.round(maxY * (i / (gridY.length - 1))));

  // Puntos de datos (un círculo cada 6 h para resaltar)
  const points = series.map((p, i) => (i % 6 === 0 || i === series.length - 1)
    ? `<circle cx="${x(i).toFixed(1)}" cy="${y(p.hits).toFixed(1)}" r="2.5" fill="#0891b2" stroke="#fff" stroke-width="1"/>`
    : '').join('');

  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:auto;display:block">
    ${gridY.map((gy, i) => `<line x1="${padL}" x2="${W - padR}" y1="${gy}" y2="${gy}" stroke="rgba(15,23,42,.06)" stroke-width="1"/>
      <text x="${padL - 6}" y="${gy + 3}" font-size="9" fill="#94a3b8" text-anchor="end" font-family="JetBrains Mono,monospace">${yLabels[gridY.length - 1 - i]}</text>`).join('')}
    ${ticks.map(t => `<line x1="${x(t.i)}" x2="${x(t.i)}" y1="${padT}" y2="${padT + innerH}" stroke="${t.hour === 0 ? 'rgba(15,23,42,.12)' : 'rgba(15,23,42,.04)'}" stroke-width="1"/>`).join('')}
    <path d="${areaHits}" fill="rgba(8,145,178,.14)"/>
    <path d="${pathUniq}" stroke="#059669" stroke-width="1.4" fill="none" stroke-dasharray="4,3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${pathHits}" stroke="#0891b2" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    ${points}
    ${ticks.map(t => `<text x="${x(t.i)}" y="${H - 22}" font-size="9.5" fill="${t.hour === 0 ? '#0f172a' : '#64748b'}" font-weight="${t.hour === 0 ? '700' : '500'}" text-anchor="middle" font-family="JetBrains Mono,monospace">${t.hourLabel}</text>
      ${t.dayLabel ? `<text x="${x(t.i)}" y="${H - 8}" font-size="9" fill="#0891b2" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">${t.dayLabel}</text>` : ''}`).join('')}
    <g font-size="10" font-family="Inter,sans-serif" fill="#475569">
      <rect x="${W - padR - 190}" y="${padT + 2}" width="12" height="3" fill="#0891b2"/>
      <text x="${W - padR - 172}" y="${padT + 7}">Hits/hora</text>
      <line x1="${W - padR - 100}" x2="${W - padR - 88}" y1="${padT + 4}" y2="${padT + 4}" stroke="#059669" stroke-width="1.4" stroke-dasharray="3,2"/>
      <text x="${W - padR - 84}" y="${padT + 7}">IPs únicas/hora</text>
    </g>
  </svg>`;
}
function renderHourBar(byHour24) {
  const W = 1100, H = 100, pad = 8;
  const hours = [];
  for (let h = 0; h < 24; h++) {
    const hk = String(h).padStart(2, '0');
    const item = byHour24.find(x => x.h === hk);
    hours.push({ h: hk, n: item?.n || 0 });
  }
  const max = Math.max(1, ...hours.map(x => x.n));
  const barW = (W - pad * 2) / 24 - 2;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:auto;display:block">
    ${hours.map((x, i) => {
      const h = (x.n / max) * (H - 24);
      const bx = pad + i * ((W - pad * 2) / 24);
      return `<rect x="${bx}" y="${H - 24 - h}" width="${barW}" height="${h}" fill="#0891b2" opacity="${0.3 + 0.7 * (x.n / max)}" rx="2"/>
              <text x="${bx + barW / 2}" y="${H - 10}" font-size="9" fill="#94a3b8" text-anchor="middle" font-family="JetBrains Mono,monospace">${x.h}</text>
              <text x="${bx + barW / 2}" y="${H - 26 - h}" font-size="9" fill="#0f172a" text-anchor="middle" font-family="JetBrains Mono,monospace" font-weight="600">${x.n || ''}</text>`;
    }).join('')}
  </svg>`;
}

// ─── Donut chart (top 8 países + otros)
function renderDonut(items, size = 180) {
  const PALETTE = ['#0891b2','#7c3aed','#059669','#d97706','#dc2626','#0284c7','#db2777','#16a34a','#94a3b8'];
  const top = items.slice(0, 8);
  const rest = items.slice(8).reduce((a, x) => a + x.v, 0);
  const data = rest > 0 ? [...top, { name: 'Otros', v: rest, flag: '🌐' }] : top;
  const total = data.reduce((a, x) => a + x.v, 0);
  if (total === 0) return '<div style="padding:30px;text-align:center;color:#94a3b8">Sin datos</div>';
  const cx = size / 2, cy = size / 2, r = size * 0.4, rIn = r * 0.62;
  let acc = 0;
  const slices = data.map((d, i) => {
    const frac = d.v / total;
    const start = acc; acc += frac;
    const a0 = start * Math.PI * 2 - Math.PI / 2;
    const a1 = acc * Math.PI * 2 - Math.PI / 2;
    const large = frac > 0.5 ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const xi0 = cx + rIn * Math.cos(a0), yi0 = cy + rIn * Math.sin(a0);
    const xi1 = cx + rIn * Math.cos(a1), yi1 = cy + rIn * Math.sin(a1);
    return `<path d="M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} L${xi1.toFixed(2)},${yi1.toFixed(2)} A${rIn},${rIn} 0 ${large} 0 ${xi0.toFixed(2)},${yi0.toFixed(2)} Z" fill="${PALETTE[i % PALETTE.length]}" opacity=".92"><title>${d.name || d.k}: ${d.v} (${(frac*100).toFixed(1)}%)</title></path>`;
  }).join('');
  return `<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
    <svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px;flex-shrink:0">
      ${slices}
      <text x="${cx}" y="${cy - 4}" font-family="JetBrains Mono,monospace" font-size="22" font-weight="700" fill="#0f172a" text-anchor="middle">${total.toLocaleString('es-PE')}</text>
      <text x="${cx}" y="${cy + 14}" font-family="JetBrains Mono,monospace" font-size="10" fill="#64748b" text-anchor="middle" letter-spacing="1.4">TOTAL</text>
    </svg>
    <div style="flex:1;min-width:160px">
      ${data.map((d, i) => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px">
        <span style="width:10px;height:10px;border-radius:2px;background:${PALETTE[i % PALETTE.length]}"></span>
        <span style="font-size:14px">${d.flag || '🌐'}</span>
        <span style="flex:1;color:#0f172a;font-weight:500">${d.name || d.k}</span>
        <strong style="font-family:'JetBrains Mono',monospace;color:#0f172a">${d.v.toLocaleString('es-PE')}</strong>
        <span style="color:#94a3b8;font-size:11px;font-family:'JetBrains Mono',monospace;min-width:42px;text-align:right">${(d.v/total*100).toFixed(1)}%</span>
      </div>`).join('')}
    </div>
  </div>`;
}
// ─── horizontal bars w/ gradient
function renderHBars(items, palette = ['#0891b2','#7c3aed','#059669','#d97706','#dc2626','#db2777','#16a34a','#94a3b8']) {
  if (!items.length) return '<div style="color:#94a3b8;padding:10px">sin datos</div>';
  const max = Math.max(...items.map(r => r.v), 1);
  return items.map((r, i) => {
    const pct = (r.v / max) * 100;
    const c = palette[i % palette.length];
    return `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;font-size:12px">
        <span style="font-weight:600;color:#0f172a">${r.k}</span>
        <strong style="font-family:'JetBrains Mono',monospace;font-size:12px;color:${c}">${r.v.toLocaleString('es-PE')}</strong>
      </div>
      <div style="height:6px;background:rgba(15,23,42,.06);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${pct.toFixed(1)}%;background:linear-gradient(90deg, ${c}, ${c}dd);border-radius:3px;transition:width .6s"></div>
      </div>
    </div>`;
  }).join('');
}

// ─── HTML dashboard
function htmlDashboard(s) {
  const j = JSON.stringify(s).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stats · Goberna</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap">
<style>
  :root{ --bg:#f4f7fb; --card:#fff; --border:rgba(15,23,42,.08); --tx:#0f172a; --tx2:#475569; --tx3:#94a3b8; --a:#0891b2; --d:#dc2626; --ok:#059669; --warn:#d97706; --violet:#7c3aed; --pink:#db2777; }
  *{box-sizing:border-box}
  body{margin:0; background:linear-gradient(180deg,#f4f7fb 0%, #eef2f8 100%); color:var(--tx); font-family:Inter, -apple-system, sans-serif; font-size:14px; padding:24px; min-height:100vh}
  @keyframes pulse-dot { 0%,100%{box-shadow:0 0 0 0 rgba(5,150,105,.55)} 50%{box-shadow:0 0 0 7px rgba(5,150,105,0)} }
  @keyframes fade-in { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
  @keyframes count-flash { 0%{background:rgba(8,145,178,.15)} 100%{background:transparent} }
  .anim-in{animation: fade-in .4s ease}
  .num-flash{animation: count-flash 1s ease}
  header{display:flex; justify-content:space-between; align-items:center; margin-bottom:22px; flex-wrap:wrap; gap:14px}
  h1{margin:0; font-size:24px; font-weight:800; letter-spacing:-.3px}
  .brand-sub{display:flex;align-items:center;gap:10px;color:var(--tx3); font-family:'JetBrains Mono', monospace; font-size:11px; margin-top:2px}
  .live-dot{width:7px;height:7px;border-radius:50%;background:var(--ok);animation:pulse-dot 2s infinite;flex-shrink:0}
  .header-actions{display:flex;gap:8px;align-items:center}
  .btn{padding:8px 14px; border:1px solid var(--border); background:var(--card); border-radius:8px; font-size:12px; cursor:pointer; font-weight:600; color:var(--tx); font-family:inherit;transition:all .15s}
  .btn:hover{border-color:var(--a); color:var(--a)}
  .refresh-hint{font-size:10.5px;color:var(--tx3);font-family:'JetBrains Mono',monospace;display:flex;align-items:center;gap:6px}
  .grid{display:grid; gap:12px}
  .kpis{grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); margin-bottom:16px}
  .kpi{background:var(--card); padding:14px 16px; border-radius:10px; border:1px solid var(--border); border-left:3px solid var(--c, var(--a)); transition:transform .15s}
  .kpi:hover{transform:translateY(-2px)}
  .kpi .l{font-size:9px; font-weight:700; letter-spacing:1.5px; color:var(--tx3); margin-bottom:4px; text-transform:uppercase}
  .kpi .v{font-size:22px; font-family:'JetBrains Mono', monospace; font-weight:700; color:var(--tx); letter-spacing:-.5px}
  .kpi .s{font-size:11px; color:var(--c, var(--a)); margin-top:3px; font-weight:500}
  .hero-grid{display:grid; grid-template-columns: 1.3fr 1fr; gap:14px; margin-bottom:16px}
  @media (max-width: 860px){ .hero-grid{grid-template-columns: 1fr} }
  .hero-uniq{
    background: linear-gradient(135deg, #0891b2 0%, #0ea5e9 55%, #22d3ee 100%);
    color:#fff; padding:26px 28px; border-radius:16px;
    box-shadow: 0 12px 32px rgba(8,145,178,.28);
    position:relative; overflow:hidden;
  }
  .hero-uniq::before{ content:''; position:absolute; right:-40px; top:-40px; width:220px; height:220px; border-radius:50%; background:rgba(255,255,255,.08); }
  .hero-uniq::after{ content:''; position:absolute; right:60px; bottom:-50px; width:120px; height:120px; border-radius:50%; background:rgba(255,255,255,.06); }
  .hero-uniq .hl{ font-size:10px; letter-spacing:2px; font-weight:800; opacity:.85; font-family:'JetBrains Mono', monospace; margin-bottom:4px; }
  .hero-uniq .hv{ font-size:56px; font-family:'JetBrains Mono', monospace; font-weight:700; letter-spacing:-2.5px; line-height:1; margin:8px 0; }
  .hero-uniq .hs{ font-size:13px; opacity:.92; font-family:Inter, sans-serif; font-weight:500; position:relative; z-index:2; }
  .hero-uniq .hspk{margin-top:14px; height:44px; opacity:.85}
  .hero-cols{ display:grid; grid-template-columns: 1fr; gap:10px; }
  .hero-cols .kpi{ padding:12px 14px; }
  .hero-cols .kpi .v{ font-size:20px; }
  .cards{grid-template-columns:repeat(auto-fit, minmax(340px, 1fr))}
  .card{background:var(--card); border:1px solid var(--border); border-radius:14px; padding:18px 20px; box-shadow:0 1px 2px rgba(15,23,42,.02)}
  .card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:6px}
  .card h2{margin:0; font-size:12px; font-weight:800; letter-spacing:1.5px; color:var(--tx3); text-transform:uppercase}
  table{width:100%; border-collapse:collapse; font-size:13px}
  td{padding:8px 4px; border-top:1px solid var(--border)}
  tr:first-child td{border-top:0}
  td.n{text-align:right; font-family:'JetBrains Mono', monospace; font-weight:700; color:var(--tx)}
  td.p{color:var(--tx2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:280px; font-weight:500}
  .days-chart{display:flex; align-items:flex-end; gap:4px; height:120px; padding:10px 0}
  .days-chart .bar-v{flex:1; min-width:18px; background:linear-gradient(180deg, #0891b2, #22d3ee); border-radius:3px 3px 0 0; position:relative}
</style></head>
<body>
<header>
  <div>
    <h1>Dashboard de visitas</h1>
    <div class="brand-sub"><span class="live-dot"></span> encuesta.institutogoberna.com · <span id="ts">${new Date(s.generatedAt).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</span></div>
  </div>
  <div class="header-actions">
    <span class="refresh-hint">⟳ auto-refresh <b id="countdown">30</b>s</span>
    <button class="btn" onclick="__refresh()">↻ Actualizar ahora</button>
  </div>
</header>

<div class="hero-grid">
  <div class="hero-uniq">
    <div class="hl">VISITANTES ÚNICOS · ÚLTIMAS 24H</div>
    <div class="hv" id="heroUniq">${s.last24h.uniq.toLocaleString('es-PE')}</div>
    <div class="hs"><b id="heroHour">${s.last1h.uniq.toLocaleString('es-PE')}</b> en la última hora · <b id="heroHits">${s.last24h.hits.toLocaleString('es-PE')}</b> vistas · <b>${s.activeNow.uniq}</b> activos ahora</div>
    <div class="hspk" id="heroSpark"></div>
  </div>
  <div class="hero-cols">
    <div class="kpi" style="--c:#059669"><div class="l">⚡ ACTIVOS AHORA</div><div class="v">${s.activeNow.uniq}</div><div class="s">${s.activeNow.hits} hits últimos 5 min</div></div>
    <div class="kpi" style="--c:#0891b2"><div class="l">ÚLTIMA HORA</div><div class="v">${s.last1h.uniq.toLocaleString('es-PE')}</div><div class="s">visitantes únicos</div></div>
    <div class="kpi" style="--c:#7c3aed"><div class="l">7 DÍAS</div><div class="v">${s.last7d.uniq.toLocaleString('es-PE')}</div><div class="s">visitantes únicos</div></div>
  </div>
</div>

<div class="grid kpis" style="grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));">
  <div class="kpi" style="--c:#0891b2"><div class="l">VISTAS · 24H</div><div class="v">${s.last24h.hits.toLocaleString('es-PE')}</div><div class="s">pageviews</div></div>
  <div class="kpi" style="--c:${(s.growthPct ?? 0) >= 0 ? '#059669' : '#dc2626'}"><div class="l">HOY vs AYER</div><div class="v">${s.growthPct !== null ? (s.growthPct >= 0 ? '+' : '') + s.growthPct + '%' : '—'}</div><div class="s">${s.todayUniq} hoy · ${s.yesterdayUniq} ayer</div></div>
  <div class="kpi" style="--c:#d97706"><div class="l">PÁGINAS/VISITANTE</div><div class="v">${s.avgPagesPerVisitor}</div><div class="s">promedio últimas 24h</div></div>
  <div class="kpi" style="--c:#7c3aed"><div class="l">NUEVOS vs RECURRENTES</div><div class="v">${s.newVisitors}/${s.returning}</div><div class="s">${s.allTime.uniq} totales</div></div>
</div>

<div class="card" style="margin-bottom:12px">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px">
    <h2 style="margin:0">Tráfico por hora · <span id="winLabel">últimas 72 h</span> (hora Lima)</h2>
    <div id="winPicker" style="display:flex;gap:4px">
      ${[24, 48, 72, 168, 336].map(n => {
        const label = n < 48 ? '24h' : n < 72 ? '48h' : n < 168 ? '72h' : n < 336 ? '7d' : '14d';
        const active = n === 72;
        return `<button data-w="${n}" onclick="__setWin(${n})" style="padding:5px 10px;font-size:11px;border-radius:6px;cursor:pointer;font-weight:600;border:1px solid ${active ? '#0891b2' : 'rgba(15,23,42,.12)'};background:${active ? '#0891b2' : '#fff'};color:${active ? '#fff' : '#475569'}" class="win-btn ${active ? 'active' : ''}">${label}</button>`;
      }).join('')}
    </div>
  </div>
  <div id="lineChart">${renderLineChart(s.hourSeries, 72)}</div>
</div>
<script>
  (function(){
    const FULL = window.__stats.hourSeries;
    function charts(series, windowH) {
      // Replica la lógica del server en cliente para redibujar sin refetch
      const s = series.slice(-windowH);
      const W=1100,H=200,padL=38,padR=12,padT=20,padB=44;
      const innerW=W-padL-padR, innerH=H-padT-padB;
      const maxY = Math.max(1, ...s.flatMap(p=>[p.hits,p.uniq]));
      const x = i => padL + (i/Math.max(1,s.length-1))*innerW;
      const y = v => padT + innerH - (v/maxY)*innerH;
      const pH = s.map((p,i)=>\`\${i?'L':'M'}\${x(i).toFixed(1)},\${y(p.hits).toFixed(1)}\`).join(' ');
      const pU = s.map((p,i)=>\`\${i?'L':'M'}\${x(i).toFixed(1)},\${y(p.uniq).toFixed(1)}\`).join(' ');
      const area = pH + \` L\${x(s.length-1).toFixed(1)},\${padT+innerH} L\${x(0).toFixed(1)},\${padT+innerH} Z\`;
      const DIAS = {0:'Dom',1:'Lun',2:'Mar',3:'Mié',4:'Jue',5:'Vie',6:'Sáb'};
      const ticks = [];
      // tick cada 1h si <=48, cada 3h si <=72, cada 6h <=168, cada 12h si 336
      const step = windowH <= 48 ? (windowH<=24?2:3) : windowH <= 72 ? 6 : windowH <= 168 ? 12 : 24;
      for (let i=0; i<s.length; i++) {
        const hour = Number(s[i].ts.slice(11,13));
        if (hour % step !== 0) continue;
        const d = new Date(s[i].ts+':00:00Z');
        ticks.push({i, hour, hl: String(hour).padStart(2,'0')+'h', dl: hour===0 ? DIAS[d.getUTCDay()]+' '+s[i].ts.slice(8,10)+'/'+s[i].ts.slice(5,7) : ''});
      }
      const gridY=[0,.25,.5,.75,1].map(t=>padT+innerH*(1-t));
      const yL=gridY.map((_,i)=>Math.round(maxY*(i/(gridY.length-1))));
      const points=s.map((p,i)=>(i%step===0||i===s.length-1) ? \`<circle cx="\${x(i).toFixed(1)}" cy="\${y(p.hits).toFixed(1)}" r="2.5" fill="#0891b2" stroke="#fff" stroke-width="1"/>\` : '').join('');
      return \`<svg viewBox="0 0 \${W} \${H}" preserveAspectRatio="none" style="width:100%;height:auto;display:block">
        \${gridY.map((gy,i)=>\`<line x1="\${padL}" x2="\${W-padR}" y1="\${gy}" y2="\${gy}" stroke="rgba(15,23,42,.06)" stroke-width="1"/><text x="\${padL-6}" y="\${gy+3}" font-size="9" fill="#94a3b8" text-anchor="end" font-family="JetBrains Mono,monospace">\${yL[gridY.length-1-i]}</text>\`).join('')}
        \${ticks.map(t=>\`<line x1="\${x(t.i)}" x2="\${x(t.i)}" y1="\${padT}" y2="\${padT+innerH}" stroke="\${t.hour===0?'rgba(15,23,42,.12)':'rgba(15,23,42,.04)'}" stroke-width="1"/>\`).join('')}
        <path d="\${area}" fill="rgba(8,145,178,.14)"/>
        <path d="\${pU}" stroke="#059669" stroke-width="1.4" fill="none" stroke-dasharray="4,3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="\${pH}" stroke="#0891b2" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        \${points}
        \${ticks.map(t=>\`<text x="\${x(t.i)}" y="\${H-22}" font-size="9.5" fill="\${t.hour===0?'#0f172a':'#64748b'}" font-weight="\${t.hour===0?'700':'500'}" text-anchor="middle" font-family="JetBrains Mono,monospace">\${t.hl}</text>\${t.dl?\`<text x="\${x(t.i)}" y="\${H-8}" font-size="9" fill="#0891b2" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">\${t.dl}</text>\`:''}\`).join('')}
      </svg>\`;
    }
    window.__setWin = function(w) {
      document.getElementById('lineChart').innerHTML = charts(FULL, w);
      const label = w<48?'últimas 24 h':w<72?'últimas 48 h':w<168?'últimas 72 h':w<336?'últimos 7 días':'últimos 14 días';
      document.getElementById('winLabel').textContent = label;
      document.querySelectorAll('.win-btn').forEach(b => {
        const on = Number(b.dataset.w) === w;
        b.style.background = on?'#0891b2':'#fff';
        b.style.color = on?'#fff':'#475569';
        b.style.borderColor = on?'#0891b2':'rgba(15,23,42,.12)';
      });
    };
  })();
</script>

<div class="card" style="margin-bottom:12px">
  <h2>Patrón intradía · hits por hora del día</h2>
  ${renderHourBar(s.byHour24)}
</div>

<div class="grid cards">
  <div class="card" style="grid-column:span 2"><div class="card-head"><h2>Países</h2><small style="color:var(--tx3);font-family:'JetBrains Mono',monospace;font-size:10px">${s.topCountries.length} distintos</small></div><div id="donutCountries">${renderDonut(s.topCountries.map(c=>({name:c.name,v:c.v,flag:c.flag})))}</div></div>
  <div class="card"><h2>Páginas más vistas</h2><div id="topPages">${renderHBars(s.topPages.slice(0,10))}</div></div>
  <div class="card"><h2>Tiempo en página (mediana)</h2><div id="pageTime" style="color:var(--tx3);font-size:11.5px;padding:8px 0">Recolectando datos de beacons del sitio…</div></div>
  <div class="card"><h2>Clicks · qué se toca</h2><div id="clicksTargets" style="color:var(--tx3);font-size:11.5px;padding:8px 0">Recolectando clicks…</div></div>
  <div class="card"><h2>Clicks · en qué páginas</h2><div id="clicksPaths" style="color:var(--tx3);font-size:11.5px;padding:8px 0">Recolectando clicks…</div></div>
  <div class="card"><h2>De dónde vienen</h2><div id="topRefs">${renderHBars(s.topReferrers.slice(0,10), ['#7c3aed','#db2777','#dc2626','#d97706','#059669','#0891b2'])}</div></div>
  <div class="card"><h2>Ciudades</h2><div id="topCities">${s.topCities.length ? renderHBars(s.topCities.slice(0,10)) : '<div style="color:var(--tx3);padding:10px">sin datos</div>'}</div></div>
  <div class="card"><h2>Dispositivo</h2><div id="topDevs">${renderHBars(s.devices.slice(0,6), ['#0891b2','#7c3aed','#d97706','#dc2626','#059669','#94a3b8'])}</div></div>
  <div class="card"><h2>Navegador</h2><div id="topBrows">${renderHBars(s.browsers.slice(0,6), ['#0891b2','#059669','#d97706','#7c3aed','#db2777','#94a3b8'])}</div></div>
  <div class="card" style="grid-column:1/-1"><h2>Top IPs (con país y ciudad)</h2><div id="topIPs"><table>${s.topIPs.map(r => `<tr><td class="p"><span style="font-size:15px;margin-right:8px">${r.flag || '🌐'}</span><strong style="color:var(--tx);font-family:'JetBrains Mono',monospace">${r.k}</strong> <span style="color:var(--tx3);margin-left:10px;font-size:12px">${r.city ? '📍 '+r.city+', ' : ''}${r.country}</span></td><td class="n">${r.v}</td></tr>`).join('')}</table></div></div>
</div>

<footer style="margin-top:30px; font-size:11px; color:var(--tx3); font-family:'JetBrains Mono', monospace; text-align:center">
  Log: ${s.logPath} · generado <span id="genAt">${new Date(s.generatedAt).toISOString()}</span>
</footer>

<script>window.__stats=${j};
(function(){
  // ─── sparkline en el hero (últimas 48 h de hourSeries)
  function drawSpark() {
    const el = document.getElementById('heroSpark'); if (!el) return;
    const data = (window.__stats.hourSeries || []).slice(-48);
    if (!data.length) return;
    const W=320,H=44;
    const max = Math.max(1, ...data.map(p=>p.uniq));
    const x = i => (i/Math.max(1,data.length-1))*W;
    const y = v => H - (v/max)*H;
    const p = data.map((d,i)=>(i?'L':'M')+x(i).toFixed(1)+','+y(d.uniq).toFixed(1)).join(' ');
    const area = p+' L'+W+','+H+' L0,'+H+' Z';
    el.innerHTML = '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="width:100%;height:100%"><path d="'+area+'" fill="rgba(255,255,255,.3)"/><path d="'+p+'" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';
  }
  drawSpark();

  // ─── auto-refresh cada 30s
  let seconds = 30;
  const countdown = document.getElementById('countdown');
  function animateNum(el, newVal){
    if (!el) return;
    const cur = Number((el.textContent || '0').replace(/[^\\d]/g,'')) || 0;
    if (cur !== newVal) el.classList.add('num-flash');
    el.textContent = newVal.toLocaleString('es-PE');
    setTimeout(()=>el.classList.remove('num-flash'), 1000);
  }
  window.__refresh = async function(){
    seconds = 30;
    try {
      const r = await fetch('data?t='+Date.now(), {cache:'no-store'});
      if (!r.ok) return;
      const s = await r.json();
      window.__stats = s;
      animateNum(document.getElementById('heroUniq'), s.last24h.uniq);
      animateNum(document.getElementById('heroHour'), s.last1h.uniq);
      animateNum(document.getElementById('heroHits'), s.last24h.hits);
      document.getElementById('ts').textContent = new Date(s.generatedAt).toLocaleString('es-PE',{timeZone:'America/Lima'});
      drawSpark();
      // Actualizar KPIs secundarios
      document.querySelectorAll('[data-kpi]').forEach(el=>{
        const path = el.dataset.kpi.split('.');
        let v = s; for (const p of path) v = v?.[p];
        if (typeof v === 'number') animateNum(el, v);
      });
      // Fetch beacons stats para tiempo por página
      const b = await fetch('beacon/stats?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).catch(()=>null);
      if (b) renderBeaconStats(b);
    } catch(e){}
  };
  function renderBeaconStats(b) {
    const pt = document.getElementById('pageTime'); if (!pt) return;
    if (!b.pages || b.pages.length === 0) {
      pt.innerHTML = '<div style="color:var(--tx3);font-size:12px">Sin datos aún. El tracker recolecta cuando los usuarios visitan el sitio.</div>';
      return;
    }
    const rows = b.pages.map(p=>{
      const mins = Math.floor(p.medianSec/60), secs = Math.round(p.medianSec%60);
      const label = mins ? mins+'m '+secs+'s' : secs+'s';
      return '<div style="display:flex;justify-content:space-between;padding:5px 0;border-top:1px solid rgba(15,23,42,.05);font-size:12px"><span style="color:var(--tx);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px">'+p.path+'</span><strong style="font-family:\\'JetBrains Mono\\',monospace;color:var(--a)">'+label+'</strong><span style="color:var(--tx3);font-size:10.5px;font-family:\\'JetBrains Mono\\',monospace">'+p.n+' visitas</span></div>';
    }).join('');
    pt.innerHTML = rows;
    // clicks targets
    var ct = document.getElementById('clicksTargets');
    if (ct && b.topClickTargets) {
      if (!b.topClickTargets.length) ct.innerHTML = '<div style="color:var(--tx3);font-size:12px">Sin clicks aún</div>';
      else {
        var max = Math.max.apply(null, b.topClickTargets.map(function(r){return r.v})) || 1;
        ct.innerHTML = b.topClickTargets.map(function(r){
          var pct = (r.v/max)*100;
          return '<div style="margin-bottom:7px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="color:var(--tx);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px">'+r.k+'</span><strong style="font-family:\\'JetBrains Mono\\',monospace;color:var(--violet)">'+r.v+'</strong></div><div style="height:5px;background:rgba(15,23,42,.06);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+pct.toFixed(1)+'%;background:linear-gradient(90deg,#7c3aed,#a855f7);border-radius:3px"></div></div></div>';
        }).join('');
      }
    }
    var cp = document.getElementById('clicksPaths');
    if (cp && b.topClickPaths) {
      if (!b.topClickPaths.length) cp.innerHTML = '<div style="color:var(--tx3);font-size:12px">Sin datos aún</div>';
      else {
        var mx = Math.max.apply(null, b.topClickPaths.map(function(r){return r.v})) || 1;
        cp.innerHTML = b.topClickPaths.map(function(r){
          var pct = (r.v/mx)*100;
          return '<div style="margin-bottom:7px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="color:var(--tx);font-weight:500;font-family:\\'JetBrains Mono\\',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px">'+r.k+'</span><strong style="font-family:\\'JetBrains Mono\\',monospace;color:var(--pink)">'+r.v+'</strong></div><div style="height:5px;background:rgba(15,23,42,.06);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+pct.toFixed(1)+'%;background:linear-gradient(90deg,#db2777,#ec4899);border-radius:3px"></div></div></div>';
        }).join('');
      }
    }
  }
  setInterval(()=>{
    seconds--;
    if (countdown) countdown.textContent = seconds;
    if (seconds<=0) { window.__refresh(); }
  }, 1000);
  // primer pull de beacons
  fetch('beacon/stats?t='+Date.now()).then(r=>r.json()).then(renderBeaconStats).catch(()=>{});
})();
</script>
</body></html>`;
}

// ─── beacon storage (append-only JSONL con rotación blanda)
async function appendBeacon(rec) {
  try {
    const line = JSON.stringify(rec) + '\n';
    await fs.promises.appendFile(BEACON_LOG, line);
    // rotación suave cada ~50k escrituras: si file > 20MB, truncar a last 100k
    try {
      const st = await fs.promises.stat(BEACON_LOG);
      if (st.size > 20 * 1024 * 1024) {
        const data = await fs.promises.readFile(BEACON_LOG, 'utf8');
        const lines = data.trim().split('\n').slice(-100_000);
        await fs.promises.writeFile(BEACON_LOG, lines.join('\n') + '\n');
      }
    } catch {}
  } catch (e) { /* silent */ }
}

async function readBeacons() {
  if (!fs.existsSync(BEACON_LOG)) return [];
  const out = [];
  const rl = readline.createInterface({ input: fs.createReadStream(BEACON_LOG) });
  for await (const ln of rl) {
    if (!ln) continue;
    try { out.push(JSON.parse(ln)); } catch {}
  }
  return out;
}
function normPath(p) {
  if (!p) return '/';
  try { const u = new URL(p, 'http://x'); return (u.pathname + (u.hash || '')); } catch { return p; }
}

async function buildBeaconStats() {
  const all = await readBeacons();
  const pageviews = all.filter(b => b.type === 'pageview' && typeof b.duration === 'number' && b.duration > 0);
  const byPath = new Map();
  for (const p of pageviews) {
    const k = normPath(p.path);
    if (!byPath.has(k)) byPath.set(k, []);
    byPath.get(k).push(p.duration);
  }
  const pages = [...byPath.entries()].map(([path, arr]) => {
    arr.sort((a, b) => a - b);
    const mid = arr[Math.floor(arr.length / 2)];
    const avg = arr.reduce((a, v) => a + v, 0) / arr.length;
    return { path, n: arr.length, medianSec: mid, avgSec: Math.round(avg), maxSec: arr[arr.length - 1] };
  }).sort((a, b) => b.n - a.n).slice(0, 20);

  // clicks por path
  const clicks = all.filter(b => b.type === 'click');
  const clicksByPath = new Map();
  for (const c of clicks) {
    const k = normPath(c.path);
    clicksByPath.set(k, (clicksByPath.get(k) || 0) + 1);
  }
  const topClickPaths = [...clicksByPath.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 15).map(([k,v])=>({k, v}));

  // clicks por target (texto/selector)
  const clicksByTarget = new Map();
  for (const c of clicks) {
    const t = (c.target || '').slice(0, 60);
    if (!t) continue;
    clicksByTarget.set(t, (clicksByTarget.get(t) || 0) + 1);
  }
  const topClickTargets = [...clicksByTarget.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 15).map(([k,v])=>({k, v}));

  return {
    totalBeacons: all.length,
    totalPageviews: pageviews.length,
    totalClicks: clicks.length,
    pages,
    topClickPaths,
    topClickTargets,
  };
}

// ─── server
http.createServer(async (req, res) => {
  try {
    const url = req.url || '/';
    if (url === '/data' || url.startsWith('/data?')) {
      const s = await buildStats();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(s));
      return;
    }
    // Beacon ingest
    if (req.method === 'POST' && (url === '/beacon' || url.startsWith('/beacon?'))) {
      const chunks = [];
      for await (const c of req) { chunks.push(c); if (chunks.reduce((a,b)=>a+b.length,0) > 4096) break; }
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        const body = JSON.parse(raw);
        if (body && typeof body === 'object') {
          body.ts = Date.now();
          const xff = req.headers['x-forwarded-for'];
          body.ip = (typeof xff === 'string' ? xff.split(',')[0].trim() : req.socket.remoteAddress) || '';
          await appendBeacon(body);
        }
      } catch {}
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
      res.end();
      return;
    }
    if (req.method === 'OPTIONS' && url.startsWith('/beacon')) {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
      res.end();
      return;
    }
    if (url === '/beacon/stats' || url.startsWith('/beacon/stats?')) {
      const st = await buildBeaconStats();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(st));
      return;
    }
    if (url === '/' || url.startsWith('/?')) {
      const s = await buildStats();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(s.error ? `<h1>Error</h1><pre>${JSON.stringify(s, null, 2)}</pre>` : htmlDashboard(s));
      return;
    }
    res.writeHead(404); res.end('not found');
  } catch (e) {
    res.writeHead(500); res.end(String(e));
  }
}).listen(PORT, '127.0.0.1', () => console.log(`[stats] :${PORT} · log=${LOG}`));
