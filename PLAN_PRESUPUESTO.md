# Plan: Presupuesto y margen por evento

## Cómo se conecta con los otros dos planes

Este es la **fase 1** de un plan mayor de tres piezas, en este orden porque cada una
reutiliza más de la anterior que si se hicieran sueltas:

1. **Presupuesto y margen** (este documento) — junta los costes que YA se calculan
   hoy, sueltos, en un único número por evento.
2. **Cocina / escandallo** (`PLAN_COCINA.md`) — hoy el coste de comida en Presupuesto
   sale de precios estimados por item (`precios.js`); Cocina lo sustituye por un coste
   real por receta, que Presupuesto solo tiene que enchufar.
3. **Inventario Inteligente** (`PLAN_INVENTARIO.md`) — se apoya en el mismo dato de
   "coste real por evento" que junta Presupuesto (movimientos de consumo/rotura), y en
   el escandallo de Cocina (qué ingredientes gasta cada plato), para saber cuánto
   queda en el almacén.

No hace falta esperar a las otras dos para empezar esta: Presupuesto funciona con
precios estimados desde el primer día y mejora solo cuando Cocina/Inventario existan
(mismo criterio de "parcial es válido" que ya usa `cafeParaInvitados` o `numGastros`).

## Contexto

El dueño aprobó ya el orden y el alcance de esta pieza (`CONTEXTO.md`, sección "Qué
queda pendiente"): Presupuesto va primero porque reutiliza el motor de coste que ya
existe; el escandallo de Cocina va después porque parte de cero. Evento piloto
elegido: **"Aryan Campana"** (evento real ya limpio de datos duplicados, con su
personal ya editable desde el calendario — ver abajo).

**Capturas recibidas**: el dueño enseñó cómo lo lleva HOY, a mano, en una hoja de
cálculo por evento (nombres y cifras reales — no se reproducen aquí porque el repo es
público, `CLAUDE.md`). La forma de esa hoja es la que fija el diseño de abajo: no es
un boceto, es el proceso real que ya usa el negocio, y esta pieza lo que hace es
quitarle la hoja de cálculo suelta y meterlo dentro del propio evento.

Estructura de la hoja (con nombres de ejemplo, no los reales):
- Cabecera del evento (nombre, sitio, pax, fecha) y un timing del día — esto ya vive
  en el evento (`App.jsx`), no hay que inventar nada.
- Una tabla de personal por tramos —montaje/descarga en días previos, el propio
  evento, limpieza posterior— con NOMBRE, hora de entrada, hora de salida, y un
  estado por persona: **en nómina** (no se paga aparte, coste 0 en la hoja) o
  **pendiente de pago** (freelance, sí suma). Es el mismo concepto que ya existe en
  `logisticaEquipo` (`tipo: "nomina"` → coste de horas 0), generalizado a todo el
  personal, no solo a logística.
- Un **BALANCE** final con tres números — Presupuesto (lo cobrado), Gastos (lo que ha
  costado) y Margen (la resta, en € y en %) — y un desglose de Gastos en CUATRO
  partidas: **Personal, Comida, Bebida, Otros**, cada una con su € y su % del total.
- Cada partida es una lista de líneas sueltas, tipo "concepto — cantidad × precio =
  total" (p. ej. en Personal: preparación de cocina con sus horas y su tarifa, el
  bloque "en el evento" ya sumado de la tabla de arriba, limpieza aparte; en Comida:
  una línea por proveedor/compra; en Bebida: café, barra libre..., por pax o por
  hora; en Otros: gasolina, furgoneta, hielo, mantelería, comisiones de sitios que
  cobran aparte). Ese desglose por líneas sueltas es justo lo que falta automatizar:
  hoy se teclea a mano en la hoja, evento a evento.

## Investigado antes de diseñar

Hoy existen **dos motores de coste completos, en paralelo, que nunca se suman**:

1. **Coste de material** (comida, bebida, menaje) — `ModalModoCarga.jsx:367-404`,
   pestaña Resumen de Modo Carga. Por cada item de la checklist:
   ```js
   consumoReal = max(0, cargaInicial - vuelta)
   costeTotal  = max(consumoReal, roturas) * precio    // nunca se suman, una rotura
                                                         // es parte de lo que falta
   ```
   `precio` sale de `precios.js` (catálogo `nombre → €/ud`, vive solo en Firestore,
   `indice/precios`, sincronizado con `ajusteCompartido()` en `nube.js:299-330`).
   Agregados ya calculados y listos para reutilizar: `subtotal` por categoría,
   `granTotal`, `porPax`, `costeRoturas`, `ranking` de categorías por gasto.

2. **Coste de logística** (transporte/carga del equipo) — `totalLogistica()` en
   `checklist-format.js:96-134`. Sale de `logisticaEquipo` (array de personas con
   `inicio`/`fin`/`furgoneta`/`tipo`), más `tarifaLogistica` (€/h, editable por
   evento) y `plusFurgoneta` (€, editable). `tipo: "nomina"` no cobra horas, solo el
   plus de furgoneta si la lleva.

Y una tercera pieza de coste que **existe como dato pero no está enlazada a ningún
total**: el personal de sala/cocina. `apunte.personal` (nombre, rol, horario,
importe) ya es editable para cualquier evento —pasado incluido— desde
`Calendario.jsx` (`EditorApunte`/`Asignados`, arreglado esta sesión). Hoy ese
`importe` no se suma a ningún sitio.

**Lo que no existe en absoluto**: tarifas de sala/cocina (ni el concepto), un total
único que sume las tres fuentes de coste, y cualquier noción de "lo cobrado al
cliente" para poder calcular margen.

## Diseño propuesto

### 1. Las cuatro partidas, como líneas sueltas editables

Esquema de datos por evento (vive en el propio estado del evento, como el resto —
nada de Firestore aparte):

```js
gastos: {
  personal: [ { concepto, horas, tarifaHora, total } ],   // total puede venir de horas×tarifa, o puesto a mano
  comida:   [ { concepto, total } ],                       // "concepto" = proveedor o compra suelta
  bebida:   [ { concepto, cantidad, precioUnidad, total } ],
  otros:    [ { concepto, cantidad, precioUnidad, total } ],
}
```

Mismo criterio de "líneas sueltas con concepto + total" en las cuatro, porque así es
como ya se lleva a mano — no hace falta una forma distinta por partida. `total` es
siempre el campo que de verdad se suma; `horas`/`tarifaHora`/`cantidad`/`precioUnidad`
son solo apoyo para que salga solo si se rellenan, igual que ya hace `numGastros` o
`numCarpas` en la checklist (un número editable con una cuenta que lo propone).

```js
// presupuesto.js (nuevo)
export const subtotal = (lineas) => lineas.reduce((acc, l) => acc + (l.total || 0), 0);
export function gastosTotales(gastos) {
  const personal = subtotal(gastos.personal), comida = subtotal(gastos.comida),
        bebida = subtotal(gastos.bebida), otros = subtotal(gastos.otros);
  return { personal, comida, bebida, otros, total: personal + comida + bebida + otros };
}
```

### 2. De dónde sale cada línea, para no teclearlo todo a mano otra vez

Esto es lo que de verdad ahorra el trabajo manual de hoy — cada partida tiene ya una
fuente automática, parcial o total, dentro del propio evento:

- **Personal → "en el evento"**: ya se puede sacar sola sumando `apunte.personal`
  (sala/cocina, `Calendario.jsx`) más `logisticaEquipo` con `totalLogistica()`
  (`checklist-format.js:96-134`) — MISMO criterio que la hoja: quien tiene
  `tipo: "nomina"` no suma horas, solo el plus de furgoneta si aplica. Preparación
  previa y limpieza posterior son líneas nuevas, sueltas, sin automatizar de
  entrada (no hay hoy ningún dato de "trabajo de días antes/después" en el evento).
- **Comida y Bebida**: se pueden PROPONER (no forzar) a partir de lo que ya calcula
  Resumen de Modo Carga (`ModalModoCarga.jsx:367-404`, `costeTotal` por categoría de
  la checklist) una vez el evento está cargado y vuelto — antes de eso, o si se
  quiere ajustar a como de verdad se compró (proveedor suelto, no por item), la
  línea se edita o se sustituye a mano. Nunca se pisa lo que ya se ha tecleado.
- **Otros**: gasolina/furgoneta ya calculados en `totalLogistica()` (el plus de
  furgoneta); hielo y mantelería, lo mismo que Comida/Bebida, propuestos desde
  Resumen si hay precio en el catálogo; comisiones de proveedores (tipo "Dealde" en
  el ejemplo) no tienen automatismo posible, son siempre una línea suelta.

### 3. El balance

```js
export function margen(presupuestoCliente, gastosTotal) {
  if (!presupuestoCliente) return null;   // sin presupuesto puesto, no se inventa un margen
  const absoluto = presupuestoCliente - gastosTotal;
  return { absoluto, porcentaje: absoluto / presupuestoCliente };
}
```

`presupuestoCliente` (lo cobrado) es un campo nuevo del evento, puesto a mano por
quien lo cierra — igual que en la hoja, no se calcula. Margen es una **decisión de
precio, no un ratio de cantidad** (ya lo dejó apuntado el propio código de
`sector.js` al excluirlo del benchmark de sector), por eso vive en su propio cálculo
en vez de sumarse a `personal.js`/`calculos.js`.

### 4. El asistente, integrado desde el principio (no al final)

Mismo patrón que el resto (`src/asistente/conectores/presupuesto.js`, una línea en
`herramientas.js`): herramientas de **consulta** desde el día uno, sin permisos
especiales — "¿cómo va el margen de este evento?", "¿en qué se está yendo el
dinero?" (usa `gastosTotales()`/`margen()` tal cual, sin inventar nada, mismo
criterio que ya obliga `CLAUDE.md` con las herramientas de cálculo). Añadir líneas de
gasto por voz/chat ("apunta 90 de gasolina") es `escribe: true`, gobernado por
`permisos.js` igual que cualquier otra escritura — se activa cuando el modelo de
datos lleve un tiempo probado, no antes.

## Antes de tocar código: preview

Antes de construir la pantalla, preview con datos de mentira (banco propio o
`npm run dev`) mostrando: las cuatro partidas con sus líneas, el balance
(presupuesto/gastos/margen en € y %), y qué líneas salen propuestas solas vs. cuáles
hay que teclear. Mismo formato que ya conoce el dueño (su propia hoja), para que la
transición de la hoja de cálculo a la app no le resulte una pantalla distinta que
aprender de cero. Enseñar antes de tocar `App.jsx`/Firestore.

## Ficheros a tocar

- `src/presupuesto.js` (nuevo) — `subtotal()`, `gastosTotales()`, `margen()`, puras.
- `src/components/ModalModoCarga.jsx` — exponer `granTotal` por categoría (comida/
  bebida) hacia fuera en vez de dejarlo solo en el `useMemo` local del modal, para
  que Presupuesto pueda proponer líneas de Comida/Bebida sin tener que abrirlo.
- `src/checklist-format.js` — `totalLogistica()` ya sirve tal cual para la línea
  automática de Personal "en el evento" (más `apunte.personal`).
- `src/App.jsx` — nuevo estado `gastos` (las cuatro listas) y `presupuestoCliente`,
  pantalla/sección nueva de Presupuesto con su balance.
- `src/asistente/conectores/presupuesto.js` (nuevo) + una línea en `herramientas.js`.
- `CONTEXTO.md` — documentar la pieza, igual que el resto.

## Verificación

- Pruebas puras en un `presupuesto.test.mjs` nuevo: `gastosTotales()` suma las cuatro
  partidas por separado y en total; `margen()` da `null` sin presupuesto puesto y el
  signo correcto con gasto por encima/por debajo de lo cobrado; una línea con
  `tipo: "nomina"` en Personal no suma horas, igual que ya hace `totalLogistica()`.
- Piloto real: aplicar el cálculo contra el evento real ya usado como referencia
  (datos ya limpios, ver `CONTEXTO.md`) y contrastar a mano el resultado con la hoja
  de cálculo que ya se lleva hoy, antes de generalizar a todos los eventos.
- `npm run test:rapido` en verde antes de cada commit; `npm run test` completo antes
  de fusionar.
