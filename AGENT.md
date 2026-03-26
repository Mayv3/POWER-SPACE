# AGENT.md — POWER-SPACE

Sistema de gestión de competencias de powerlifting (estilo IPF). Permite registrar atletas, rastrear intentos (sentadilla/banco/peso muerto), calcular puntajes DOTS y mostrar resultados en tiempo real con votación de jueces.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15.5.5, React 19, MUI v7, Tailwind CSS 4 |
| Backend | Express.js 5.1, Node.js (ES modules) |
| Base de datos | Supabase (PostgreSQL) + Realtime |
| Autenticación DB | Service role key (backend) / Anon key (frontend) |

---

## Estructura de carpetas

```
POWER-SPACE/
├── frontend/src/
│   ├── app/
│   │   ├── admin/atletas/        # CRUD de atletas
│   │   ├── admin/intentos/       # Registro de intentos y resultados
│   │   ├── admin/cargadores/     # Interfaz de cargadores (pesos)
│   │   ├── admin/jueces/         # Links a paneles de jueces
│   │   ├── jueces/[id]/          # Panel individual de juez (1, 2, 3)
│   │   └── publico/              # Scoreboard público + vista en vivo
│   ├── components/
│   │   ├── modales/              # Modals: crear/editar/eliminar atleta, marcar intento
│   │   ├── SideBar.tsx
│   │   ├── GenericDataGrid.js
│   │   └── LayoutDashboard.js
│   ├── const/
│   │   ├── categorias/           # Definición de categorías
│   │   ├── columns/              # Configuración columnas DataGrid (atletas, intentos)
│   │   └── powerSpaceTabs.js
│   ├── lib/supabaseClient.js     # Cliente Supabase frontend
│   ├── theme/                    # MUI theme (Quicksand, azul primario)
│   └── utils/calcularDots.js    # Fórmula DOTS
│
└── backend/src/
    ├── index.js                  # Entry point Express (puerto 4000)
    ├── controllers/
    │   ├── atletas.controller.js
    │   ├── intentos.controller.js
    │   ├── jueces.controller.js
    │   └── resultados.controller.js
    ├── routes/
    │   ├── atletas.routes.js
    │   ├── intentos.routes.js
    │   ├── jueces.routes.js
    │   ├── resultados.routes.js
    │   └── tandas.routes.js
    ├── services/supabaseClient.js
    ├── utils/calcularDots.js
    └── middlewares/errorHandler.js
```

---

## Base de datos — Esquema

### `atletas`
| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| nombre, apellido | string | |
| dni | string | único |
| fecha_nacimiento | date | |
| edad | int | calculado |
| categoria | string | Ej: MA1, FB2 |
| sexo | string | 'M' o 'F' |
| peso_corporal | float | kg |
| modalidad | string | |
| tanda_id | int | 1–4 |
| primer/segundo/tercer_intento_sentadilla | float | kg declarado inicial |
| primer/segundo/tercer_intento_banco | float | |
| primer/segundo/tercer_intento_peso_muerto | float | |
| altura_rack_sentadilla | int | |
| altura_rack_banco | int | |

### `intentos`
| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| atleta_id | FK → atletas | |
| movimiento_id | int | 1=Sentadilla, 2=Banco, 3=Peso Muerto |
| intento_numero | int | 1, 2 o 3 |
| peso | float | kg |
| valido | boolean\|null | null=pendiente, true=válido, false=nulo |
| Unique | (atleta_id, movimiento_id, intento_numero) | |

### `resultados`
| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| atleta_id | FK → atletas | |
| total | float | Suma de mejores levantamientos válidos |
| dots | float | Puntaje DOTS (fórmula IPF) |
| puesto | int | Posición dentro de la categoría |

### `estado_competencia`
| Campo | Tipo | Notas |
|---|---|---|
| id | PK | siempre 1 (singleton) |
| atleta_id | int | Atleta actual en plataforma |
| ejercicio | string | Ejercicio actual |
| intento | int | Número de intento |
| peso | float | Peso en barra |
| corriendo | boolean | Si el timer corre |
| tiempo_restante | int | Segundos (máx 60) |
| juez1_valido | boolean\|null | Decisión juez lateral |
| juez2_valido | boolean\|null | Decisión juez principal |
| juez3_valido | boolean\|null | Decisión juez lateral |
| intento_valido | boolean\|null | Decisión final |
| orden_proximos | jsonb | Array de atletas próximos |

---

## API Endpoints (base: `http://localhost:4000`)

### `/api/atletas`
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Todos los atletas |
| GET | `/ordenados-por-tanda` | Ordenados por tanda + peso |
| GET | `/tanda/:tandaId` | Atletas de una tanda |
| GET | `/:id` | Atleta por ID |
| POST | `/` | Crear atleta |
| PUT | `/:id` | Actualizar atleta |
| DELETE | `/:id` | Eliminar atleta |

### `/api/intentos`
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Todos los intentos |
| GET | `/atleta/:atleta_id` | Intentos de un atleta |
| GET | `/tanda/:tanda_id` | Intentos de una tanda |
| GET | `/atletas-con-intentos` | Atletas + intentos (`?tanda_id=todas\|1-4`) |
| POST | `/` | Crear intento |
| POST | `/upsert` | Crear o actualizar intento |
| PUT | `/:id` | Actualizar intento |
| DELETE | `/:id` | Eliminar intento |

### `/api/jueces`
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Estado de competencia actual |
| PUT | `/:juezId` | Registrar decisión de juez (`{valido}`) |
| POST | `/start` | Iniciar timer (60s) |
| POST | `/stop` | Detener timer |
| POST | `/atleta-actual` | Actualizar atleta en plataforma |

### `/api/resultados`
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Rankings con detalle de atletas |
| POST | `/calcular` | Calcular resultados (agrupa por tanda + categoría) |

### `/api/tandas`
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Las 4 tandas |

### `/ping` — Health check

---

## Variables de entorno

**Frontend (`frontend/env`)**
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**Backend (`backend/.env`)**
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PORT=4000
```

---

## Lógica de negocio clave

### DOTS (backend/utils/calcularDots.js + frontend/utils/calcularDots.js)
- Fórmula IPF: `DOTS = (Total × 500) / denominador`
- Denominador: función polinomial basada en sexo + peso corporal
- Coeficientes distintos para M y F

### Cálculo de resultados
- Total = mejor intento válido Sentadilla + mejor Banco + mejor Peso Muerto
- Si algún movimiento no tiene intento válido, Total = 0
- Ranking por tanda + categoría → asigna `puesto`

### Flujo de un intento
1. Admin registra atleta en plataforma (`POST /jueces/atleta-actual`)
2. Se inicia timer (`POST /jueces/start`)
3. Los 3 jueces votan en tiempo real (Supabase Realtime → `PUT /jueces/:juezId`)
4. Al completarse los 3 votos, se determina validez (mayoría)
5. Se guarda en `intentos` vía upsert
6. Se recalculan resultados (`POST /resultados/calcular`)

### Categorías
- Sexo: M / F
- Grupos de edad: A (Abierta), J (Juvenil), S (Sub-Junior), M1/M2 (Masters)
- Peso corporal: 1 / 2 / 3 (rangos por sexo)

---

## Componentes UI destacados

| Componente | Descripción |
|---|---|
| `GenericDataGrid.js` | DataGrid reutilizable con columnas coloreadas: Sentadilla=azul, Banco=rojo, Peso Muerto=verde |
| `SideBar.tsx` | Nav responsive: expandible en desktop, bottom nav en mobile |
| `ValidoIntentoModal.jsx` | Marcar intento válido/inválido con input de peso |
| `CreateAtletaForm.jsx` | Alta de atleta con validación |

---

## Convenciones de código

- Colores de movimientos: Sentadilla `#BBDEFB/#E3F2FD`, Banco `#FFCDD2/#FFEBEE`, Peso Muerto `#C8E6C9/#E8F5E9`
- `capitalizeWords()` / `capitalizeFirst()` en `utils/`
- Backend usa ES modules (`"type": "module"` en package.json)
- Frontend mezcla `.js` y `.tsx`
- Upsert preferido sobre insert para intentos
