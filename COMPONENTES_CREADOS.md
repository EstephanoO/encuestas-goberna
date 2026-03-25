# 🎯 Resumen de Componentes Creados

## Vista General de Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│          RegionResultsPage (Página Principal)          │
│  - Maneja estado de regiones                             │
│  - Orquesta todos los componentes                        │
└──────────────┬──────────────────────────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
      ▼                 ▼
┌──────────────┐  ┌────────────────────────┐
│ DataUpload   │  │  RegionSelector        │
│ Section      │  │  - Search regiones     │
│ - Carga JSON │  │  - Grid selectable     │
└──────────────┘  └────────────┬───────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
              ┌──────────────┐    ┌────────────────┐
              │ RegionHeader │    │ RegionStats    │
              │ - Nombre     │    │ - Total votos  │
              │ - Fuente     │    │ - Líder        │
              └──────────────┘    │ - Participación│
                                  └────────────────┘
                    │
      ┌─────────────┴─────────────┐
      │                           │
      ▼                           ▼
┌──────────────────┐      ┌────────────────────┐
│ RegionMapSection │      │ RegionResults      │
│ - Puntos por zona│      │ Section (Accordion)│
│ - Ganador/zona   │      │ ├─ Presidentes     │
│ - % por zona     │      │ ├─ Diputados       │
└──────────────────┘      │ └─ Senadores       │
                          └──────────┬─────────┘
                                     │
                                     ▼
                          ┌────────────────────┐
                          │ RegionCargoCard    │
                          │ - Ranking por cargo│
                          │ - Fotos candidatos │
                          │ - Barras % votos   │
                          └────────────────────┘
```

## Desglose de 9 Componentes Principales

### 1️⃣ **RegionResultsPage.tsx** (Página)
- **Tipo:** Page Component
- **Responsabilidad:** Orquestador central
- **Props internas:** 
  - `selectedRegion`: RegionData | null
  - `regions`: RegionData[]
  - `isLoadingData`: boolean
- **Funciones:**
  - `handleRegionSelect()` — Actualiza región seleccionada
  - `handleDataUpload()` — Agrega/actualiza regiones
- **Retorna:** Estructura completa con todos los componentes

---

### 2️⃣ **RegionSelector.tsx** (Selector)
- **Tipo:** Client Component
- **Props entrada:**
  ```typescript
  {
    regions: RegionData[]
    selectedRegion: RegionData | null
    onSelect: (region: RegionData) => void
  }
  ```
- **Características:**
  - 🔍 Search input para filtrar regiones
  - 🎨 Grid responsive (1 col mobile → 3 cols desktop)
  - ✅ Indicador visual de selección
  - 🏷️ Muestra descripción si existe
- **Interacción:** Click en tarjeta → llama `onSelect(region)`

---

### 3️⃣ **RegionHeader.tsx** (Encabezado)
- **Tipo:** Display Component
- **Props entrada:**
  ```typescript
  {
    region: RegionData
  }
  ```
- **Muestra:**
  - 📍 Nombre de región (h2, grande)
  - 📝 Descripción
  - 📊 Fuente de datos (si existe)
  - 🕐 Fecha de actualización (si existe)
- **Estilo:** Gradient bg azul → Tailwind

---

### 4️⃣ **RegionStats.tsx** (Estadísticas)
- **Tipo:** Display Component
- **Props entrada:**
  ```typescript
  {
    region: RegionData
  }
  ```
- **Tarjetas KPI:**
  - 👥 Total votos
  - 🏆 Candidato líder + %
  - 📈 Participación promedio
- **Responsive:** 1 col mobile → 3 cols desktop
- **Icons:** Lucide icons con colores

---

### 5️⃣ **RegionMapSection.tsx** (Visualización Geo)
- **Tipo:** Display Component (placeholder)
- **Props entrada:**
  ```typescript
  {
    region: RegionData
  }
  ```
- **Muestra:**
  - Lista de "puntos" (provincias/zonas)
  - Candidato ganador en cada zona
  - Porcentaje
  - Color asociado
- **Grid:** 2 columnas, máx 6 puntos (indicador de +más)
- **Nota:** Placeholder. Integrar mapcn aquí después.

---

### 6️⃣ **RegionResultsSection.tsx** (Accordion)
- **Tipo:** Interactive Component
- **Props entrada:**
  ```typescript
  {
    region: RegionData
  }
  ```
- **Características:**
  - 📂 Accordion expandible por cargo
  - 🔤 Ordena automático: Presidentes → Diputados → Senadores
  - ⬆️ Solo uno expandido a la vez (state local)
  - 🎯 Estado visual con chevron animado
- **Hijos:** `RegionCargoCard` para cada cargo expandido

---

### 7️⃣ **RegionCargoCard.tsx** (Ranking de Cargo)
- **Tipo:** Display Component
- **Props entrada:**
  ```typescript
  {
    cargo: RegionCargoResults
  }
  ```
- **Contenido:**
  - 🥇🥈🥉 Posición (estrella para 1º, número coloreado para resto)
  - 📸 Avatar con foto o inicial
  - 👤 Nombre candidato
  - 🏛️ Partido político
  - 📊 Porcentaje
  - ▓▓▓ Barra de progreso con color
- **Orden:** Descendente por porcentaje

---

### 8️⃣ **RegionCandidateGrid.tsx** (Grid Visual)
- **Tipo:** Display Component
- **Props entrada:**
  ```typescript
  {
    candidates: RegionCandidate[]
    limit?: number
  }
  ```
- **Características:**
  - 🖼️ Photo background (fallback a color)
  - 📋 Nombre, partido
  - 📊 Intención de voto
  - ▓▓▓ Barra con color
  - 🎴 Tarjetas con hover shadow
- **Responsive:** 1 col → 2 cols → 3 cols
- **Optional limit:** Mostrar primeros N candidatos

---

### 9️⃣ **DataUploadSection.tsx** (Importador)
- **Tipo:** Interactive Component
- **Props entrada:**
  ```typescript
  {
    onDataUpload: (regions: RegionData[]) => void
    isLoading?: boolean
  }
  ```
- **Funcionalidad:**
  - 📁 Upload file input (.json)
  - ✅ Validación de estructura
  - 🎨 Dashed border dropzone UX
  - ❌ Mensajes de error claros
  - ✔️ Mensajes de éxito
  - 📖 Preview de formato esperado
- **Validaciones:**
  - Solo .json
  - Estructura válida (id, name, cargoResults)
  - Array o single object

---

## Componentes Auxiliares (2)

### 🔷 **RegionComparisonChart.tsx**
- Gráfico de barras horizontal
- Para comparación visual de candidatos
- Usado dentro de RegionCargoCard si quieres

### 🔶 **RegionCandidateGrid.tsx**
- Grid de tarjetas de candidatos
- Reutilizable para diferentes vistas
- Límite configurable

---

## Archivos de Soporte

### 📘 **regionResults.ts** (Tipos)
- `RegionData` — Estructura completa
- `RegionCandidate` — Candidato individual
- `RegionCargoResults` — Resultados por cargo
- `RegionStats` — Estadísticas
- `RegionMapPoint` — Punto geográfico
- `RawRegionDataImport` — Para futuros imports

### 📊 **sampleRegionData.ts** (Ejemplo)
- `SAMPLE_SAN_MARTIN_DATA` — Datos completos San Martín
- Presidentes, Diputados, Senadores
- Stats y map points
- Listo para testing

### 📖 **README.md** (Documentación)
- Guía de componentes
- Flujo de datos
- Cómo usar
- Mejoras futuras

---

## Flujo de Interacción Paso a Paso

```
1. Usuario abre /resultados-por-region
   ↓
2. Página render sin regiones
   - Mensaje: "No hay datos cargados"
   - DataUploadSection visible
   ↓
3. Usuario carga san-martin.json
   ↓
4. DataUploadSection valida JSON
   - Si error → muestra AlertCircle
   - Si ok → llama onDataUpload()
   ↓
5. RegionResultsPage agrega región a state
   - Auto-selecciona si es la primera
   ↓
6. RegionSelector muestra San Martín como opción
   ↓
7. Usuario puede hacer click en otras regiones
   ↓
8. Detalles se actualizan:
   - RegionHeader
   - RegionStats
   - RegionMapSection
   - RegionResultsSection (accordion)
   ↓
9. Usuario abre/cierra cargos en accordion
```

---

## Checklist de Codificación

✅ React 19 (sin useMemo/useCallback)
✅ TypeScript strict
✅ Tailwind CSS 4 (cn() para condicionales)
✅ Componentes puros
✅ Props tipadas
✅ Sin hardcodeo de datos
✅ Accesibilidad (buttons tienen type, labels, etc.)
✅ Responsive design
✅ Imports nombrados
✅ JSDoc comments en componentes clave

---

## Próximos Pasos (cuando quieras activar)

1. ✅ Agregar ruta en `/app/router/index.tsx`
2. ✅ Preparar datos JSON de San Martín
3. ✅ Navegar a `/resultados-por-region`
4. ✅ Cargar archivo JSON vía DataUploadSection
5. ⏳ (Opcional) Integrar mapcn real en RegionMapSection

---

**Todo está listo para usar. Cero aplicación realizada. Solo estructura.**
