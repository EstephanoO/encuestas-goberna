# 📊 Sistema de Resultados por Región — Guía de Configuración

## ✅ Lo que fue creado

He creado una **arquitectura completa y reutilizable** para la página de Resultados de Encuestas por Región. Toda la estructura está lista pero **SIN APLICAR aún**.

### 📁 Archivos Creados

```
apps/web/src/
├── pages/results/
│   └── RegionResultsPage.tsx          ← Página principal (componente)
├── components/results/region/
│   ├── RegionSelector.tsx              ← Selector de regiones
│   ├── RegionHeader.tsx                ← Encabezado de región
│   ├── RegionStats.tsx                 ← Estadísticas rápidas
│   ├── RegionMapSection.tsx            ← Visualización en mapa
│   ├── RegionResultsSection.tsx        ← Accordion de cargos
│   ├── RegionCargoCard.tsx             ← Tarjeta de cargo
│   ├── RegionCandidateGrid.tsx         ← Grid de candidatos
│   ├── RegionComparisonChart.tsx       ← Gráfico comparativo
│   ├── DataUploadSection.tsx           ← Carga de datos
│   └── README.md                       ← Documentación
├── types/
│   └── regionResults.ts                ← Tipos TypeScript
└── lib/
    └── sampleRegionData.ts             ← Datos de ejemplo
```

## 🎯 Características

### Componentes Principales (9 componentes)

1. **RegionResultsPage** — Orquestador principal
   - Gestiona estado de regiones seleccionadas
   - Permite cargar datos dinámicamente
   - Renderiza la estructura completa

2. **RegionSelector** — Selector searchable
   - Grid/lista de regiones disponibles
   - Búsqueda por nombre
   - Indicador visual de selección

3. **RegionHeader** — Encabezado con metadata
   - Nombre de región
   - Descripción
   - Fuente de datos y fecha de actualización

4. **RegionStats** — KPIs rápidos
   - Total de votos
   - Candidato líder
   - Participación promedio

5. **RegionMapSection** — Visualización geográfica
   - Puntos por zona/provincia
   - Candidato ganador en cada zona
   - Porcentaje de votos

6. **RegionResultsSection** — Accordion de cargos
   - Cargo: Presidentes, Diputados, Senadores
   - Expandible/colapsable
   - Ordenamiento automático

7. **RegionCargoCard** — Ranking de cargo
   - Top candidates por cargo
   - Barras de progreso
   - Fotos de candidatos

8. **RegionCandidateGrid** — Grid visual
   - Tarjetas de candidatos
   - Foto background
   - Intención de voto

9. **DataUploadSection** — Importador de datos
   - Carga archivos JSON
   - Validación de estructura
   - Mensajes de estado

## 🔄 Flujo de Datos

```
Usuario carga JSON
       ↓
DataUploadSection valida
       ↓
RegionResultsPage.handleDataUpload
       ↓
setRegions (state)
       ↓
RegionSelector muestra opciones
       ↓
Usuario elige región
       ↓
Detalles se populan:
  - RegionHeader
  - RegionStats
  - RegionMapSection
  - RegionResultsSection
```

## 💾 Estructura de Datos Esperada

### Región Completa (JSON)

```json
{
  "id": "san-martin",
  "name": "San Martín",
  "description": "Región en la selva nororiental del Perú",
  "center": [-76.37, -6.68],
  "zoom": 7,
  "dataSource": "Instituto Goberna - Encuesta 2026",
  
  "cargoResults": [
    {
      "cargoId": "presidentes",
      "cargoLabel": "Presidencial",
      "candidates": [
        {
          "id": "p1",
          "name": "Rafael López Aliaga",
          "party": "Renovación Popular",
          "percentage": 21,
          "photoUrl": "https://...",
          "color": "#003B8E"
        }
      ]
    }
  ],
  
  "stats": {
    "totalVotes": 12500,
    "averageParticipation": 45.2,
    "leader": {
      "name": "Rafael López Aliaga",
      "percentage": 21,
      "color": "#003B8E"
    }
  },
  
  "mapPoints": [
    {
      "id": "mp1",
      "name": "Tarapoto",
      "latitude": -6.49,
      "longitude": -76.36,
      "candidateId": "p1",
      "candidateName": "Rafael López Aliaga",
      "percentage": 23,
      "color": "#003B8E"
    }
  ]
}
```

## 🚀 Próximos Pasos para Aplicar

Cuando quieras activar esto, solo necesitas:

### 1. Agregar a Router

En `/app/router/index.tsx`:

```typescript
const RegionResultsPage = lazy(() => import('@/pages/results/RegionResultsPage'));

// Dentro de Routes:
<Route path="/resultados-por-region" element={<RegionResultsPage />} />
```

### 2. Crear Datos JSON

Exporta datos en este formato desde:
- CSV de encuestas
- API del backend
- Archivo estático

### 3. Cargar Datos en la Página

Usa `DataUploadSection` en el UI para cargar:
- san-martin.json
- lima.json
- cualquier otra región

### 4. (Opcional) Integrar Mapa Real

En `RegionMapSection.tsx`, reemplazar placeholder con:
- **mapcn** (como está en `EncuestaResultadosSection`)
- API de Google Maps
- Leaflet

## 📝 Tipos TypeScript

Ubicados en `/types/regionResults.ts`:

```typescript
type RegionData = { id, name, cargoResults, stats, mapPoints, ... }
type RegionCandidate = { id, name, party, percentage, color, photoUrl }
type RegionCargoResults = { cargoId, cargoLabel, candidates }
type RegionStats = { totalVotes, averageParticipation, leader }
type RegionMapPoint = { id, name, latitude, longitude, candidateName, percentage, color }
```

## 🎨 Estilo

- **Tailwind CSS 4** — Clases modernas, responsive
- **Colores** — Pasados como hex en datos (color en RGB → gráficos)
- **Diseño** — Similar a `EncuestaResultadosSection`, pero como página completa

## ✨ Diferencias vs. EncuestaResultadosSection

| Aspecto | EncuestaResultadosSection | RegionResultsPage |
|--------|-------------------------|------------------|
| Scope | Sección en home | Página completa |
| Datos | Hardcodeados | Dinámicos/cargables |
| Regiones | Solo 1 (dropdown) | N (selector) |
| Reutilizable | No | Sí |
| Carga datos | No | Sí (JSON) |
| Componentes | 1 + helpers | 9 componentes |

## 🔍 Testing/Demo

Hay datos de ejemplo en `/lib/sampleRegionData.ts`:

```typescript
import { SAMPLE_SAN_MARTIN_DATA } from '@/lib/sampleRegionData';
```

Puedes usarlos para:
- Hacer test antes de cargar datos reales
- Ver cómo se ve la página completamente poblada
- Entender la estructura esperada

## 📦 Componentes Usados

- **React 19** — No memoización manual
- **React Router** — Lazy loaded
- **Lucide Icons** — Iconografía
- **shadcn/ui Avatar** — Para fotos de candidatos
- **Tailwind CSS 4** — Estilos

## ⚡ Performance

✅ Componentes puros (sin side effects)
✅ Props tipadas (sin spread `{...}`)
✅ Renderizado condicional eficiente
✅ No arrays grandes sin límite
✅ Lazy loading de imágenes posible

## 🚨 Notas Importantes

1. **NO HARDCODEES DATOS** — Siempre pasa como props
2. **Usa DataUploadSection** para cargar nuevas regiones
3. **Colores en hex** — La paleta viene en los datos
4. **Fotos opcionales** — Si no hay `photoUrl`, fallback a letra
5. **Mapa es placeholder** — Integrar mapcn cuando quieras

## 📞 Próximos Comandos

Cuando quieras activar todo:

```bash
# 1. Agregar ruta en router/index.tsx
# 2. Exportar/preparar datos JSON de San Martín
# 3. Navegar a /resultados-por-region
# 4. Usar DataUploadSection para cargar datos
```

---

**Estado:** ✅ Creado, listo para aplicar
**Compleción:** 100% estructura, 0% aplicación
**Última revisión:** 23 de Marzo, 2026
