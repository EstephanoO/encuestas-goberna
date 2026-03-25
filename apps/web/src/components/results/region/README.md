# Componentes de Resultados por Región

## Overview

Esta carpeta contiene todos los componentes necesarios para la página de **Resultados de Encuestas por Región** (`RegionResultsPage`).

La arquitectura está diseñada para ser **completamente reutilizable** y **flexible**, permitiendo cargar datos dinámicos de múltiples regiones.

## Estructura de Componentes

### 🎯 Página Principal
- **`RegionResultsPage.tsx`** — Página raíz que orquesta todos los componentes

### 🔧 Componentes Base

| Componente | Responsabilidad |
|-----------|-----------------|
| `RegionSelector.tsx` | Seleccionar una región del listado (con search) |
| `RegionHeader.tsx` | Encabezado con nombre y metadata de la región |
| `RegionStats.tsx` | Tarjetas de estadísticas rápidas (total votos, líder, etc.) |
| `RegionMapSection.tsx` | Visualización geográfica con puntos por zona |
| `RegionResultsSection.tsx` | Accordion de resultados por cargo |

### 📦 Componentes Auxiliares

| Componente | Responsabilidad |
|-----------|-----------------|
| `RegionCargoCard.tsx` | Tarjeta de ranking para un cargo específico |
| `RegionCandidateGrid.tsx` | Grid de candidatos en formato tarjeta |
| `RegionComparisonChart.tsx` | Gráfico de barras comparativo |
| `DataUploadSection.tsx` | Sección para cargar datos JSON de nuevas regiones |

## Tipos de Datos

Ubicados en `/types/regionResults.ts`:

```typescript
interface RegionData {
  id: string;
  name: string;
  description?: string;
  center?: [number, number];      // [lng, lat] para mapa
  zoom?: number;
  cargoResults: RegionCargoResults[];
  mapPoints?: RegionMapPoint[];
  stats?: RegionStats;
  dataSource?: string;
}

interface RegionCargoResults {
  cargoId: string;                 // 'presidentes', 'diputados', etc.
  cargoLabel: string;              // 'Presidencial', 'Diputados', etc.
  candidates: RegionCandidate[];
}

interface RegionCandidate {
  id: string;
  name: string;
  party: string;
  percentage: number;
  photoUrl?: string;
  color: string;                   // Color hex para gráficos
}
```

## Cómo Usar

### 1. Importar la Página

En tu router (`/app/router/index.tsx`):

```typescript
import RegionResultsPage from '@/pages/results/RegionResultsPage';

export function AppRouter() {
  return (
    <Routes>
      {/* ... otras rutas */}
      <Route path="/resultados-por-region" element={<RegionResultsPage />} />
    </Routes>
  );
}
```

### 2. Cargar Datos

La página permite cargar datos vía JSON. El formato esperado es:

```json
{
  "id": "san-martin",
  "name": "San Martín",
  "description": "Región en la selva nororiental",
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

### 3. Usar Datos de Ejemplo

Para testing/desarrollo, hay datos de ejemplo en `/lib/sampleRegionData.ts`:

```typescript
import { SAMPLE_SAN_MARTIN_DATA } from '@/lib/sampleRegionData';

// En RegionResultsPage.tsx
const [regions, setRegions] = useState([SAMPLE_SAN_MARTIN_DATA]);
```

## Flujo de Datos

```
RegionResultsPage (state manager)
├── DataUploadSection
│   └── onDataUpload → setRegions
├── RegionSelector
│   ├── regions (lista)
│   └── selectedRegion (seleccionada)
└── Detalles (condicional si hay selección)
    ├── RegionHeader
    ├── RegionStats
    ├── RegionMapSection
    └── RegionResultsSection
        └── RegionCargoCard (por cada cargo)
```

## Características

✅ **Selector de regiones** con búsqueda
✅ **Carga dinámico de datos** vía JSON
✅ **Visualización por cargo** (Presidentes, Diputados, Senadores, etc.)
✅ **Estadísticas agregadas** (total votos, líder, participación)
✅ **Mapa interactivo** con puntos por zona
✅ **Ranking de candidatos** con barras de progreso
✅ **Responsive** (mobile, tablet, desktop)
✅ **Accesible** (semántica HTML correcta, contraste)

## Mejoras Futuras

- [ ] Integración con **mapcn** para mapa real
- [ ] Exportación de datos a CSV/PDF
- [ ] Comparación entre múltiples regiones
- [ ] Gráficos de tendencia temporal
- [ ] Filtros avanzados por cargo/candidato
- [ ] Sincronización con backend API

## Notas de Desarrollo

### Props son ImmUtables
Los componentes aceptan props pero NO los modifican directamente. Todo cambio pasa por la página principal.

### No Hardcodear Datos
Los datos se pasan como props, nunca se hardcodean en los componentes. Esto permite reutilizar los mismos componentes con diferentes datos.

### Estilos con Tailwind
Todos los componentes usan **Tailwind CSS 4** con sintaxis moderna.

### TypeScript Estricto
Tipos completos, sin `any`. Interfaces bien definidas en `/types/regionResults.ts`.

---

**Creado:** Marzo 2026
**Última actualización:** Marzo 2026
