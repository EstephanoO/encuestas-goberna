# SKILL — Encuesta Presidencial Perú 2026 con Dashboard Realtime

## 1) Objetivo de la skill

Construir una plataforma web completa para una encuesta pública de intención de voto presidencial en Perú 2026, con dos vistas principales:

1. Vista pública de encuesta:
   - la gente puede votar por un candidato presidencial
   - o puede marcar "Voto en blanco"
   - o puede marcar "Aún no lo sé"
   - antes de enviar, se debe solicitar permiso de geolocalización
   - se debe registrar la ubicación exacta de la respuesta
   - la respuesta debe persistirse en backend y actualizar resultados en tiempo real

2. Vista de resultados:
   - dashboard en tiempo real
   - mapa con puntos o clusters de respuestas
   - gráfico de barras con resultados por candidato / opción
   - métricas agregadas
   - feed opcional de respuestas recientes

Esta skill obliga a una arquitectura limpia, escalable, reusable y preparada para alta concurrencia.

---

## 2) Stack obligatorio

### Frontend

- React
- TypeScript
- separación por páginas y componentes reutilizables
- React Router para navegación
- fetch o axios para consumo API
- Socket.IO client para realtime

### Backend

- NestJS
- Fastify
- Socket.IO
- Redis para distribución de eventos entre instancias
- Supabase como base de datos principal PostgreSQL
- scraper server-side del JNE
- backend como fuente de verdad de negocio

### Dashboard / mapa

- usar mapcn
- documentación base obligatoria: <https://www.mapcn.dev/docs/api-reference>
- el mapa debe construirse con componentes reales de mapcn y no con wrappers inventados

### Registro de componentes para el dashboard

Debe considerarse el registro entregado por el usuario:

```json
{
  "registries": {
    "@acme": "https://acme.com/r/{name}.json"
  }
}
```

### Infra / despliegue

- ya existe acceso MCP a Vercel
- ya existe acceso MCP a Supabase
- el proyecto debe quedar preparado para usar ambos
- no exponer secretos al frontend
- separar variables públicas y privadas

---

## 3) Fuentes externas obligatorias

### Fuente oficial de candidatos

Ruta oficial obligatoria:

- <https://votoinformado.jne.gob.pe/presidente-vicepresidentes>

Desde esa ruta se debe obtener:

- nombre del candidato presidencial
- foto del candidato
- nombre del partido
- logo del partido
- url fuente del detalle, si existe
- identificador externo, si existe
- orden de visualización, si corresponde

### Mapa

Ruta de referencia obligatoria:

- <https://www.mapcn.dev/docs/api-reference>

Esta documentación expone, entre otros, estos componentes:

- `Map`
- `MapControls`
- `MapMarker`
- `MarkerContent`
- `MarkerPopup`
- `MapPopup`
- `MapClusterLayer`

### Geolocalización

La geolocalización debe basarse en la API del navegador con consentimiento explícito del usuario:

- <https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API>

---

## 4) Reglas críticas de negocio

1. La home principal debe ser la página pública de encuesta.
2. La gente solo puede marcar una opción por envío.
3. Las opciones son:
   - candidatos cargados desde el JNE
   - voto en blanco
   - aún no lo sé
4. La ubicación exacta debe solicitarse antes de registrar la respuesta.
5. No se debe capturar ubicación sin interacción y consentimiento.
6. La respuesta enviada debe incluir:
   - opción elegida
   - latitud
   - longitud
   - precisión
   - metadata mínima útil
7. Cada nuevo voto debe impactar el dashboard en tiempo real.
8. El dashboard debe tener como mínimo:
   - total de respuestas
   - gráfico de barras
   - mapa de respuestas
9. El backend debe manejar scraping, persistencia, agregados y emisiones realtime.
10. No usar Supabase Realtime como corazón del sistema.
11. El corazón del realtime será Socket.IO + Redis.
12. No hardcodear candidatos si se pueden obtener del JNE.
13. Si el scraping falla, se debe usar el último snapshot válido y no romper la app.
14. El proyecto debe quedar preparado para alta concurrencia.

---

## 5) Qué sí debe hacer el agente

- crear frontend React modular
- crear backend NestJS + Fastify
- crear integración con Supabase
- crear integración con Redis
- crear integración con Socket.IO
- crear scraper del JNE
- crear la página pública de encuesta
- crear la página de resultados
- crear componentes reutilizables
- crear estructura de módulos
- crear validaciones
- crear endpoints
- crear capa de servicios y repositorios
- crear agregados para resultados
- crear mapa realtime con mapcn
- crear gráfico de barras para resultados
- dejar el proyecto listo para despliegue
- dejar instrucciones claras de desarrollo y producción

---

## 6) Qué NO debe hacer el agente

- no mezclar scraping en el frontend
- no meter toda la lógica en un solo archivo
- no usar componentes gigantes sin separación
- no depender del realtime nativo de Supabase como flujo central
- no guardar ubicación sin permiso
- no inventar candidatos faltantes
- no hardcodear imágenes si vienen de la fuente
- no emitir eventos Socket.IO directamente desde controladores si se puede centralizar en servicios
- no recalcular todo el dashboard completo por cada voto si puede emitir deltas o snapshots compactos
- no exponer claves secretas en cliente
- no bloquear el sistema si una imagen externa falla
- no dejar acoplado el código a clases frágiles del HTML si se puede hacer scraping más robusto

---

## 7) Arquitectura general esperada

### Visión de alto nivel

1. Un scraper sincroniza candidatos desde JNE.
2. Los candidatos se guardan en Supabase / PostgreSQL.
3. El frontend público consulta opciones activas.
4. El usuario selecciona una opción.
5. El frontend solicita geolocalización.
6. El frontend envía el voto al backend.
7. El backend:
   - valida payload
   - guarda respuesta
   - actualiza agregados
   - publica evento
   - emite a clientes Socket.IO
8. El dashboard escucha eventos y actualiza:
   - barras
   - mapa
   - contadores

### Principio de separación

- frontend encuesta = experiencia de votación
- frontend resultados = visualización
- backend = reglas, datos, scraping, agregados y realtime
- DB = persistencia y consultas
- Redis = distribución de eventos
- Socket.IO = transporte realtime hacia clientes

---

## 8) Estructura recomendada del repositorio

Se recomienda monorepo simple:

```txt
encuesta-peru-2026/
  apps/
    web/
    api/
  packages/
    shared-types/
    eslint-config/
    tsconfig/
  docs/
  .env.example
  package.json
  pnpm-workspace.yaml
  README.md
```

Si no se usa monorepo, entonces como mínimo:

- `/frontend`
- `/backend`

Pero esta skill prioriza monorepo.

---

## 9) Estructura detallada del frontend

Ruta recomendada:

```txt
apps/web/src/
```

Estructura:

```txt
apps/web/src/
  main.tsx
  App.tsx

  app/
    router/
      index.tsx
    providers/
      QueryProvider.tsx
      SocketProvider.tsx

  pages/
    home/
      HomePage.tsx
    results/
      ResultsPage.tsx
    not-found/
      NotFoundPage.tsx

  components/
    layout/
      AppShell.tsx
      PageContainer.tsx
      PageHeader.tsx
      TopNav.tsx
      Footer.tsx

    survey/
      SurveyHero.tsx
      VoteSelectionPanel.tsx
      CandidateGrid.tsx
      CandidateCard.tsx
      SpecialOptionCard.tsx
      LocationConsentCard.tsx
      GeolocationStatus.tsx
      SubmitVoteButton.tsx
      VoteSuccessState.tsx
      VoteErrorState.tsx

    results/
      ResultsSummaryCards.tsx
      ResultsBarChart.tsx
      RealtimeMap.tsx
      MapToolbar.tsx
      MapPopupCard.tsx
      RecentResponsesList.tsx
      LastUpdatedBadge.tsx
      ResultsLegend.tsx

    ui/
      Button.tsx
      Card.tsx
      Badge.tsx
      Alert.tsx
      Dialog.tsx
      Skeleton.tsx
      EmptyState.tsx
      ErrorState.tsx
      Loader.tsx

  hooks/
    useCandidates.ts
    useVoteOptions.ts
    useGeolocation.ts
    useSubmitVote.ts
    useRealtimeResults.ts
    useRealtimeMap.ts
    useResultsSummary.ts

  services/
    api/
      client.ts
      candidates.ts
      votes.ts
      results.ts
    socket/
      socket.ts
      events.ts

  lib/
    env.ts
    constants.ts
    formatting.ts
    geo.ts
    chart.ts
    map.ts

  types/
    candidate.ts
    vote-option.ts
    vote.ts
    result.ts
    map-point.ts
```

### Reglas del frontend

- Las páginas no deben contener lógica pesada.
- La lógica de red debe ir en `services/`.
- La lógica de estado / side effects debe ir en `hooks/`.
- Los componentes visuales deben ser lo más puros posible.
- El mapa debe estar encapsulado en `components/results/RealtimeMap.tsx`.
- No usar un solo componente para encuesta y resultados.

---

## 10) Páginas obligatorias del frontend

### Página 1: `/`

Archivo:

```txt
apps/web/src/pages/home/HomePage.tsx
```

#### Responsabilidad

Ser la página principal de encuesta.

#### Debe incluir

- hero corto y claro
- explicación breve
- grid de candidatos
- opción voto en blanco
- opción aún no lo sé
- bloque de consentimiento de ubicación
- estado de geolocalización
- botón enviar
- feedback de éxito o error
- CTA para ir a resultados

#### Flujo exacto de UI

1. cargar opciones
2. mostrar loading si aún no llegan
3. permitir seleccionar una sola opción
4. si el usuario no ha seleccionado, deshabilitar submit
5. al hacer submit:
   - verificar selección
   - solicitar ubicación
   - mostrar estado "obteniendo ubicación"
   - si concede permiso, enviar payload al backend
   - si no concede permiso, mostrar error claro
6. si se registra con éxito:
   - mostrar confirmación
   - limpiar selección si aplica
   - permitir ir a `/resultados`

### Página 2: `/resultados`

Archivo:

```txt
apps/web/src/pages/results/ResultsPage.tsx
```

#### Responsabilidad

Mostrar dashboard en tiempo real.

#### Debe incluir

- resumen de métricas
- gráfico de barras
- mapa realtime
- lista reciente opcional
- badge de última actualización
- fallback de error

#### Flujo exacto

1. cargar snapshot inicial por HTTP
2. abrir socket
3. escuchar eventos de actualización
4. actualizar estado local incrementalmente
5. evitar recargar toda la página por cada evento

---

## 11) Routing del frontend

Archivo sugerido:

```txt
apps/web/src/app/router/index.tsx
```

Rutas mínimas:

- `/` → `HomePage`
- `/resultados` → `ResultsPage`
- `*` → `NotFoundPage`

No inventar más rutas si no aportan valor real.

---

## 12) Componentes de encuesta

### `SurveyHero.tsx`

Responsabilidad:

- mostrar título principal
- pequeño copy
- indicar pasos para participar

### `CandidateGrid.tsx`

Responsabilidad:

- renderizar lista de candidatos
- recibir array tipado
- no hacer fetch por sí mismo

### `CandidateCard.tsx`

Responsabilidad:

- mostrar:
  - foto del candidato
  - nombre
  - partido
  - logo del partido
- tener estado seleccionado
- accesible para teclado
- responsive

### `SpecialOptionCard.tsx`

Responsabilidad:

- mostrar opción especial:
  - voto en blanco
  - aún no lo sé

### `LocationConsentCard.tsx`

Responsabilidad:

- explicar por qué se pide ubicación
- indicar que se requiere permiso explícito
- no capturar ubicación por sí sola
- solo informar y acompañar el flujo

### `GeolocationStatus.tsx`

Responsabilidad:

- mostrar estados:
  - idle
  - requesting
  - granted
  - denied
  - error

### `SubmitVoteButton.tsx`

Responsabilidad:

- botón enviar
- disabled si falta selección o si hay envío activo

### `VoteSuccessState.tsx`

Responsabilidad:

- confirmación visual clara

### `VoteErrorState.tsx`

Responsabilidad:

- mostrar errores amigables

---

## 13) Componentes de resultados

### `ResultsSummaryCards.tsx`

Responsabilidad:

- total de votos
- votos de hoy
- opción líder
- última actualización

### `ResultsBarChart.tsx`

Responsabilidad:

- renderizar resultados agregados
- ordenar descendente por votos
- mostrar total y porcentaje
- consumir datos ya agregados del backend

### `RealtimeMap.tsx`

Responsabilidad:

- contener toda la integración con mapcn
- mostrar puntos o clusters
- centrar en Perú
- manejar popups
- no mezclar fetchs de candidatos

### `MapToolbar.tsx`

Responsabilidad:

- zoom / locate / controles visuales si aplica

### `MapPopupCard.tsx`

Responsabilidad:

- mostrar datos básicos de la respuesta:
  - opción votada
  - timestamp
  - precisión
- nunca mostrar PII

### `RecentResponsesList.tsx`

Responsabilidad:

- lista opcional de respuestas recientes
- datos mínimos, nunca sensibles

### `LastUpdatedBadge.tsx`

Responsabilidad:

- mostrar hora de la última actualización realtime

---

## 14) Integración exacta de mapcn

Ruta de documentación dada por el usuario:

- <https://www.mapcn.dev/docs/api-reference>

### Componentes obligatorios a considerar

- `Map`
- `MapControls`
- `MapMarker`
- `MarkerContent`
- `MarkerPopup`
- `MapPopup`
- `MapClusterLayer`

### Estrategia recomendada

Para pocas respuestas:

- usar `Map` + `MapMarker`

Para muchas respuestas:

- usar `MapClusterLayer`

### Implementación recomendada

Archivo:

```txt
apps/web/src/components/results/RealtimeMap.tsx
```

Este componente debe:

1. recibir datos en formato preparado
2. convertirlos a:
   - marcadores individuales
   - o GeoJSON FeatureCollection
3. usar `MapClusterLayer` cuando el número de puntos supere un umbral
4. incluir `MapControls`
5. usar popup controlado para detalle puntual

### Centro inicial sugerido

Perú, con viewport razonable.

### Qué evitar

- recrear el mapa completo por cada voto
- pasar miles de nodos React si el cluster resuelve mejor
- lógica de sockets adentro del popup
- guardar colores mágicos dispersos

---

## 15) Hooks del frontend

### `useCandidates.ts`

Debe:

- consultar candidatos activos
- devolver loading, error, data

### `useVoteOptions.ts`

Debe:

- obtener opciones normalizadas desde backend

### `useGeolocation.ts`

Debe:

- encapsular `navigator.geolocation`
- exponer método explícito `requestLocation`
- devolver:
  - latitude
  - longitude
  - accuracy
  - status
  - error

### `useSubmitVote.ts`

Debe:

- construir payload final
- llamar endpoint POST de votos
- devolver loading / success / error

### `useRealtimeResults.ts`

Debe:

- abrir socket
- escuchar:
  - `results.updated`
  - `vote.created`
  - `map.point.created`
- actualizar stores o estado local

### `useRealtimeMap.ts`

Debe:

- preparar puntos para mapa
- controlar si usar clusters o markers

### `useResultsSummary.ts`

Debe:

- obtener snapshot inicial HTTP
- fusionarlo con realtime

---

## 16) Estructura detallada del backend

Ruta recomendada:

```txt
apps/api/src/
```

Estructura:

```txt
apps/api/src/
  main.ts
  app.module.ts

  common/
    config/
      app.config.ts
      env.validation.ts
    constants/
      app.constants.ts
      socket-events.constants.ts
    decorators/
    dto/
    filters/
      http-exception.filter.ts
    guards/
    interceptors/
    pipes/
    utils/
      logger.ts
      hashing.ts
      time.ts

  infrastructure/
    supabase/
      supabase.module.ts
      supabase.service.ts
    redis/
      redis.module.ts
      redis.service.ts
    socket/
      redis-io.adapter.ts

  modules/
    health/
      health.module.ts
      health.controller.ts

    candidates/
      candidates.module.ts
      candidates.controller.ts
      candidates.service.ts
      candidates.repository.ts
      dto/
        candidate-response.dto.ts
      scrapers/
        jne-candidates.scraper.ts
      jobs/
        sync-jne-candidates.job.ts
      mappers/
        candidate.mapper.ts

    vote-options/
      vote-options.module.ts
      vote-options.controller.ts
      vote-options.service.ts
      vote-options.repository.ts

    votes/
      votes.module.ts
      votes.controller.ts
      votes.service.ts
      votes.repository.ts
      dto/
        create-vote.dto.ts
        vote-response.dto.ts
      validators/
        vote.validator.ts

    results/
      results.module.ts
      results.controller.ts
      results.service.ts
      results.repository.ts
      dto/
        summary-response.dto.ts
        bar-item.dto.ts
        map-point.dto.ts
        recent-response.dto.ts

    realtime/
      realtime.module.ts
      realtime.gateway.ts
      realtime.service.ts
      publishers/
        results.publisher.ts

    geo/
      geo.module.ts
      geo.service.ts

    anti-abuse/
      anti-abuse.module.ts
      anti-abuse.service.ts
```

---

## 17) Responsabilidad exacta de cada módulo backend

### `candidates`

Responsable de:

- sincronizar candidatos desde JNE
- persistir candidatos
- exponer candidatos activos

### `vote-options`

Responsable de:

- construir catálogo de opciones disponibles
- incluir candidatos activos
- incluir `Voto en blanco`
- incluir `Aún no lo sé`

### `votes`

Responsable de:

- validar y registrar una respuesta
- coordinar con anti-abuse
- llamar actualización de agregados
- disparar publicación realtime

### `results`

Responsable de:

- devolver snapshots agregados
- barras
- puntos de mapa
- feed reciente

### `realtime`

Responsable de:

- namespace Socket.IO
- emisión de eventos
- encapsular payloads
- no mezclar lógica de persistencia

### `geo`

Responsable de:

- utilidades para geodatos
- preparar puntos de mapa
- opcionalmente reverse geocoding posterior

### `anti-abuse`

Responsable de:

- rate limiting
- cooldown por sesión / IP hash
- evitar spam básico

---

## 18) main.ts del backend

Archivo:

```txt
apps/api/src/main.ts
```

Debe hacer como mínimo:

- bootstrap Nest
- usar FastifyAdapter
- habilitar CORS según `CORS_ORIGIN`
- pipes globales de validación
- filtros globales
- prefijo global `/api`
- integrar adapter Redis para Socket.IO
- healthcheck

No dejar bootstrap vacío o mínimo sin validaciones.

---

## 19) Integración exacta NestJS + Fastify

- El servidor HTTP debe correr con Fastify.
- NestJS debe usar FastifyAdapter.
- No usar Express para este proyecto salvo emergencia documentada.
- La validación de DTOs debe ser global.

---

## 20) Integración exacta Redis + Socket.IO

### Objetivo

Permitir que múltiples instancias del backend compartan eventos realtime.

### Archivo sugerido

```txt
apps/api/src/infrastructure/socket/redis-io.adapter.ts
```

### Reglas

- crear adapter una sola vez
- no abrir clientes Redis por request
- permitir publicación y suscripción
- manejar reconexión
- tener nombres de eventos centralizados

### Eventos mínimos

- `vote.created`
- `results.updated`
- `map.point.created`

### Payloads mínimos recomendados

#### `vote.created`

- responseId
- voteOptionId
- createdAt

#### `results.updated`

- totalVotes
- bars
- leader
- updatedAt

#### `map.point.created`

- id
- latitude
- longitude
- label
- createdAt

---

## 21) Base de datos con Supabase

### Uso esperado

Supabase se usará como PostgreSQL administrado y capa de persistencia principal.

### Importante

- tu debes gestinar y crear las tablas
- no usar Supabase Realtime como núcleo del dashboard
- sí usar Supabase DB
- opcionalmente usar Supabase Storage para imágenes del scraper
- usar credenciales de servidor solo en backend

---

## 22) Esquema de datos recomendado

### Tabla: `candidates`

Campos:

- `id` uuid pk
- `external_source` text not null default `jne`
- `external_id` text null
- `full_name` text not null
- `party_name` text not null
- `party_logo_url` text null
- `candidate_photo_url` text null
- `source_url` text not null
- `source_hash` text null
- `sort_order` int null
- `is_active` boolean not null default true
- `last_synced_at` timestamptz null
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()

Índices:

- `idx_candidates_active`
- `idx_candidates_external_source_external_id`

### Tabla: `vote_options`

Campos:

- `id` uuid pk
- `type` text not null check in (`candidate`, `blank`, `undecided`)
- `candidate_id` uuid null references candidates(id)
- `label` text not null
- `slug` text not null unique
- `is_active` boolean not null default true
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()

Reglas:

- si `type = candidate`, `candidate_id` no debe ser null
- si `type != candidate`, `candidate_id` debe ser null

### Tabla: `survey_responses`

Campos:

- `id` uuid pk
- `vote_option_id` uuid not null references vote_options(id)
- `latitude` numeric(10, 7) not null
- `longitude` numeric(10, 7) not null
- `accuracy` numeric(10, 2) null
- `permission_state` text not null
- `source` text not null default `web`
- `session_id` text null
- `ip_hash` text null
- `user_agent` text null
- `created_at` timestamptz not null default now()

Índices:

- `idx_survey_responses_vote_option_id`
- `idx_survey_responses_created_at`
- `idx_survey_responses_created_vote_option`
- si usas PostGIS luego, considerar índice espacial

### Tabla: `results_aggregate`

Campos:

- `vote_option_id` uuid pk references vote_options(id)
- `total_votes` bigint not null default 0
- `percentage` numeric(7, 4) not null default 0
- `updated_at` timestamptz not null default now()

### Tabla: `sync_runs`

Campos:

- `id` uuid pk
- `source_name` text not null
- `status` text not null
- `started_at` timestamptz not null
- `finished_at` timestamptz null
- `metadata_json` jsonb null
- `error_message` text null

### Tabla opcional: `candidate_assets`

Campos:

- `id`
- `candidate_id`
- `asset_type`
- `remote_url`
- `storage_path`
- `mime_type`
- `created_at`

---

## 23) Migraciones

Las migraciones deben vivir en una ruta explícita.

Ejemplo si usas SQL:

```txt
apps/api/database/migrations/
```

Ejemplo:

```txt
apps/api/database/migrations/
  0001_init.sql
  0002_vote_options.sql
  0003_results_aggregate.sql
  0004_sync_runs.sql
```

### Reglas de migraciones

- no editar migraciones ya aplicadas en producción
- cada cambio estructural debe tener archivo nuevo
- incluir seeds mínimos para opciones especiales

### Seed mínimo obligatorio

Crear en `vote_options`:

- slug `blank-vote`
- label `Voto en blanco`
- type `blank`

- slug `undecided`
- label `Aún no lo sé`
- type `undecided`

---

## 24) Scraper del JNE

Ruta objetivo obligatoria:

- <https://votoinformado.jne.gob.pe/presidente-vicepresidentes>

### Ubicación recomendada del scraper

```txt
apps/api/src/modules/candidates/scrapers/jne-candidates.scraper.ts
```

### Ubicación recomendada del job

```txt
apps/api/src/modules/candidates/jobs/sync-jne-candidates.job.ts
```

### Responsabilidades del scraper

- descargar HTML de la página
- parsear listado de candidatos
- extraer:
  - nombre del candidato
  - partido
  - logo del partido
  - foto del candidato
  - url de ficha detalle si existe
- normalizar resultados
- devolver objetos limpios

### Reglas del scraper

- nunca inventar datos faltantes
- si falta imagen, guardar null
- registrar `source_url`
- calcular `source_hash` si es útil
- no depender de selectores hiper frágiles si se puede evitar
- si cambia el HTML, fallar con log claro

### Flujo de sincronización

1. crear registro en `sync_runs`
2. ejecutar scraper
3. mapear resultados
4. hacer upsert en `candidates`
5. reconstruir `vote_options` de tipo `candidate` si corresponde
6. marcar `last_synced_at`
7. cerrar `sync_runs`

### Estrategia de imágenes

Opción A:

- guardar solo URL remota

Prioridad:

- comenzar por URL remota

---

## 25) Endpoints backend obligatorios

### Health

#### `GET /api/health`

Debe devolver:

- status
- timestamp
- versión opcional

### Candidates

#### `GET /api/candidates`

Debe devolver:

- candidatos activos
- ya normalizados para frontend

#### `POST /api/candidates/sync`

Uso:

- interno o protegido
- ejecuta sincronización contra JNE

### Vote options

#### `GET /api/vote-options`

Debe devolver:

- opciones finales que usa la home
- candidatos + voto en blanco + aún no lo sé

### Votes

#### `POST /api/votes`

Payload:

```json
{
  "voteOptionId": "uuid",
  "latitude": -12.0464,
  "longitude": -77.0428,
  "accuracy": 18.5,
  "permissionState": "granted",
  "sessionId": "optional-client-session"
}
```

Validaciones:

- `voteOptionId` requerido
- latitude válida
- longitude válida
- permissionState requerido
- opción existente y activa
- anti-abuse básico

Respuesta sugerida:

```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "createdAt": "2026-03-20T12:00:00.000Z"
  }
}
```

### Results

#### `GET /api/results/summary`

Devuelve:

- totalVotes
- leader
- updatedAt

#### `GET /api/results/bars`

Devuelve:

- array de opciones con total y porcentaje

#### `GET /api/results/map-points`

Devuelve:

- puntos recientes o resumidos para el mapa

#### `GET /api/results/recent`

Devuelve:

- respuestas recientes sanitizadas

#### `GET /api/results/snapshot`

Devuelve:

- summary
- bars
- mapPoints
- recent

Este endpoint es recomendable para hidratar la página `/resultados` en una sola llamada inicial.

---

## 26) DTOs obligatorios

Ubicación sugerida:

```txt
apps/api/src/modules/votes/dto/create-vote.dto.ts
```

### `CreateVoteDto`

Campos:

- `voteOptionId: string`
- `latitude: number`
- `longitude: number`
- `accuracy?: number`
- `permissionState: "granted" | "prompt" | "denied"`
- `sessionId?: string`

Reglas:

- usar `class-validator`
- no aceptar payload arbitrario

### DTOs de results

Crear DTOs separados:

- `SummaryResponseDto`
- `BarItemDto`
- `MapPointDto`
- `RecentResponseDto`

No devolver entidades sin controlar.

---

## 27) Servicio de votos

Archivo:

```txt
apps/api/src/modules/votes/votes.service.ts
```

### Debe hacer exactamente esto

1. validar opción
2. correr anti-abuse
3. persistir la respuesta
4. actualizar agregados
5. construir eventos realtime
6. publicar eventos
7. devolver respuesta compacta

### Qué evitar

- no recalcular porcentajes de todas las filas con queries pesadas en cada request si se puede resolver mejor
- no emitir sockets desde el repositorio
- no permitir que el controlador haga toda la lógica

---

## 28) Servicio de resultados

Archivo:

```txt
apps/api/src/modules/results/results.service.ts
```

### Debe proveer

- `getSummary()`
- `getBars()`
- `getMapPoints()`
- `getRecent()`
- `getSnapshot()`

### Reglas

- optimizar lecturas
- no hacer joins innecesarios repetitivos
- centralizar los mappers de respuesta
- limitar volumen de puntos si la vista inicial no necesita todos

---

## 29) Estrategia de agregados

### Regla general

No recalcular el dashboard completo a partir de raw responses cada vez que entra un voto.

### Estrategia recomendada

Al registrar voto:

1. incrementar contador en `results_aggregate`
2. recalcular porcentajes de forma acotada
3. publicar snapshot compacto

### Opción simple

- recalcular agregados desde SQL al final de cada voto si el volumen aún es moderado

### Opción seria

- usar actualización incremental y job de consistencia

### Recomendación de esta skill

Empezar con incremental + endpoint snapshot.

---

## 30) Realtime backend

### Gateway sugerido

```txt
apps/api/src/modules/realtime/realtime.gateway.ts
```

### Namespace sugerido

- `/results`

### Reglas del gateway

- aceptar conexiones de dashboard
- no meter lógica de DB dentro del gateway
- el gateway solo emite y escucha eventos mínimos si son necesarios

### Servicio de publicación

```txt
apps/api/src/modules/realtime/realtime.service.ts
```

Debe exponer métodos como:

- `emitVoteCreated(...)`
- `emitResultsUpdated(...)`
- `emitMapPointCreated(...)`

### Estandarización de eventos

Archivo:

```txt
apps/api/src/common/constants/socket-events.constants.ts
```

Contenido sugerido:

- `VOTE_CREATED = "vote.created"`
- `RESULTS_UPDATED = "results.updated"`
- `MAP_POINT_CREATED = "map.point.created"`

---

## 31) Integración de geolocalización

### Lado frontend

Debe usar una interacción explícita del usuario para solicitar ubicación.

### Hook recomendado

```txt
apps/web/src/hooks/useGeolocation.ts
```

### Debe usar

- `navigator.geolocation.getCurrentPosition`

### Configuración sugerida

- `enableHighAccuracy: true`
- `timeout: razonable`
- `maximumAge: corto o cero`

### Datos capturados

- latitude
- longitude
- accuracy

### Si el usuario deniega permiso

- no enviar voto si el requisito es obligatorio
- mostrar mensaje claro
- no capturar datos incompletos como si fueran exactos

### Texto UX recomendado

- indicar que la ubicación se solicita para visualizar resultados geográficos en el dashboard
- indicar que la participación requiere consentimiento

---

## 32) Anti-abuse

### Objetivo

Reducir spam sin volver el MVP imposible.

### Estrategias mínimas

- `session_id`
- `ip_hash`
- cooldown por tiempo
- limitación por intervalos
- rate limit por IP

### Importante

- no almacenar IP en claro si no es necesario
- preferir hash

### Módulo sugerido

```txt
apps/api/src/modules/anti-abuse/
```

### Reglas

- si el anti-abuse bloquea, devolver error amigable
- no romper la UX con mensajes ambiguos

---

## 33) Seguridad

### Backend

- validación DTO global
- CORS controlado
- rate limiting
- logs estructurados
- manejo de excepciones
- separación de secretos

### Frontend

- no incluir service role key
- no confiar en validaciones del cliente
- no exponer datos internos del dashboard innecesariamente

### Scraper

- timeouts
- user-agent propio
- manejo de errores
- no colgar el proceso entero

---

## 34) Variables de entorno

### Frontend (`apps/web/.env`)

```env
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001/results
```

### Backend (`apps/api/.env`)

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=

REDIS_URL=redis://localhost:6379

JNE_CANDIDATES_URL=https://votoinformado.jne.gob.pe/presidente-vicepresidentes
APP_NAME=encuesta-peru-2026
```

### Regla

- `SUPABASE_SERVICE_ROLE_KEY` solo backend
- jamás en frontend

---

## 35) Configuración de Vercel y Supabase MCP

### Premisa

El usuario ya indicó que el MCP de Vercel y el MCP de Supabase ya están accesibles.

### Implicación para la implementación

- el agente debe dejar el proyecto estructurado para despliegue
- preparar build frontend y backend
- preparar `.env.example`
- preparar instrucciones de conexión
- preparar scripts de deploy y de migraciones

### Qué debe dejar listo

- frontend desplegable
- backend desplegable
- variables documentadas
- instrucciones de provisión de Supabase
- comando de sync inicial de candidatos

---

## 36) Scripts obligatorios

En el `package.json` raíz, como mínimo:

```json
{
  "scripts": {
    "dev": "pnpm -r dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test"
  }
}
```

En `apps/web/package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

En `apps/api/package.json`:

```json
{
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "sync:candidates": "node dist/scripts/sync-candidates.js"
  }
}
```

Puedes adaptar el último si el job de sync se expone de otra forma.

---

## 37) Flujo exacto de desarrollo

### Fase 1 — bootstrap

1. crear monorepo
2. configurar TypeScript
3. configurar React app
4. configurar NestJS con Fastify
5. configurar ESLint / Prettier
6. agregar shared types si aporta valor

### Fase 2 — infraestructura

1. integrar Supabase
2. integrar Redis
3. validar envs
4. crear healthcheck

### Fase 3 — base de datos

1. crear migraciones
2. crear seeds
3. levantar tablas base
4. insertar opciones especiales

### Fase 4 — scraper

1. implementar scraper JNE
2. implementar sync job
3. poblar candidatos
4. generar opciones tipo `candidate`

### Fase 5 — API

1. endpoints de candidates
2. endpoints de vote-options
3. POST votes
4. endpoints results
5. snapshot inicial

### Fase 6 — frontend encuesta

1. crear página `/`
2. crear cards
3. conectar options
4. geolocalización
5. submit

### Fase 7 — dashboard

1. crear `/resultados`
2. snapshot inicial
3. integrar Socket.IO
4. gráfico de barras
5. mapa realtime con mapcn

### Fase 8 — endurecimiento

1. anti-abuse
2. logs
3. validaciones
4. pruebas
5. deploy

---

## 38) Contrato de datos frontend-backend

### Tipo sugerido: `VoteOption`

```ts
type VoteOption = {
  id: string;
  type: "candidate" | "blank" | "undecided";
  label: string;
  slug: string;
  candidate?: {
    id: string;
    fullName: string;
    partyName: string;
    partyLogoUrl: string | null;
    candidatePhotoUrl: string | null;
  } | null;
};
```

### Tipo sugerido: `CreateVoteRequest`

```ts
type CreateVoteRequest = {
  voteOptionId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  permissionState: "granted" | "prompt" | "denied";
  sessionId?: string;
};
```

### Tipo sugerido: `ResultsBarItem`

```ts
type ResultsBarItem = {
  voteOptionId: string;
  label: string;
  totalVotes: number;
  percentage: number;
};
```

### Tipo sugerido: `MapPoint`

```ts
type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  createdAt: string;
};
```

---

## 39) Formato de datos para el mapa

Cuando se use `MapClusterLayer`, preparar GeoJSON:

```ts
type GeoJsonPointFeature = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    id: string;
    label: string;
    createdAt: string;
  };
};
```

### Reglas

- longitude primero, latitude después
- no inventar propiedades no usadas
- mantener payload liviano

---

## 40) Diseño de UX de la página principal

La home debe ser rápida y directa.

### Estructura sugerida

1. Header
2. Hero
3. Bloque “elige una opción”
4. Grid de candidatos
5. Opciones especiales
6. Bloque de consentimiento de ubicación
7. Botón enviar
8. Link a resultados

### Copy recomendado

- claro
- breve
- neutral
- no partidario

### Accesibilidad

- selección usable con teclado
- contraste adecuado
- estados de foco visibles
- alt text en imágenes

---

## 41) Diseño de UX del dashboard

### Estructura sugerida

1. Header
2. Summary cards
3. Gráfico de barras
4. Mapa
5. Feed reciente

### Orden recomendado

- primero métricas
- luego barras
- luego mapa
- luego detalle reciente

### Regla de performance

- no renderizar listas enormes sin límite
- limitar recientes
- paginar si hace falta

---

## 42) Consultas SQL orientativas

### Total de votos por opción

```sql
select
  vo.id as vote_option_id,
  vo.label,
  count(sr.id) as total_votes
from vote_options vo
left join survey_responses sr on sr.vote_option_id = vo.id
where vo.is_active = true
group by vo.id, vo.label
order by total_votes desc;
```

### Puntos recientes para mapa

```sql
select
  sr.id,
  sr.latitude,
  sr.longitude,
  vo.label,
  sr.created_at
from survey_responses sr
join vote_options vo on vo.id = sr.vote_option_id
order by sr.created_at desc
limit 1000;
```

Usar solo como orientación. Adaptar al repositorio real.

---

## 43) Reglas de performance

- no hacer scraping en cada request público
- no recalcular todo el mundo cada voto si no hace falta
- no servir todos los puntos históricos del mapa en una sola carga inicial
- usar clusters cuando el volumen crezca
- cargar snapshot inicial y luego diffs por socket
- mantener payloads pequeños
- usar índices

---

## 44) Errores esperados y cómo manejarlos

### Scraper falla

- usar último snapshot
- loggear error
- no romper home

### Usuario deniega ubicación

- mostrar mensaje
- impedir envío si ubicación exacta es obligatoria

### Redis no disponible

- log de error
- documentar fallback de una sola instancia si aplica
- no esconder la falla

### Supabase no disponible

- healthcheck falla
- no seguir como si nada

### Socket desconectado

- dashboard debe intentar reconectar
- mantener snapshot último válido

---

## 45) Testing mínimo esperado

### Backend

- test de validación de voto
- test de anti-abuse básico
- test de mapeo de scraper
- test de servicio de resultados

### Frontend

- test de selección de opción
- test de submit bloqueado sin selección
- test de estado de geolocalización
- test de render de barras

No hace falta sobreingeniería inicial, pero sí cubrir lo crítico.

---

## 46) Checklist de aceptación

El proyecto solo se considera aceptado si se cumple todo esto:

- existe página `/`
- existe página `/resultados`
- los candidatos se cargan desde JNE
- existen opciones “Voto en blanco” y “Aún no lo sé”
- la home permite seleccionar una sola opción
- se solicita ubicación con consentimiento explícito
- se registra latitud, longitud y accuracy
- existe endpoint `POST /api/votes`
- existe endpoint `GET /api/results/snapshot`
- el dashboard muestra gráfico de barras
- el dashboard muestra mapa
- el dashboard actualiza en tiempo real
- el código está separado por páginas, componentes, hooks, services y módulos
- el backend usa NestJS + Fastify
- el realtime usa Socket.IO + Redis
- la DB es Supabase/PostgreSQL
- hay `.env.example`
- hay instrucciones de arranque y deploy

---

## 47) Instrucciones finales al agente

Construye el proyecto completo respetando esta skill y estas rutas exactas:

### Ruta oficial de candidatos

- `https://votoinformado.jne.gob.pe/presidente-vicepresidentes`

### Ruta de documentación de mapa

- `https://www.mapcn.dev/docs/api-reference`

### Registro MCP de dashboard

```json
{
  "registries": {
    "@acme": "https://acme.com/r/{name}.json"
  }
}
```

### Stack obligatorio final

- Front encuesta: React
- Front dashboard: React
- Backend: NestJS + Fastify
- Realtime: Socket.IO
- Broker/eventos: Redis
- DB: Supabase
- Mapa: mapcn:<https://www.mapcn.dev/docs/advanced-usage>
- Despliegue: Vercel + Supabase MCP

### Prioridades

1. arquitectura limpia
2. separación clara de responsabilidades
3. scraping robusto
4. voto con geolocalización exacta
5. dashboard realtime sólido
6. reutilización de componentes
7. base preparada para concurrencia alta

### Si algo falla

- no detener todo el proyecto
- dejar fallback funcional
- documentar claramente qué quedó pendiente
- no inventar integraciones mágicas
