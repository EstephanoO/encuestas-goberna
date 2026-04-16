import { colorOfPartido, nombreCorto } from './senadoSource';

export { colorOfPartido, nombreCorto };

export interface CandidatoAndino {
  nombre: string;
  dni: string;
  lista: number;
  votosPreferenciales: number;
  electo?: boolean;
}

export interface PartidoAndino {
  codigo: string;
  nombre: string;
  votos: number;
  pct: number;
  escanos: number;
  candidatos: CandidatoAndino[];
}

export interface AndinoData {
  _scrapedAt: string;
  pctActas: number;
  actasRevisadas: number;
  actasTotal: number;
  votosEmitidos: number;
  totalVotosValidos: number;
  fechaActualizacion: string;
  escanosTotales: number;
  partidos: PartidoAndino[];
  escanos: Record<string, number>;
}

export async function loadAndino(): Promise<AndinoData | null> {
  try {
    const r = await fetch(`/api/andino?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()) as AndinoData;
  } catch {
    return null;
  }
}
