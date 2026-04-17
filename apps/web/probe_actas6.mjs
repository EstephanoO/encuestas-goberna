import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' })).newPage();
await p.goto('https://resultadoelectoral.onpe.gob.pe/main/resumen', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(6000);
const H = { 'Content-Type':'application/json','Sec-Fetch-Site':'same-origin','Sec-Fetch-Mode':'cors','Sec-Fetch-Dest':'empty','Referer':'https://resultadoelectoral.onpe.gob.pe/main/resumen' };
const r = await p.request.get('https://resultadoelectoral.onpe.gob.pe/presentacion-backend/proceso/2/elecciones', { headers: H });
const t = await r.text();
if (t.startsWith('<')) { console.log('HTML'); } else {
  const j = JSON.parse(t);
  console.log('Items menu:');
  j.data.forEach(i => console.log(`  id=${i.id} "${i.nombre}" url="${i.url}" idEleccion=${i.idEleccion}`));
}
await b.close();
