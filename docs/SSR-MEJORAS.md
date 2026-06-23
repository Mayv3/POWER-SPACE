# SSR en POWERSPACE — análisis por pantalla

Documento de referencia sobre qué pantallas se pasaron a **Server-Side Rendering (SSR)**, qué beneficio concreto aporta en cada una y por qué otras se dejaron como están.

> **Contexto de la app:** Next.js 15 (App Router), React 19, datos en vivo vía Supabase
> (`postgres_changes` autoritativo + canal `broadcast` para fast-path). Las pantallas de
> competencia se actualizan constantemente; el `root layout` es `'use client'` (MUI + theme),
> pero eso **no** impide que las páginas hijas sean Server Components.

---

## Resumen ejecutivo

| Pantalla | Ruta | ¿SSR? | Beneficio | Render |
|----------|------|:-----:|-----------|--------|
| Público (espectadores) | `/publico` | ✅ Sí | **Alto** — muchas cargas frías, móvil, red de venue | `ƒ` dynamic |
| Vista (pantalla grande) | `/publico/vista` | ✅ Sí | **Bajo** — un solo kiosco de larga vida | `ƒ` dynamic |
| Admin (todas las pestañas) | `/admin/*` | ❌ No | Ninguno — auth, single-user, puro CRUD | `○` static shell |
| Jueces | `/jueces/[id]` | ❌ No | Marginal — sesión interactiva | `ƒ` dynamic |
| Home | `/` | ❌ No | N/A — redirección/landing | `○` static |

`ƒ` = server-rendered on demand · `○` = prerender estático

---

## Patrón aplicado

Cada pantalla SSR se partió en dos:

```
page.js            → Server Component (async). Hace el fetch inicial en el server,
                     marca export const dynamic = 'force-dynamic', pasa props.
   └─ *Client.js   → 'use client'. Recibe initial* por props, los usa como estado
                     inicial (useState), y mantiene TODO el realtime/interactividad.
```

Flujo de una request:

1. **Server** consulta Supabase (lectura anónima, una vez) y renderiza el primer frame **con datos reales** en el HTML.
2. El **browser** recibe HTML ya pintado (no pantalla en blanco) → hidrata con las **mismas** props → sin hydration mismatch.
3. Tras hidratar, los `useEffect` revalidan (refetch) y se **suscriben al realtime** igual que antes.

**Clave:** SSR aquí sólo adelanta el **snapshot inicial** (mejora TTFB / First Contentful Paint). El realtime queda intacto y sigue siendo la fuente autoritativa. `postgres_changes` reconcilia siempre.

**Por qué `force-dynamic`:** los datos cambian cada segundo. Sin esa directiva, Next prerenderizaría la página como estática en build → todos verían un snapshot viejo y congelado. `force-dynamic` obliga a render fresco por request.

---

## `/publico` — Pantalla pública (espectadores) ✅ SSR

**Quién la usa:** cada espectador en su celular dentro del venue. Muchas cargas frías, distintas, en simultáneo.

### Beneficios

- **First Contentful Paint inmediato.** El ranking, el atleta en vivo y los próximos llegan ya renderizados en el HTML. Sin SSR el usuario veía `CARGANDO…` mientras el JS arrancaba, abría conexión a Supabase y traía la data.
- **Resiliente a red mala.** En un gimnasio/estadio la red móvil es pobre. SSR mete el contenido en la **primera** respuesta HTTP en vez de encadenar: descargar JS → ejecutar → fetch → render. Menos round-trips = contenido visible antes.
- **Mejor LCP / Core Web Vitals.** El elemento grande (ranking/atleta) ya está en el HTML inicial.
- **Volumen.** Es la pantalla con más cargas frías distintas; es donde el ahorro se multiplica por cantidad de usuarios.

### Qué se trae en el server

`Promise.all` de:
- `atletas_con_intentos` (toda la tabla, vista mergeada) → ranking inicial.
- `estado_competencia` (id=1) → estado en vivo.
- Si hay `atleta_id` activo → fila del atleta en plataforma.

### Qué sigue siendo client

- Suscripción `postgres_changes` a `intentos` y `estado_competencia`.
- Cronómetro local, filtros, buscador, navegación interna (detalle/versus), gesto "atrás", precarga de fotos, animaciones FLIP.

---

## `/publico/vista` — Pantalla grande / proyector ✅ SSR

**Quién la usa:** un único display (proyector/TV del venue). Se abre una vez y vive horas; todo cambio entra por websocket.

### Beneficios

- **Bajos.** Honesto: para un kiosco de larga vida el first paint se ve **una sola vez**. SSR no se amortiza como en `/publico`.
- **Lo que sí aporta:** arranque "en frío" más prolijo. Si la pantalla se recarga (corte, reinicio, F5 del operador), aparece directo con el estado actual en vez del flash `En espera…` mientras conecta. Útil en vivo: evita que el público vea la pantalla "vacía" durante el reinicio.

### Por qué se hizo igual

Decisión explícita del equipo de unificar ambas pantallas públicas bajo el mismo patrón SSR. Consistencia de código > micro-optimización. El costo de mantenerlo es bajo (mismo patrón que `/publico`).

### Qué se trae en el server

- `estado_competencia` (id=1) → estado/atleta/jueces/peso/tiempo inicial.

### Qué sigue siendo client

- `postgres_changes` (autoritativo) + canal `broadcast` (fast-path ~50-150ms para luces de jueces, atleta, cronómetro).
- Cronómetro local, banner VÁLIDO/NULO, presentación animada de equipo+coach.

---

## `/admin/*` — Panel de administración ❌ Sin SSR

Pestañas: `atletas`, `cargadores`, `coaches`, `equipos`, `historico`, `intentos`, `jueces`.

### Por qué NO conviene

- **Detrás de auth.** No hay SEO ni cargas frías masivas que optimizar.
- **Single-user, sesión larga.** El operador la abre una vez y trabaja; el first paint se amortiza en una sesión larga, no se repite por visitante.
- **Puro CRUD / mutaciones.** El valor está en la interactividad (DataGrid, formularios, edición en vivo), no en el snapshot inicial.
- **Costo > beneficio.** Partir cada pestaña en server+client agrega complejidad sin pago medible.

Se quedan como client components con shell estático (`○`).

---

## `/jueces/[id]` — Vista de juez ❌ Sin SSR (marginal)

- Sesión interactiva de un juez votando. Igual que admin: el valor es la interacción en tiempo real, no el primer frame.
- Ya es `ƒ` dynamic por la ruta `[id]`, pero no se le agregó fetch inicial en server porque el beneficio es marginal (un usuario, sesión sostenida).

---

## Caveats / cosas a vigilar

- **Hidratación de fechas.** En `/publico`, `new Date().toLocaleDateString('es-AR', …)` ahora corre también en el server. Si el ICU del server difiere del browser (ej. `jun.` vs `jun`), React emite un warning de hidratación menor y el valor del cliente gana. Es cosmético. Si molesta, mover ese cálculo a un `useEffect`.
- **Doble fetch en mount.** El client revalida tras hidratar (refetch del estado inicial). Es intencional: server pinta, client revalida. Costo: una consulta extra por carga (igual que el comportamiento previo).
- **`force-dynamic` es obligatorio.** Quitarlo haría que Next sirva un snapshot estático y congelado. No remover.
- **Key anon en server.** `supabaseServer.js` usa la `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ya es pública). No expone nada que el cliente no tenga; sólo lecturas anónimas one-shot, sin sesión ni realtime.
- **Sin cache de HTML.** Como la data cambia cada segundo, el HTML no se cachea en CDN (sería stale al instante). El beneficio es TTFB del snapshot, **no** caching.

---

## Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `frontend/src/lib/supabaseServer.js` | Cliente Supabase server-only (sin sesión/realtime) + helpers de fetch inicial |
| `frontend/src/app/publico/page.js` | Server Component: fetch inicial + `force-dynamic` |
| `frontend/src/app/publico/PublicoClient.js` | Client Component: realtime + UI (ex `page.js`) |
| `frontend/src/app/publico/vista/page.js` | Server Component: fetch estado + `force-dynamic` |
| `frontend/src/app/publico/vista/VistaClient.js` | Client Component: realtime + UI (ex `page.js`) |
