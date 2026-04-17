export interface CandidatoSenado {
  nombre: string;
  dni: string;
  lista: number;
  votosPreferenciales: number;
  electo?: boolean;
}

export interface PartidoVotos {
  codigo: string;
  nombre: string;
  votos: number;
  pct: number;
  candidatos?: number | CandidatoSenado[]; // nacional: array; regional: number
  candidatosList?: CandidatoSenado[];      // regional detallado (si existe)
}

export interface SenadoNacional {
  pctActas: number;
  actasRevisadas: number;
  actasTotal: number;
  votosEmitidos: number;
  totalVotosValidos: number;
  fechaActualizacion: string;
  escanosTotales: number;
  valla: number;
  partidos: PartidoVotos[];
  escanos: Record<string, number>;
}

export interface DistritoRegional {
  codigo: number;
  nombre: string;
  pctActas: number;
  escanos: number;
  totalVotosValidos: number;
  partidos: PartidoVotos[];
  asignacion: Record<string, number>;
  ganador: string | null;
}

export interface SenadoData {
  _scrapedAt: string;
  nacional: SenadoNacional;
  regional: {
    distritos: DistritoRegional[];
    escanosTotales: number;
    resumenPartidos: { codigo: string; nombre: string; escanos: number }[];
  };
}

export async function loadSenado(): Promise<SenadoData | null> {
  const url = `/api/senadores?t=${Date.now()}`;
  try {
    const r = await fetch(url, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
    if (!r.ok) return null;
    return (await r.json()) as SenadoData;
  } catch {
    return null;
  }
}

// Colores por partido — ajustados a la identidad visual real de cada partido
// (según sus logos y campañas oficiales). Fallback a gris.
export const PARTY_COLORS: Record<string, string> = {
  '1':  '#1565C0',  // ALIANZA PARA EL PROGRESO (APP) · azul fuerte
  '2':  '#6A1B9A',  // AHORA NACIÓN          · púrpura intenso
  '3':  '#4A148C',  // ALIANZA ELECTORAL VENCEREMOS · violeta
  '5':  '#2E7D32',  // FE EN EL PERÚ         · verde
  '6':  '#1B5E20',  // FRENTE POPULAR AGRÍCOLA · verde oscuro
  '7':  '#7B1FA2',  // PARTIDO MORADO        · morado
  '8':  '#EF6C00',  // FUERZA POPULAR        · naranja (marca Keiko)
  '9':  '#0D47A1',  // FUERZA Y LIBERTAD     · azul marino
  '10': '#C62828',  // JUNTOS POR EL PERÚ    · rojo carmesí
  '11': '#F9A825',  // LIBERTAD POPULAR      · amarillo
  '12': '#B71C1C',  // PARTIDO APRISTA PERUANO · rojo oscuro
  '14': '#33691E',  // PARTIDO CÍVICO OBRAS  · verde oliva (antes dorado, confundía con FP)
  '15': '#D32F2F',  // PTE - PERÚ            · rojo
  '16': '#FF8F00',  // PARTIDO DEL BUEN GOBIERNO · ámbar
  '17': '#0277BD',  // PERÚ PRIMERO          · azul
  '18': '#388E3C',  // PARTIDO DEMÓCRATA VERDE · verde
  '19': '#FBC02D',  // PARTIDO DEMOCRÁTICO FEDERAL · amarillo
  '20': '#AD1457',  // SOMOS PERÚ            · magenta fuerte
  '21': '#6A1B9A',  // FRENTE DE LA ESPERANZA · violeta
  '22': '#7B1FA2',  // PARTIDO MORADO        · morado
  '23': '#00838F',  // PAÍS PARA TODOS       · teal (antes naranja, confundía con FP)
  '24': '#4A148C',  // PARTIDO PATRIÓTICO    · violeta
  '25': '#283593',  // COOPERACIÓN POPULAR   · azul índigo
  '26': '#01579B',  // INTEGRIDAD DEMOCRÁTICA · azul
  '27': '#558B2F',  // PARTIDO DEMÓCRATA UNIDO · verde lima
  '28': '#E53935',  // PERÚ ACCIÓN           · rojo
  '29': '#00695C',  // PROGRESEMOS           · teal oscuro
  '30': '#880E4F',  // PRIN                  · guinda
  '31': '#37474F',  // PARTIDO SICREO        · gris azulado
  '32': '#F57F17',  // PODEMOS PERÚ          · amarillo-naranja
  '33': '#2E7D32',  // PRIMERO LA GENTE      · verde
  '34': '#880E4F',  // UNIDAD NACIONAL       · guinda
  '35': '#0097A7',  // RENOVACIÓN POPULAR    · cian (marca RLA)
  '36': '#1976D2',  // SALVEMOS AL PERÚ      · azul
  '37': '#C2185B',  // UN CAMINO DIFERENTE   · rosa fuerte
  '38': '#455A64',  // fallback
};

/** Normaliza códigos padded "00000035" → "35" para hacer match con PARTY_COLORS. */
function normCod(codigo: string | number | null | undefined): string {
  if (codigo == null || codigo === '') return '';
  const n = Number(codigo);
  return Number.isFinite(n) ? String(n) : String(codigo);
}

export function colorOfPartido(codigo: string | number): string {
  const k = normCod(codigo);
  return PARTY_COLORS[k] || '#6b7280';
}

// Nombre corto para tarjetas
const SHORT_NAMES: Record<string, string> = {
  'FUERZA POPULAR': 'Fuerza Popular',
  'RENOVACIÓN POPULAR': 'Renovación Popular',
  'PARTIDO DEL BUEN GOBIERNO': 'Buen Gobierno',
  'JUNTOS POR EL PERÚ': 'Juntos por el Perú',
  'AHORA NACIÓN - AN': 'Ahora Nación',
  'PARTIDO CÍVICO OBRAS': 'Cívico Obras',
  'PARTIDO PAÍS PARA TODOS': 'País para Todos',
  'PRIMERO LA GENTE – COMUNIDAD, ECOLOGÍA, LIBERTAD Y PROGRESO': 'Primero la Gente',
  'ALIANZA PARA EL PROGRESO': 'APP',
  'PARTIDO POLÍTICO PERÚ ACCIÓN': 'Perú Acción',
  'PARTIDO POLÍTICO INTEGRIDAD DEMOCRÁTICA': 'Integridad',
  'PARTIDO POLÍTICO PRIN': 'PRIN',
  'PARTIDO SICREO': 'SICREO',
};
export function nombreCorto(nombre: string): string {
  return SHORT_NAMES[nombre] || nombre.split(' ').slice(0, 3).join(' ');
}
