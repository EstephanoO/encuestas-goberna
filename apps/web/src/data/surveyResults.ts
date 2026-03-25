/**
 * Hardcoded survey results per topic, department, and province.
 * Source: CSV reference at /data/encuestas-san-martin.csv (not served).
 * Photo URLs scraped from JNE API (mpesije.jne.gob.pe).
 */

export interface ProvinceResult {
  province: string; // matches NOMBPROV in peru-provincias.geojson
  label: string;
  partyName: string;
  partyColor: string;
  percentage: number;
  photoUrl?: string;
  center: [number, number]; // [lng, lat] centroid
}

export interface SurveyTopic {
  id: string;
  label: string;
  showPhoto: boolean;
}

export const SURVEY_TOPICS: SurveyTopic[] = [
  { id: 'presidentes', label: 'Presidencial', showPhoto: true },
  { id: 'diputados', label: 'Diputados', showPhoto: true },
  { id: 'senadores', label: 'Senadores', showPhoto: true },
  { id: 'problemas', label: 'Problemas', showPhoto: false },
  { id: 'redes-sociales', label: 'Redes sociales', showPhoto: false },
];

// ── Photo URLs from JNE ─────────────────────────────────────────────
const IMG = 'https://mpesije.jne.gob.pe/apidocs';

const PHOTOS = {
  // Presidentes (national)
  lopezAliaga: `${IMG}/b2e00ae2-1e50-4ad3-a103-71fc7e4e8255.jpg`,
  keiko: `${IMG}/251cd1c0-acc7-4338-bd8a-439ccb9238d0.jpeg`,
  acuna: `${IMG}/d6fe3cac-7061-474b-8551-0aa686a54bad.jpg`,
  alvarez: `${IMG}/2bd18177-d665-413d-9694-747d729d3e39.jpg`,
  lopezChau: `${IMG}/ddfa74eb-cae3-401c-a34c-35543ae83c57.jpg`,
  // Diputados San Martín
  cabrejos: `${IMG}/8c4b30ae-6f55-4d5a-a69e-360cd9f0d6e2.jpg`,
  trigozo: `${IMG}/aa27b48f-f32e-40ec-9c57-2c2ade7d9d7a.jpg`,
  puelles: `${IMG}/fb2e39dd-a6f0-4390-a981-bc1294775c9c.jpg`,
  alegria: `${IMG}/0210df51-6f47-4b87-816a-bd7246ac72b9.jpg`,
  // Senadores San Martín
  noriega: `${IMG}/84f8ce01-b3ad-4d93-bbe2-79314b572334.jpg`,
  cordova: `${IMG}/c4a31b9c-b809-435c-aa79-ac18753cd02b.jpg`,
  rTrigoso: `${IMG}/3fb0b612-b46d-4868-a977-8a47d7e7643d.jpg`,
  // Diputados Áncash
  barrenechea: `${IMG}/b16644e7-ba5f-4e3e-89b0-1f3d75df18aa.jpg`,
  melgarejo: `${IMG}/d4a77d94-c6e7-4d5f-be98-9fc55d3a421b.jpg`,
  veliz: `${IMG}/fd90a968-5582-4aff-b5ca-3790b643697e.jpg`,
  gamarra: `${IMG}/799ae78c-4935-458a-aa5c-550ceb4dadf4.jpg`,
  toro: `${IMG}/29ea7092-b0ce-4920-a70f-4b049c3b4c8f.jpg`,
  // Senadores Áncash
  gibovich: `${IMG}/a9d1aeb3-28d0-4f86-9683-76ca93dffdfa.jpg`,
  tafur: `${IMG}/fe520269-cb10-4a90-847e-12ac12414e49.jpg`,
  guevara: `${IMG}/48161fb4-acb1-48e0-a7e8-ac675476dec0.jpg`,
  soto: `${IMG}/28c99b47-a09e-4cb2-a1bf-84994e926dee.jpg`,
  cSanchez: `${IMG}/c340ec90-ae8a-4a4f-af84-bd34671e2138.jpg`,
};

// ── Map-friendly colors per candidate/issue ─────────────────────────
const COLORS = {
  // Partidos (colores oficiales)
  renovacionPopular: '#003B8E',
  fuerzaPopular: '#FF6B00',
  alianzaProgreso: '#0066CC',
  paisParaTodos: '#6A1B9A',
  ahoraNacion: '#E65100',
  avanzaPais: '#D4380D',
  // Diputados San Martín
  cabrejos: '#E63946',
  trigozo: '#457B9D',
  puelles: '#2A9D8F',
  alegria: '#E9C46A',
  // Diputados Áncash
  barrenechea: '#C62828',
  melgarejo: '#2E7D32',
  veliz: '#1565C0',
  gamarra: '#EF6C00',
  toro: '#6A1B9A',
  // Senadores San Martín
  noriega: '#6A0DAD',
  cordova: '#D4380D',
  rTrigoso: '#0E7C7B',
  // Senadores Áncash
  gibovich: '#1B5E20',
  tafur: '#FF6B00',
  guevara: '#0D47A1',
  soto: '#6A1B9A',
  cSanchez: '#0066CC',
  // Ranking presidencial departamental
  viciado: '#6B7280',
  otros: '#16A34A',
  // Problemas
  inseguridad: '#DC2626',
  corrupcion: '#7C3AED',
  carreteras: '#D97706',
  // Medios de comunicacion
  redesSociales: '#2563EB',
  television: '#8B5CF6',
  radio: '#059669',
};

// ── Department-level rankings (ResultadosCargo cards) ───────────────
export interface CandidateRanking {
  name: string;
  party: string;
  color: string;
  percentage: number;
  photoUrl?: string;
}

export const DEPARTMENT_RANKINGS: Record<
  string,
  Record<string, CandidateRanking[]>
> = {
  presidentes: {
    'san-martin': [
      { name: 'Viciado / Blanco / Nulo', party: '', color: COLORS.viciado, percentage: 26 },
      { name: 'Rafael López Aliaga', party: 'Renovación Popular', color: COLORS.renovacionPopular, percentage: 18, photoUrl: PHOTOS.lopezAliaga },
      { name: 'Keiko Fujimori', party: 'Fuerza Popular', color: COLORS.fuerzaPopular, percentage: 15, photoUrl: PHOTOS.keiko },
      { name: 'César Acuña', party: 'Alianza Para el Progreso', color: COLORS.alianzaProgreso, percentage: 13, photoUrl: PHOTOS.acuna },
      { name: 'Otros', party: '', color: COLORS.otros, percentage: 11 },
      { name: 'Carlos Álvarez', party: 'País para Todos', color: COLORS.paisParaTodos, percentage: 10, photoUrl: PHOTOS.alvarez },
      { name: 'Alfonso López Chau', party: 'Ahora Nación', color: COLORS.ahoraNacion, percentage: 7, photoUrl: PHOTOS.lopezChau },
    ],
    ancash: [
      { name: 'Viciado / Blanco / Nulo', party: '', color: COLORS.viciado, percentage: 27 },
      { name: 'Rafael López Aliaga', party: 'Renovación Popular', color: COLORS.renovacionPopular, percentage: 20, photoUrl: PHOTOS.lopezAliaga },
      { name: 'Keiko Fujimori', party: 'Fuerza Popular', color: COLORS.fuerzaPopular, percentage: 14, photoUrl: PHOTOS.keiko },
      { name: 'César Acuña', party: 'Alianza Para el Progreso', color: COLORS.alianzaProgreso, percentage: 12, photoUrl: PHOTOS.acuna },
      { name: 'Carlos Álvarez', party: 'País para Todos', color: COLORS.paisParaTodos, percentage: 11, photoUrl: PHOTOS.alvarez },
      { name: 'Otros', party: '', color: COLORS.otros, percentage: 11 },
      { name: 'Alfonso López Chau', party: 'Ahora Nación', color: COLORS.ahoraNacion, percentage: 5, photoUrl: PHOTOS.lopezChau },
    ],
  },
  diputados: {
    'san-martin': [
      { name: 'Erik Cabrejos', party: 'Avanza País', color: COLORS.avanzaPais, percentage: 18, photoUrl: PHOTOS.cabrejos },
      { name: 'Cristian Puelles', party: 'Renovación Popular', color: COLORS.renovacionPopular, percentage: 17, photoUrl: PHOTOS.puelles },
      { name: 'Cheryl Trigozo', party: 'Renovación Popular', color: COLORS.renovacionPopular, percentage: 15, photoUrl: PHOTOS.trigozo },
      { name: 'Arturo Alegría', party: 'Fuerza Popular', color: COLORS.fuerzaPopular, percentage: 12, photoUrl: PHOTOS.alegria },
    ],
    ancash: [
      { name: 'Zulema Barrenechea', party: 'Alianza Para el Progreso', color: COLORS.alianzaProgreso, percentage: 8, photoUrl: PHOTOS.barrenechea },
      { name: 'Mary Melgarejo', party: 'Fuerza Popular', color: COLORS.fuerzaPopular, percentage: 6, photoUrl: PHOTOS.melgarejo },
      { name: 'Jesús Veliz', party: 'Renovación Popular', color: COLORS.renovacionPopular, percentage: 6, photoUrl: PHOTOS.veliz },
      { name: 'María Gamarra', party: 'Fuerza Popular', color: COLORS.fuerzaPopular, percentage: 6, photoUrl: PHOTOS.gamarra },
      { name: 'Pamela Toro', party: 'Ahora Nación', color: COLORS.ahoraNacion, percentage: 4, photoUrl: PHOTOS.toro },
    ],
  },
  senadores: {
    'san-martin': [
      { name: 'Víctor Noriega', party: 'Fuerza Popular', color: COLORS.fuerzaPopular, percentage: 19, photoUrl: PHOTOS.noriega },
      { name: 'Luis Córdova', party: 'Avanza País', color: COLORS.avanzaPais, percentage: 17, photoUrl: PHOTOS.cordova },
      { name: 'Rubén Trigoso', party: 'Renovación Popular', color: COLORS.renovacionPopular, percentage: 14, photoUrl: PHOTOS.rTrigoso },
    ],
    ancash: [
      { name: 'Oto Gibovich', party: 'Renovación Popular', color: COLORS.renovacionPopular, percentage: 16, photoUrl: PHOTOS.gibovich },
      { name: 'Lenin Tafur', party: 'Fuerza Popular', color: COLORS.fuerzaPopular, percentage: 11, photoUrl: PHOTOS.tafur },
      { name: 'Astencio Guevara', party: 'País para Todos', color: COLORS.paisParaTodos, percentage: 10, photoUrl: PHOTOS.guevara },
      { name: 'Jhonny Soto', party: 'Avanza País', color: COLORS.avanzaPais, percentage: 9, photoUrl: PHOTOS.soto },
      { name: 'César A. Sánchez', party: 'Alianza Para el Progreso', color: COLORS.alianzaProgreso, percentage: 7, photoUrl: PHOTOS.cSanchez },
    ],
  },
};

// ── Province-level results (map choropleth + markers) ───────────────
export const PROVINCE_RESULTS: Record<
  string,
  Record<string, ProvinceResult[]>
> = {
  presidentes: {
    'san-martin': [
      { province: 'SAN MARTIN', label: 'Rafael López Aliaga', partyName: 'Renovación Popular', partyColor: COLORS.renovacionPopular, percentage: 21, photoUrl: PHOTOS.lopezAliaga, center: [-76.37, -6.68] },
      { province: 'MOYOBAMBA', label: 'Rafael López Aliaga', partyName: 'Renovación Popular', partyColor: COLORS.renovacionPopular, percentage: 20, photoUrl: PHOTOS.lopezAliaga, center: [-77.2063, -5.8648] },
      { province: 'RIOJA', label: 'Keiko Fujimori', partyName: 'Fuerza Popular', partyColor: COLORS.fuerzaPopular, percentage: 17, photoUrl: PHOTOS.keiko, center: [-77.4582, -5.8682] },
      { province: 'LAMAS', label: 'Keiko Fujimori', partyName: 'Fuerza Popular', partyColor: COLORS.fuerzaPopular, percentage: 17, photoUrl: PHOTOS.keiko, center: [-76.4068, -6.3176] },
      { province: 'HUALLAGA', label: 'Keiko Fujimori', partyName: 'Fuerza Popular', partyColor: COLORS.fuerzaPopular, percentage: 18, photoUrl: PHOTOS.keiko, center: [-76.9398, -6.7396] },
      { province: 'PICOTA', label: 'Keiko Fujimori', partyName: 'Fuerza Popular', partyColor: COLORS.fuerzaPopular, percentage: 18, photoUrl: PHOTOS.keiko, center: [-76.258, -6.8956] },
      { province: 'EL DORADO', label: 'Keiko Fujimori', partyName: 'Fuerza Popular', partyColor: COLORS.fuerzaPopular, percentage: 19, photoUrl: PHOTOS.keiko, center: [-76.729, -6.5604] },
      { province: 'BELLAVISTA', label: 'César Acuña', partyName: 'Alianza Para el Progreso', partyColor: COLORS.alianzaProgreso, percentage: 21, photoUrl: PHOTOS.acuna, center: [-76.3206, -7.6053] },
      { province: 'MARISCAL CACERES', label: 'César Acuña', partyName: 'Alianza Para el Progreso', partyColor: COLORS.alianzaProgreso, percentage: 22, photoUrl: PHOTOS.acuna, center: [-77.1778, -7.2813] },
      { province: 'TOCACHE', label: 'César Acuña', partyName: 'Alianza Para el Progreso', partyColor: COLORS.alianzaProgreso, percentage: 23, photoUrl: PHOTOS.acuna, center: [-76.6328, -8.231] },
    ],
    ancash: [
      { province: 'SANTA', label: 'Rafael López Aliaga', partyName: 'Renovación Popular', partyColor: COLORS.renovacionPopular, percentage: 21, photoUrl: PHOTOS.lopezAliaga, center: [-78.29, -9.02] },
      { province: 'CASMA', label: 'Rafael López Aliaga', partyName: 'Renovación Popular', partyColor: COLORS.renovacionPopular, percentage: 19, photoUrl: PHOTOS.lopezAliaga, center: [-78.16, -9.48] },
      { province: 'HUARMEY', label: 'Keiko Fujimori', partyName: 'Fuerza Popular', partyColor: COLORS.fuerzaPopular, percentage: 16, photoUrl: PHOTOS.keiko, center: [-77.88, -10.12] },
      { province: 'HUARAZ', label: 'Keiko Fujimori', partyName: 'Fuerza Popular', partyColor: COLORS.fuerzaPopular, percentage: 19, photoUrl: PHOTOS.keiko, center: [-77.69, -9.57] },
      { province: 'HUARI', label: 'César Acuña', partyName: 'Alianza Para el Progreso', partyColor: COLORS.alianzaProgreso, percentage: 19, photoUrl: PHOTOS.acuna, center: [-77.04, -9.41] },
      { province: 'YUNGAY', label: 'Keiko Fujimori', partyName: 'Fuerza Popular', partyColor: COLORS.fuerzaPopular, percentage: 19, photoUrl: PHOTOS.keiko, center: [-77.71, -9.18] },
      { province: 'CARHUAZ', label: 'César Acuña', partyName: 'Alianza Para el Progreso', partyColor: COLORS.alianzaProgreso, percentage: 19, photoUrl: PHOTOS.acuna, center: [-77.56, -9.28] },
      { province: 'BOLOGNESI', label: 'Keiko Fujimori', partyName: 'Fuerza Popular', partyColor: COLORS.fuerzaPopular, percentage: 19, photoUrl: PHOTOS.keiko, center: [-77.02, -9.98] },
      { province: 'PALLASCA', label: 'César Acuña', partyName: 'Alianza Para el Progreso', partyColor: COLORS.alianzaProgreso, percentage: 19, photoUrl: PHOTOS.acuna, center: [-77.91, -8.35] },
      { province: 'CORONGO', label: 'Keiko Fujimori', partyName: 'Fuerza Popular', partyColor: COLORS.fuerzaPopular, percentage: 19, photoUrl: PHOTOS.keiko, center: [-77.89, -8.58] },
      { province: 'HUAYLAS', label: 'Rafael López Aliaga', partyName: 'Renovación Popular', partyColor: COLORS.renovacionPopular, percentage: 14, photoUrl: PHOTOS.lopezAliaga, center: [-77.85, -8.94] },
      { province: 'POMABAMBA', label: 'César Acuña', partyName: 'Alianza Para el Progreso', partyColor: COLORS.alianzaProgreso, percentage: 19, photoUrl: PHOTOS.acuna, center: [-77.44, -8.74] },
      { province: 'SIHUAS', label: 'Keiko Fujimori', partyName: 'Fuerza Popular', partyColor: COLORS.fuerzaPopular, percentage: 19, photoUrl: PHOTOS.keiko, center: [-77.58, -8.5] },
      { province: 'ANTONIO RAYMONDI', label: 'César Acuña', partyName: 'Alianza Para el Progreso', partyColor: COLORS.alianzaProgreso, percentage: 19, photoUrl: PHOTOS.acuna, center: [-77.07, -9.13] },
      { province: 'CARLOS FERMIN FITZCARRALD', label: 'Rafael López Aliaga', partyName: 'Renovación Popular', partyColor: COLORS.renovacionPopular, percentage: 14, photoUrl: PHOTOS.lopezAliaga, center: [-77.23, -9.04] },
      { province: 'MARISCAL LUZURIAGA', label: 'Keiko Fujimori', partyName: 'Fuerza Popular', partyColor: COLORS.fuerzaPopular, percentage: 19, photoUrl: PHOTOS.keiko, center: [-77.37, -8.9] },
      { province: 'AIJA', label: 'César Acuña', partyName: 'Alianza Para el Progreso', partyColor: COLORS.alianzaProgreso, percentage: 19, photoUrl: PHOTOS.acuna, center: [-77.72, -9.8] },
      { province: 'RECUAY', label: 'Keiko Fujimori', partyName: 'Fuerza Popular', partyColor: COLORS.fuerzaPopular, percentage: 19, photoUrl: PHOTOS.keiko, center: [-77.44, -9.97] },
      { province: 'OCROS', label: 'César Acuña', partyName: 'Alianza Para el Progreso', partyColor: COLORS.alianzaProgreso, percentage: 19, photoUrl: PHOTOS.acuna, center: [-77.42, -10.5] },
      { province: 'ASUNCION', label: 'Rafael López Aliaga', partyName: 'Renovación Popular', partyColor: COLORS.renovacionPopular, percentage: 14, photoUrl: PHOTOS.lopezAliaga, center: [-77.39, -9.18] },
    ],
  },
  diputados: {
    'san-martin': [
      { province: 'SAN MARTIN', label: 'Erik Cabrejos', partyName: 'Escenario Repartido', partyColor: COLORS.cabrejos, percentage: 18, photoUrl: PHOTOS.cabrejos, center: [-76.37, -6.68] },
      { province: 'MOYOBAMBA', label: 'Erik Cabrejos', partyName: 'Fuerte de Cabrejos (Zona Norte)', partyColor: COLORS.cabrejos, percentage: 21, photoUrl: PHOTOS.cabrejos, center: [-77.2063, -5.8648] },
      { province: 'RIOJA', label: 'Erik Cabrejos', partyName: 'Fuerte de Cabrejos (Zona Norte)', partyColor: COLORS.cabrejos, percentage: 20, photoUrl: PHOTOS.cabrejos, center: [-77.4582, -5.8682] },
      { province: 'LAMAS', label: 'Cheryl Trigozo', partyName: 'Bastión de Cheryl', partyColor: COLORS.trigozo, percentage: 20, photoUrl: PHOTOS.trigozo, center: [-76.4068, -6.3176] },
      { province: 'PICOTA', label: 'Cheryl Trigozo', partyName: 'Bastión de Cheryl', partyColor: COLORS.trigozo, percentage: 19, photoUrl: PHOTOS.trigozo, center: [-76.258, -6.8956] },
      { province: 'BELLAVISTA', label: 'Cristian Puelles', partyName: 'Fuerte de Puelles (Zona Sur)', partyColor: COLORS.puelles, percentage: 19, photoUrl: PHOTOS.puelles, center: [-76.3206, -7.6053] },
      { province: 'TOCACHE', label: 'Cristian Puelles', partyName: 'Fuerte de Puelles (Zona Sur)', partyColor: COLORS.puelles, percentage: 22, photoUrl: PHOTOS.puelles, center: [-76.6328, -8.231] },
      { province: 'HUALLAGA', label: 'Cristian Puelles', partyName: 'Fuerte de Puelles (Zona Sur)', partyColor: COLORS.puelles, percentage: 18, photoUrl: PHOTOS.puelles, center: [-76.9398, -6.7396] },
      { province: 'EL DORADO', label: 'Arturo Alegría', partyName: 'Escenario Repartido', partyColor: COLORS.alegria, percentage: 17, photoUrl: PHOTOS.alegria, center: [-76.729, -6.5604] },
      { province: 'MARISCAL CACERES', label: 'Cristian Puelles', partyName: 'Fuerte de Puelles (Zona Sur)', partyColor: COLORS.puelles, percentage: 21, photoUrl: PHOTOS.puelles, center: [-77.1778, -7.2813] },
    ],
    ancash: [
      { province: 'SANTA', label: 'Jesús Veliz', partyName: 'Renovación Popular', partyColor: COLORS.veliz, percentage: 16, photoUrl: PHOTOS.veliz, center: [-78.29, -9.02] },
      { province: 'CASMA', label: 'Zulema Barrenechea', partyName: 'Alianza Para el Progreso', partyColor: COLORS.barrenechea, percentage: 21, photoUrl: PHOTOS.barrenechea, center: [-78.16, -9.48] },
      { province: 'HUARMEY', label: 'Mary Melgarejo', partyName: 'Fuerza Popular', partyColor: COLORS.melgarejo, percentage: 22, photoUrl: PHOTOS.melgarejo, center: [-77.88, -10.12] },
      { province: 'HUARAZ', label: 'Zulema Barrenechea', partyName: 'Alianza Para el Progreso', partyColor: COLORS.barrenechea, percentage: 9, photoUrl: PHOTOS.barrenechea, center: [-77.69, -9.57] },
      { province: 'HUARI', label: 'Mary Melgarejo', partyName: 'Fuerza Popular', partyColor: COLORS.melgarejo, percentage: 8, photoUrl: PHOTOS.melgarejo, center: [-77.04, -9.41] },
      { province: 'YUNGAY', label: 'Zulema Barrenechea', partyName: 'Alianza Para el Progreso', partyColor: COLORS.barrenechea, percentage: 9, photoUrl: PHOTOS.barrenechea, center: [-77.71, -9.18] },
      { province: 'CARHUAZ', label: 'Mary Melgarejo', partyName: 'Fuerza Popular', partyColor: COLORS.melgarejo, percentage: 8, photoUrl: PHOTOS.melgarejo, center: [-77.56, -9.28] },
      { province: 'BOLOGNESI', label: 'Zulema Barrenechea', partyName: 'Alianza Para el Progreso', partyColor: COLORS.barrenechea, percentage: 9, photoUrl: PHOTOS.barrenechea, center: [-77.02, -9.98] },
      { province: 'PALLASCA', label: 'María Gamarra', partyName: 'Fuerza Popular', partyColor: COLORS.gamarra, percentage: 8, photoUrl: PHOTOS.gamarra, center: [-77.91, -8.35] },
      { province: 'CORONGO', label: 'Zulema Barrenechea', partyName: 'Alianza Para el Progreso', partyColor: COLORS.barrenechea, percentage: 9, photoUrl: PHOTOS.barrenechea, center: [-77.89, -8.58] },
      { province: 'HUAYLAS', label: 'Mary Melgarejo', partyName: 'Fuerza Popular', partyColor: COLORS.melgarejo, percentage: 8, photoUrl: PHOTOS.melgarejo, center: [-77.85, -8.94] },
      { province: 'POMABAMBA', label: 'María Gamarra', partyName: 'Fuerza Popular', partyColor: COLORS.gamarra, percentage: 8, photoUrl: PHOTOS.gamarra, center: [-77.44, -8.74] },
      { province: 'SIHUAS', label: 'Zulema Barrenechea', partyName: 'Alianza Para el Progreso', partyColor: COLORS.barrenechea, percentage: 9, photoUrl: PHOTOS.barrenechea, center: [-77.58, -8.5] },
      { province: 'ANTONIO RAYMONDI', label: 'Pamela Toro', partyName: 'Ahora Nación', partyColor: COLORS.toro, percentage: 7, photoUrl: PHOTOS.toro, center: [-77.07, -9.13] },
      { province: 'CARLOS FERMIN FITZCARRALD', label: 'Mary Melgarejo', partyName: 'Fuerza Popular', partyColor: COLORS.melgarejo, percentage: 8, photoUrl: PHOTOS.melgarejo, center: [-77.23, -9.04] },
      { province: 'MARISCAL LUZURIAGA', label: 'María Gamarra', partyName: 'Fuerza Popular', partyColor: COLORS.gamarra, percentage: 8, photoUrl: PHOTOS.gamarra, center: [-77.37, -8.9] },
      { province: 'AIJA', label: 'Zulema Barrenechea', partyName: 'Alianza Para el Progreso', partyColor: COLORS.barrenechea, percentage: 9, photoUrl: PHOTOS.barrenechea, center: [-77.72, -9.8] },
      { province: 'RECUAY', label: 'Pamela Toro', partyName: 'Ahora Nación', partyColor: COLORS.toro, percentage: 7, photoUrl: PHOTOS.toro, center: [-77.44, -9.97] },
      { province: 'OCROS', label: 'Mary Melgarejo', partyName: 'Fuerza Popular', partyColor: COLORS.melgarejo, percentage: 8, photoUrl: PHOTOS.melgarejo, center: [-77.42, -10.5] },
      { province: 'ASUNCION', label: 'Jesús Veliz', partyName: 'Renovación Popular', partyColor: COLORS.veliz, percentage: 7, photoUrl: PHOTOS.veliz, center: [-77.39, -9.18] },
    ],
  },
  senadores: {
    'san-martin': [
      { province: 'SAN MARTIN', label: 'Víctor Noriega', partyName: 'Fuerza Popular', partyColor: COLORS.noriega, percentage: 22, photoUrl: PHOTOS.noriega, center: [-76.37, -6.68] },
      { province: 'MOYOBAMBA', label: 'Luis Córdova', partyName: 'Avanza País', partyColor: COLORS.cordova, percentage: 19, photoUrl: PHOTOS.cordova, center: [-77.2063, -5.8648] },
      { province: 'RIOJA', label: 'Luis Córdova', partyName: 'Avanza País', partyColor: COLORS.cordova, percentage: 20, photoUrl: PHOTOS.cordova, center: [-77.4582, -5.8682] },
      { province: 'LAMAS', label: 'Víctor Noriega', partyName: 'Fuerza Popular', partyColor: COLORS.noriega, percentage: 18, photoUrl: PHOTOS.noriega, center: [-76.4068, -6.3176] },
      { province: 'PICOTA', label: 'Víctor Noriega', partyName: 'Fuerza Popular', partyColor: COLORS.noriega, percentage: 17, photoUrl: PHOTOS.noriega, center: [-76.258, -6.8956] },
      { province: 'MARISCAL CACERES', label: 'Víctor Noriega', partyName: 'Fuerza Popular', partyColor: COLORS.noriega, percentage: 17, photoUrl: PHOTOS.noriega, center: [-77.1778, -7.2813] },
      { province: 'EL DORADO', label: 'Rubén Trigoso', partyName: 'Renovación Popular', partyColor: COLORS.rTrigoso, percentage: 18, photoUrl: PHOTOS.rTrigoso, center: [-76.729, -6.5604] },
      { province: 'HUALLAGA', label: 'Rubén Trigoso', partyName: 'Renovación Popular', partyColor: COLORS.rTrigoso, percentage: 17, photoUrl: PHOTOS.rTrigoso, center: [-76.9398, -6.7396] },
      { province: 'TOCACHE', label: 'Rubén Trigoso', partyName: 'Renovación Popular', partyColor: COLORS.rTrigoso, percentage: 16, photoUrl: PHOTOS.rTrigoso, center: [-76.6328, -8.231] },
      { province: 'BELLAVISTA', label: 'Luis Córdova', partyName: 'Avanza País', partyColor: COLORS.cordova, percentage: 16, photoUrl: PHOTOS.cordova, center: [-76.3206, -7.6053] },
    ],
    ancash: [
      { province: 'SANTA', label: 'Oto Gibovich', partyName: 'Renovación Popular', partyColor: COLORS.gibovich, percentage: 21, photoUrl: PHOTOS.gibovich, center: [-78.29, -9.02] },
      { province: 'CASMA', label: 'Lenin Tafur', partyName: 'Fuerza Popular', partyColor: COLORS.tafur, percentage: 20, photoUrl: PHOTOS.tafur, center: [-78.16, -9.48] },
      { province: 'HUARMEY', label: 'Lenin Tafur', partyName: 'Fuerza Popular', partyColor: COLORS.tafur, percentage: 19, photoUrl: PHOTOS.tafur, center: [-77.88, -10.12] },
      { province: 'HUARAZ', label: 'Oto Gibovich', partyName: 'Renovación Popular', partyColor: COLORS.gibovich, percentage: 16, photoUrl: PHOTOS.gibovich, center: [-77.69, -9.57] },
      { province: 'HUARI', label: 'Oto Gibovich', partyName: 'Renovación Popular', partyColor: COLORS.gibovich, percentage: 16, photoUrl: PHOTOS.gibovich, center: [-77.04, -9.41] },
      { province: 'YUNGAY', label: 'Oto Gibovich', partyName: 'Renovación Popular', partyColor: COLORS.gibovich, percentage: 16, photoUrl: PHOTOS.gibovich, center: [-77.71, -9.18] },
      { province: 'CARHUAZ', label: 'Astencio Guevara', partyName: 'País para Todos', partyColor: COLORS.guevara, percentage: 14, photoUrl: PHOTOS.guevara, center: [-77.56, -9.28] },
      { province: 'BOLOGNESI', label: 'Oto Gibovich', partyName: 'Renovación Popular', partyColor: COLORS.gibovich, percentage: 16, photoUrl: PHOTOS.gibovich, center: [-77.02, -9.98] },
      { province: 'PALLASCA', label: 'Jhonny Soto', partyName: 'Avanza País', partyColor: COLORS.soto, percentage: 13, photoUrl: PHOTOS.soto, center: [-77.91, -8.35] },
      { province: 'CORONGO', label: 'Oto Gibovich', partyName: 'Renovación Popular', partyColor: COLORS.gibovich, percentage: 16, photoUrl: PHOTOS.gibovich, center: [-77.89, -8.58] },
      { province: 'HUAYLAS', label: 'Lenin Tafur', partyName: 'Fuerza Popular', partyColor: COLORS.tafur, percentage: 14, photoUrl: PHOTOS.tafur, center: [-77.85, -8.94] },
      { province: 'POMABAMBA', label: 'Oto Gibovich', partyName: 'Renovación Popular', partyColor: COLORS.gibovich, percentage: 16, photoUrl: PHOTOS.gibovich, center: [-77.44, -8.74] },
      { province: 'SIHUAS', label: 'Astencio Guevara', partyName: 'País para Todos', partyColor: COLORS.guevara, percentage: 14, photoUrl: PHOTOS.guevara, center: [-77.58, -8.5] },
      { province: 'ANTONIO RAYMONDI', label: 'César A. Sánchez', partyName: 'Alianza Para el Progreso', partyColor: COLORS.cSanchez, percentage: 12, photoUrl: PHOTOS.cSanchez, center: [-77.07, -9.13] },
      { province: 'CARLOS FERMIN FITZCARRALD', label: 'Oto Gibovich', partyName: 'Renovación Popular', partyColor: COLORS.gibovich, percentage: 16, photoUrl: PHOTOS.gibovich, center: [-77.23, -9.04] },
      { province: 'MARISCAL LUZURIAGA', label: 'Jhonny Soto', partyName: 'Avanza País', partyColor: COLORS.soto, percentage: 13, photoUrl: PHOTOS.soto, center: [-77.37, -8.9] },
      { province: 'AIJA', label: 'Oto Gibovich', partyName: 'Renovación Popular', partyColor: COLORS.gibovich, percentage: 16, photoUrl: PHOTOS.gibovich, center: [-77.72, -9.8] },
      { province: 'RECUAY', label: 'Astencio Guevara', partyName: 'País para Todos', partyColor: COLORS.guevara, percentage: 14, photoUrl: PHOTOS.guevara, center: [-77.44, -9.97] },
      { province: 'OCROS', label: 'César A. Sánchez', partyName: 'Alianza Para el Progreso', partyColor: COLORS.cSanchez, percentage: 12, photoUrl: PHOTOS.cSanchez, center: [-77.42, -10.5] },
      { province: 'ASUNCION', label: 'Lenin Tafur', partyName: 'Fuerza Popular', partyColor: COLORS.tafur, percentage: 14, photoUrl: PHOTOS.tafur, center: [-77.39, -9.18] },
    ],
  },
  problemas: {
    'san-martin': [
      { province: 'SAN MARTIN', label: 'Inseguridad', partyName: 'Inseguridad ciudadana / Delincuencia', partyColor: COLORS.inseguridad, percentage: 30, center: [-76.37, -6.68] },
      { province: 'MOYOBAMBA', label: 'Corrupción', partyName: 'Corrupción en el Gob. Regional/Local', partyColor: COLORS.corrupcion, percentage: 28, center: [-77.2063, -5.8648] },
      { province: 'RIOJA', label: 'Corrupción', partyName: 'Corrupción en el Gob. Regional/Local', partyColor: COLORS.corrupcion, percentage: 25, center: [-77.4582, -5.8682] },
      { province: 'LAMAS', label: 'Corrupción', partyName: 'Corrupción en el Gob. Regional/Local', partyColor: COLORS.corrupcion, percentage: 24, center: [-76.4068, -6.3176] },
      { province: 'MARISCAL CACERES', label: 'Corrupción', partyName: 'Corrupción en el Gob. Regional/Local', partyColor: COLORS.corrupcion, percentage: 23, center: [-77.1778, -7.2813] },
      { province: 'EL DORADO', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 35, center: [-76.729, -6.5604] },
      { province: 'HUALLAGA', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 34, center: [-76.9398, -6.7396] },
      { province: 'PICOTA', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 31, center: [-76.258, -6.8956] },
      { province: 'BELLAVISTA', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 30, center: [-76.3206, -7.6053] },
      { province: 'TOCACHE', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 36, center: [-76.6328, -8.231] },
    ],
    ancash: [
      { province: 'SANTA', label: 'Inseguridad', partyName: 'Inseguridad ciudadana / Delincuencia', partyColor: COLORS.inseguridad, percentage: 35, center: [-78.29, -9.02] },
      { province: 'CASMA', label: 'Inseguridad', partyName: 'Inseguridad ciudadana / Delincuencia', partyColor: COLORS.inseguridad, percentage: 30, center: [-78.16, -9.48] },
      { province: 'HUARMEY', label: 'Inseguridad', partyName: 'Inseguridad ciudadana / Delincuencia', partyColor: COLORS.inseguridad, percentage: 28, center: [-77.88, -10.12] },
      { province: 'HUARAZ', label: 'Corrupción', partyName: 'Corrupción en el Gob. Regional/Local', partyColor: COLORS.corrupcion, percentage: 27, center: [-77.69, -9.57] },
      { province: 'HUARI', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 34, center: [-77.04, -9.41] },
      { province: 'YUNGAY', label: 'Corrupción', partyName: 'Corrupción en el Gob. Regional/Local', partyColor: COLORS.corrupcion, percentage: 25, center: [-77.71, -9.18] },
      { province: 'CARHUAZ', label: 'Corrupción', partyName: 'Corrupción en el Gob. Regional/Local', partyColor: COLORS.corrupcion, percentage: 24, center: [-77.56, -9.28] },
      { province: 'BOLOGNESI', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 36, center: [-77.02, -9.98] },
      { province: 'PALLASCA', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 38, center: [-77.91, -8.35] },
      { province: 'CORONGO', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 37, center: [-77.89, -8.58] },
      { province: 'HUAYLAS', label: 'Corrupción', partyName: 'Corrupción en el Gob. Regional/Local', partyColor: COLORS.corrupcion, percentage: 26, center: [-77.85, -8.94] },
      { province: 'POMABAMBA', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 35, center: [-77.44, -8.74] },
      { province: 'SIHUAS', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 36, center: [-77.58, -8.5] },
      { province: 'ANTONIO RAYMONDI', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 38, center: [-77.07, -9.13] },
      { province: 'CARLOS FERMIN FITZCARRALD', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 35, center: [-77.23, -9.04] },
      { province: 'MARISCAL LUZURIAGA', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 37, center: [-77.37, -8.9] },
      { province: 'AIJA', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 33, center: [-77.72, -9.8] },
      { province: 'RECUAY', label: 'Corrupción', partyName: 'Corrupción en el Gob. Regional/Local', partyColor: COLORS.corrupcion, percentage: 26, center: [-77.44, -9.97] },
      { province: 'OCROS', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 36, center: [-77.42, -10.5] },
      { province: 'ASUNCION', label: 'Carreteras', partyName: 'Mal estado de carreteras / Infraestructura', partyColor: COLORS.carreteras, percentage: 34, center: [-77.39, -9.18] },
    ],
  },
  'redes-sociales': {
    'san-martin': [
      { province: 'SAN MARTIN', label: 'Redes sociales', partyName: 'Redes sociales (Facebook, TikTok, etc.)', partyColor: COLORS.redesSociales, percentage: 42, center: [-76.37, -6.68] },
      { province: 'MOYOBAMBA', label: 'Redes sociales', partyName: 'Redes sociales (Facebook, TikTok, etc.)', partyColor: COLORS.redesSociales, percentage: 36, center: [-77.2063, -5.8648] },
      { province: 'RIOJA', label: 'Redes sociales', partyName: 'Redes sociales (Facebook, TikTok, etc.)', partyColor: COLORS.redesSociales, percentage: 34, center: [-77.4582, -5.8682] },
      { province: 'MARISCAL CACERES', label: 'Television', partyName: 'Television (Senal abierta o cable)', partyColor: COLORS.television, percentage: 29, center: [-77.1778, -7.2813] },
      { province: 'LAMAS', label: 'Television', partyName: 'Television (Senal abierta o cable)', partyColor: COLORS.television, percentage: 28, center: [-76.4068, -6.3176] },
      { province: 'EL DORADO', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 33, center: [-76.729, -6.5604] },
      { province: 'BELLAVISTA', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 32, center: [-76.3206, -7.6053] },
      { province: 'TOCACHE', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 31, center: [-76.6328, -8.231] },
      { province: 'HUALLAGA', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 31, center: [-76.9398, -6.7396] },
      { province: 'PICOTA', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 30, center: [-76.258, -6.8956] },
    ],
    ancash: [
      { province: 'SANTA', label: 'Redes sociales', partyName: 'Redes sociales (Facebook, TikTok, etc.)', partyColor: COLORS.redesSociales, percentage: 45, center: [-78.29, -9.02] },
      { province: 'CASMA', label: 'Redes sociales', partyName: 'Redes sociales (Facebook, TikTok, etc.)', partyColor: COLORS.redesSociales, percentage: 40, center: [-78.16, -9.48] },
      { province: 'HUARMEY', label: 'Redes sociales', partyName: 'Redes sociales (Facebook, TikTok, etc.)', partyColor: COLORS.redesSociales, percentage: 38, center: [-77.88, -10.12] },
      { province: 'HUARAZ', label: 'Television', partyName: 'Television (Senal abierta o cable)', partyColor: COLORS.television, percentage: 32, center: [-77.69, -9.57] },
      { province: 'HUARI', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 35, center: [-77.04, -9.41] },
      { province: 'YUNGAY', label: 'Television', partyName: 'Television (Senal abierta o cable)', partyColor: COLORS.television, percentage: 30, center: [-77.71, -9.18] },
      { province: 'CARHUAZ', label: 'Television', partyName: 'Television (Senal abierta o cable)', partyColor: COLORS.television, percentage: 29, center: [-77.56, -9.28] },
      { province: 'BOLOGNESI', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 34, center: [-77.02, -9.98] },
      { province: 'PALLASCA', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 36, center: [-77.91, -8.35] },
      { province: 'CORONGO', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 37, center: [-77.89, -8.58] },
      { province: 'HUAYLAS', label: 'Television', partyName: 'Television (Senal abierta o cable)', partyColor: COLORS.television, percentage: 28, center: [-77.85, -8.94] },
      { province: 'POMABAMBA', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 38, center: [-77.44, -8.74] },
      { province: 'SIHUAS', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 36, center: [-77.58, -8.5] },
      { province: 'ANTONIO RAYMONDI', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 39, center: [-77.07, -9.13] },
      { province: 'CARLOS FERMIN FITZCARRALD', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 37, center: [-77.23, -9.04] },
      { province: 'MARISCAL LUZURIAGA', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 38, center: [-77.37, -8.9] },
      { province: 'AIJA', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 33, center: [-77.72, -9.8] },
      { province: 'RECUAY', label: 'Television', partyName: 'Television (Senal abierta o cable)', partyColor: COLORS.television, percentage: 30, center: [-77.44, -9.97] },
      { province: 'OCROS', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 35, center: [-77.42, -10.5] },
      { province: 'ASUNCION', label: 'Radio', partyName: 'Radio (Emisoras locales o nacionales)', partyColor: COLORS.radio, percentage: 34, center: [-77.39, -9.18] },
    ],
  },
};
