# Plan: Vista de logística por persona + asistente interactivo

## Contexto

El dueño pidió una vista donde ver las tareas/horarios de su gente de logística
(nombres de ejemplo: Jefferson, Johan, Ricardo, Gonzalo — Gonzalo conductor) y poder
elegir a cada persona, con el asistente integrado ahí mismo para pedirle cosas como
"cambia el horario a Jefferson" o "añade tal tarea a Gonzalo" de forma conversacional.

Este plan es independiente de los otros tres grandes (`PLAN_PRESUPUESTO.md`,
`PLAN_COCINA.md`, `PLAN_INVENTARIO.md`) — no comparte datos con ellos ni bloquea su
orden.

## Investigado antes de diseñar

No hay hoy un roster de "personal de logística" como concepto propio. Hay tres cosas
que se pisan a medias:

1. **`logisticaEquipo`** (`src/App.jsx`) — array **por evento**, dentro de la
   checklist: `[{ nombre, inicio, fin, furgoneta, tipo }]`, con `nombre` escrito a
   mano cada vez, sin desplegable. Sirve para calcular coste
   (`totalLogistica()`) y la escaleta del día (`src/escaleta.js`). No se reutiliza
   entre eventos: cada evento nuevo empieza en blanco.
2. **`apunte.personal`** (`src/personal.js`, saneado en `src/calendario/apuntes.js`)
   — array **por apunte del calendario**: `[{ nombre, rol, inicio?, fin?, importe? }]`,
   con `rol` uno de `sala | cocina | logistica` (`ROLES`, `personal.js:131`). Es lo
   que edita el componente `Asignados` (`Calendario.jsx:665-789`), con un
   `<datalist>` que autocompleta desde el roster general (punto 3). Tampoco tiene
   memoria propia de horarios habituales por persona: cada apunte se rellena suelto.
3. **`EQUIPO`** (`src/calendario/apuntes.js:351`) — el ÚNICO roster persistente que
   existe, pero de plantilla general, no de logística: `[{ nombre, apodos }]`, vive
   dentro de `calendario/{codigo}.equipo` (mismo documento que los apuntes, ver
   abajo), y hoy solo sirve para (a) el autocompletado de nombres en `Asignados` y
   (b) detectar quién libra/está de vacaciones a partir de la hoja de pared
   (`personaDeTexto`/`disponiblesEn`). No guarda ningún rol/oficio fijo — no hay
   forma hoy de decir "Gonzalo es conductor" una sola vez y que se recuerde.

La pieza que MÁS se parece conceptualmente a lo pedido ya existe y está literalmente
comentada como tal — `VistaEquipo` (`Calendario.jsx:524-531`, cabecera del propio
código): *"La vista de logística. El mes dice QUÉ hay; esta dice CUÁNTA GENTE hace
falta..."* — pero agrupa por DÍA (los próximos 14), no por PERSONA: para cada día
suma cuánta gente hace falta y compara contra lo asignado en cada evento de ese día.
No deja elegir "Jefferson" y ver SU agenda.

**Tareas sueltas ya existen como concepto**: un apunte del calendario puede ser de
`tipo: "tarea"` (junto a `evento`, `vacaciones`, `recogida`, `cerrado`) — no genera
checklist, es solo una nota con fecha. Y el asistente ya tiene `apuntar_tarea`
(`src/asistente/herramientas.js:679-703`), que crea uno de estos con `texto` +
`evento` + `fecha` opcionales — pero SIN persona asociada.

**El asistente**: cada herramienta es una entrada de `HERRAMIENTAS`
(`herramientas.js`) o de un conector (`registrarConector()`,
`src/asistente/conectores.js:32-44`) con `{ datos, escribe, esquema, corre(ctx, args) }`.
Si `escribe: true`, `corre()` no toca nada directo: construye
`{ que, resumen, datos }` y lo pasa a `ctx.onEscribir(...)`, que es quien de verdad
aplica el cambio (con tarjeta de confirmación si el nivel es "permiso", o directo si
es "confianza" — nunca si el nivel es "consultar"). Una lista `NUNCA`
(`permisos.js:46-49`) bloquea ciertas tools pase lo que pase (identidades de item de
checklist); no aplica aquí, pero es el patrón a respetar: nada de una tool genérica
"modifica personal", cada acción su propia tool con su propio esquema y validación
(ratificado en `PLAN_MEJORAS.md`, "No hacer"). El botón del asistente
(`BotonAsistente.jsx`) hoy solo vive en checklist y calendario — para una pantalla
nueva basta con importarlo y pasarle `contexto`/`onEscribir`/`conectores`, como ya
hace `calendario/main.jsx`.

**Firestore**: `calendario/{codigo}` guarda `apuntes` y `equipo` como STRINGS JSON en
el mismo documento, con `firestore.rules` limitando las claves permitidas a
exactamente `["apuntes", "equipo", "ver", "actualizado"]` y un tope de tamaño
(`equipo < 100 KB`). No hay una colección de "tareas por persona" en ningún sitio —
ni hace falta crearla, si las tareas siguen viviendo como apuntes (ver diseño).

## Diseño propuesto

### 1. `EQUIPO` gana un `rol` opcional y persistente

```js
// src/calendario/apuntes.js — EQUIPO
{ nombre: "Gonzalo", apodos: ["gonza"], rol: "conductor" }
```
Mismo campo de siempre (`calendario/{codigo}.equipo`), un dato más por persona. Se
dice UNA vez en el panel `Equipo.jsx`, no en cada evento. `rol` es texto libre
sugerido (conductor, logística, sala, cocina...), no un enum cerrado — el dueño tiene
gente con oficios que no encajan en los 3 roles de `personal.js`. No cambia
`ROLES`/`personal.js` (eso sigue siendo "qué hace falta en ESTE evento", distinto de
"qué es esta persona en general").

### 2. Nueva pestaña "Personal" en el calendario, junto a "Mes" y "Equipo"

Selector de persona (del roster `EQUIPO`) y, debajo, SU agenda: todos los apuntes
donde aparece en `personal` — eventos reales (con su rol/horario en cada uno) y
tareas sueltas (`tipo: "tarea"`) — ordenados por fecha, futuros primero.

```js
// src/calendario/apuntes.js — función pura nueva, mismo patrón que disponiblesEn()
export function apuntesDePersona(apuntes, nombre) {
  const clave = claveDeTexto(nombre); // ya existe, identidad por texto (texto.js)
  return apuntes
    .filter(a => (a.personal || []).some(p => claveDeTexto(p.nombre) === clave))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
```
Reutiliza el array `apuntes` que el calendario YA carga (mismo `onSnapshot` de
siempre) — cero peticiones nuevas a Firestore para esta parte. Cada fila reutiliza
`Asignados` para poder editar a mano sin pasar por el asistente, igual que hoy.

### 3. Tareas por persona: mismo apunte `tipo: "tarea"`, con `personal` relleno

No hace falta ninguna colección nueva. Una "tarea de Jefferson" es un apunte
`{ tipo: "tarea", fecha, titulo, personal: [{ nombre: "Jefferson", rol: "logistica" }] }`
— sale en el calendario general igual que cualquier apunte, Y en la vista "Personal"
de Jefferson por el filtro del punto 2.

### 4. El asistente, integrado desde el principio (no al final)

Conector nuevo, `src/asistente/conectores/logistica.js`, con dos herramientas:

- **`asignar_tarea_personal`** — variante de `apuntar_tarea` que además acepta
  `persona`: crea el mismo apunte `tipo: "tarea"` de siempre, con `personal:
  [{ nombre: persona, rol: rolDelEquipo(persona) }]` si `persona` viene informada.
  Si `persona` no está en el roster `EQUIPO`, se avisa en el `resumen` de la
  confirmación en vez de fallar en silencio ("Jeferson" mal escrito no debe crear una
  tarea huérfana).
- **`cambiar_horario_personal`** — recibe `persona`, `evento` o `fecha`, `inicio`,
  `fin`. Busca el apunte por evento/fecha, localiza a `persona` dentro de su
  `personal` (por `claveDeTexto`, igual que el resto de la app), y cambia
  inicio/fin de ESA entrada. Si la persona no está asignada a ese apunte, error
  claro: *"Jefferson no está asignado a ese evento — dile primero con qué rol
  entra."* (no la añade sola: eso ya lo cubre `asignar_tarea_personal` o
  `Asignados` a mano).

Las dos pasan por `onEscribir` como cualquier otra — tarjeta de confirmación en
nivel "permiso" (el que ya usa el resto del asistente), directo solo si el dueño
sube el nivel a "confianza" él mismo en Ajustes. Nada de una tool genérica
"modifica personal": dos tools concretas, cada una con su validación.

### Qué NO se toca

- **`logisticaEquipo`** (checklist) se queda tal cual — es el coste/escaleta del
  camión de UN evento suelto, un concepto distinto de "quién es esta persona en
  general". Fusionarlo con el roster arriesgaría los cálculos de coste/escaleta ya
  en producción sin necesidad: nadie ha pedido eso, y es una pieza aparte si algún
  día hace falta.
- **`personal.js`/`ROLES`** (qué hace falta en un evento) no cambia — el `rol`
  persistente de la persona (punto 1) es informativo/sugerido, no sustituye al rol
  que se le pone en cada apunte concreto (alguien de "sala" puede echar una mano en
  logística un día suelto).

## Antes de tocar código: preview

Como con Presupuesto: antes de escribir el componente de verdad, una captura/mock de
la pestaña "Personal" (selector + agenda de una persona de mentira) para que el dueño
la vea y la apruebe, mismo criterio que ya se usa en este proyecto para todo lo
visual nuevo.

## Ficheros a tocar

- `src/calendario/apuntes.js` — `rol` opcional en `EQUIPO`; función pura nueva
  `apuntesDePersona(apuntes, nombre)`.
- `src/calendario/Calendario.jsx` — pestaña "Personal" nueva (selector + lista,
  reutilizando `Asignados` por fila).
- `src/calendario/Equipo.jsx` — campo `rol` opcional al editar una persona del
  roster.
- `src/asistente/conectores/logistica.js` (nuevo) — `asignar_tarea_personal` y
  `cambiar_horario_personal`.
- `src/asistente/herramientas.js` — un `import "./conectores/logistica.js"` más,
  junto a los demás.
- `firestore.rules` — revisar el tope de tamaño de `equipo` con el campo `rol`
  nuevo (probablemente no hace falta subirlo: unas pocas personas, un campo corto
  más cada una).
- `CONTEXTO.md` — documentar al cerrar.

## Verificación

- Puras: `apuntesDePersona()` (incluye o no según `personal`, orden por fecha),
  `saneaAsignados`/roster con `rol` (no revienta con eventos guardados sin ese
  campo, que son todos los de hoy).
- Visual: capturas de la pestaña "Personal" en los anchos/temas de siempre.
- Asistente: probado en el banco de pruebas (`pruebas/calendario.html`) con datos
  DEMO — las dos tools nuevas, incluyendo los casos de error (persona no encontrada,
  persona no asignada a ese apunte).
- `npm run test:rapido` en verde antes de commit; `npm run test` completo antes de
  fusionar.
