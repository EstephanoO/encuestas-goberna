// Vercel serverless function — proxy al archivo actas-candidatos.json del VPS.
// Evita bloqueo mixed-content (Vercel HTTPS vs VPS HTTP).
import type { VercelRequest, VercelResponse } from '@vercel/node';

const VPS = 'http://161.132.39.165:8088/actas-candidatos.json';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const r = await fetch(VPS, { cache: 'no-store' });
    const body = await r.text();
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'public, s-maxage=5, stale-while-revalidate=30');
    res.status(r.status).send(body);
  } catch (e: any) {
    res.status(502).json({ error: 'upstream', message: String(e?.message || e) });
  }
}
