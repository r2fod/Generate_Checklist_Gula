# Plan: Inventario Inteligente (Cocina + Logística)

## Cómo se conecta con los otros dos planes

Fase 3, después de `PLAN_PRESUPUESTO.md` y `PLAN_COCINA.md` — se apoya en las dos:

- De **Presupuesto** reutiliza el mismo dato de "consumo real por evento"
  (`consumoReal`/`roturas` que ya calcula `ModalModoCarga.jsx`): cada Modo Carga
  cerrado es, en el fondo, un movimiento de stock (−consumoReal, −roturas) que hoy se
  calcula y se tira, sin persistir en ningún sitio.
- De **Cocina** reutiliza el escandallo (qué ingredientes gasta cada plato) para
  saber la demanda real de ingredientes de cocina, no solo de material de logística.

No hace falta esperar a que las otras dos estén terminadas para empezar la parte de
**logística** (carpas, sillas, menaje) — esa mitad ya tiene todo lo que necesita hoy
mismo (ver más abajo). La parte de **ingredientes con caducidad** sí depende de que
Cocina exista primero (sin escandallo no hay demanda por ingrediente que reconciliar
contra existencias).

## Principio central del diseño

Inventario no es un módulo que solo se consulta: tiene que **alimentar directamente
la generación de la checklist**. Hoy ese patrón YA EXISTE, pero suelto y a mano, solo
para carpas: `calcCarpas()` (`carpas.js`) compara `CARPAS_EN_ALMACEN` (constante fija
en el código) contra lo que pide el evento y calcula `faltanCarpas` = cuántas hay que
alquilar. Es la misma cuenta que se querría para CUALQUIER item de material —sillas,
mesas, menaje—: cuánto tenemos de verdad en el almacén ahora mismo (dato vivo de
Inventario, no una constante en el código) vs. cuánto pide este evento (ya lo calcula
la checklist) = cuánto falta por alquilar/comprar para cubrirlo.

Esto convierte "cuánto hay que alquilar" de una pregunta que hoy solo se contesta
bien para carpas (y a ojo para el resto) en algo que la checklist responde sola,
item a item, en cuanto Inventario tenga la existencia real. Mismo tipo de
recálculo que ya se hizo esta sesión con `sufijoCarpas()` (el "faltan N" se
recalcula al editar la cantidad cargada) — Inventario generaliza esa idea a partir
de un dato real de stock, para todos los items de material.

## Investigado antes de diseñar

**Qué existe y hay que reutilizar:**

- **Coste de consumo por item, por evento** — `ModalModoCarga.jsx:367-404`.
  `consumoReal = cargaInicial - vuelta`, `roturas` aparte. Es la fuente de "cuánto se
  ha gastado/perdido" — el ledger de movimientos de Inventario se construye a partir
  de esto, evento a evento, en vez de inventar un mecanismo nuevo de registro.
- **Fungible vs. reutilizable** — `consumibles.js` (`esConsumible`). Ya distingue lo
  que se repone (bebida, hielo, comida — vuelve 0 es normal) de lo que es una pérdida
  real si no vuelve (cristalería, vajilla, mobiliario). Un ingrediente consumido
  entero en un evento y un rack que vuelve son, en términos de Inventario, el mismo
  concepto ("¿esto decrementa la existencia para siempre, o solo sale y vuelve?"),
  ya resuelto por esta función.
- **Constantes "cuánto tenemos"** — `carpas.js` (`CARPAS_EN_ALMACEN`, `PESAS_EN_ALMACEN`).
  Hoy son números fijos en el código, que exigen un deploy para cambiar cuando el
  almacén compra o pierde una carpa. Migrar de "constante en código" a "dato vivo en
  Firestore" es el primer paso concreto de la fase de logística.
- **Sincronización con Firestore**: patrón `ajusteCompartido()` (`nube.js:299-330`)
  para catálogos pequeños compartidos por todo el equipo (como `indice/precios`,
  `indice/ratios`) — sirve tal cual para el catálogo de items de inventario y sus
  existencias actuales. Para MUCHOS documentos individuales (movimientos de stock,
  lotes con caducidad, uno por rack/paellera con su estado) el patrón a replicar es
  el "archivo de eventos" (`evt_` + `docChanges()`), con su propio bloque nuevo en
  `firestore.rules` (estilo `match /calendario/{codigo}`, con sesión obligatoria).
- **El asistente**: un conector nuevo `src/asistente/conectores/inventario.js` con
  `registrarConector({...})`, más una línea de import en `herramientas.js` — mismo
  patrón que los 5 conectores ya existentes (whatsapp, correo, calendario,
  checklists, marketing). `escribe: true` en las herramientas que ajustan stock hace
  que `permisos.js` las gobierne por nivel (consultar/con permiso/confianza)
  automáticamente, sin nada nuevo que implementar ahí. `datos: true` en las que
  devuelven cantidades del negocio, para que la barrera de proveedores-que-entrenan
  ya existente las cubra igual que al resto.
- **Dónde vive**: probablemente una pestaña dentro de la checklist (no una cuarta
  mini-app), porque el equipo que la usaría es el mismo que ya usa la checklist para
  ver "cuánto queda de X antes de cargar el camión". Si algún día la usa personal de
  almacén que nunca abre la checklist, el patrón de app aparte (carpeta propia +
  manifest PWA propio, como `calendario/`) es mecánico de replicar.

**Qué no existe en absoluto**: ningún stock persistente entre eventos (todo es
carga-inicial/vuelta/rotura POR EVENTO, sin memoria de "cuánto queda" al día
siguiente), ni caducidad, ni lotes de compra, ni estado de retorno de material más
allá de las roturas contadas en Modo Carga.

**Riesgo ya aprendido esta sesión, a respetar**: nunca importar
`checklist-generadores.js` (el motor de cálculo, con todas sus dependencias) desde el
lado del formulario — aunque sea solo por una constante, Vite lo convierte en un
chunk compartido entre las dos apps y rompe cosas delicadas (pasó con `GASTROS_MINIMO`
esta misma sesión). Cualquier constante que necesiten los dos lados va en un fichero
pequeño y sin dependencias pesadas (como ya hace `carpas.js`), nunca en el motor
grande. Aplica igual si Inventario acaba compartiendo código entre checklist y
formulario.

## Los dos mundos, con esquema propio cada uno

### A. Material logístico (carpas, sillas, menaje, racks, paelleras…)

No se consume: sale, vuelve, y a veces se rompe o se pierde.

```
inventario_material/{itemId}      # ajusteCompartido(), catálogo pequeño y compartido
  nombre, categoria (misma taxonomía que checklist-generadores.js)
  existencia: number               # cuánto hay en almacén AHORA
  unidad: string

inventario_movimientos/{id}       # colección propia, un doc por movimiento
  itemId, eventoId, fecha
  delta: number                    # negativo = salió/se rompió, positivo = compra/entra reparado
  motivo: "consumo_evento" | "rotura" | "compra" | "reparacion" | "ajuste_manual"
```

`existencia` es un CACHÉ derivado de sumar movimientos — la fuente de verdad es el
ledger, igual que ya se decidió para presupuesto (nunca inventar un número, todo
sale de datos reales). Al cerrar un Modo Carga, se escribe un movimiento por cada
línea con `consumoReal`/`roturas` &gt; 0 — reutilizando el cálculo que YA hace
`ModalModoCarga.jsx`, no uno nuevo.

Con esto, `calcCarpas()` deja de mirar una constante y mira `existencia` real:

```js
// antes: const numCarpas = Math.min(carpasIdeal, CARPAS_EN_ALMACEN);
// después:
const numCarpas = Math.min(carpasIdeal, existenciaDe("carpas"));
```

Y lo mismo, generalizado, para cualquier item de material que hoy no tiene esta
cuenta (sillas, mesas...).

### B. Ingredientes de cocina (con caducidad)

Sí se consume, y además caduca — necesita lotes, no solo un número:

```
inventario_ingredientes/{ingredienteId}/lotes/{loteId}
  cantidad, unidad, fechaCaducidad, precioCompra, fechaCompra
```

La demanda por ingrediente sale del escandallo de `PLAN_COCINA.md` (qué ingredientes
lleva el menú de este evento, y cuánto de cada uno) — sin esa pieza, esta mitad no
tiene de dónde sacar la demanda a reconciliar contra el stock. Por eso la parte de
ingredientes se hace DESPUÉS de Cocina, aunque la de material logístico no necesita
esperar a nada.

## Fases propuestas

1. **Material logístico**: migrar `CARPAS_EN_ALMACEN` y constantes similares a
   `existencia` real en Firestore; escribir movimientos desde Modo Carga; el
   asistente puede CONSULTAR existencias desde el día 1 (nivel "solo consultar",
   sin permisos nuevos que inventar).
2. **Escritura desde el asistente**: una vez el modelo de datos lleva un tiempo
   probado con datos reales, habilitar que ajuste stock con permiso/confianza
   (avisar de caducidades próximas, proponer reposición) — integrado desde el
   principio de la fase 1 en modo lectura, no añadido al final como una fase aparte.
3. **Ingredientes con caducidad**: después de que `PLAN_COCINA.md` tenga escandallo.

## Antes de tocar código: preview

Preview de la pantalla de Inventario (existencias por item, aviso de "faltan N para
este evento", histórico de movimientos) con datos de mentira, antes de tocar
`firestore.rules` o `checklist-generadores.js`.

## Ficheros a tocar (cuando se apruebe la preview)

- `src/inventario.js` (nuevo) — `existenciaDe()`, `registrarMovimiento()`, puras.
- `src/carpas.js` y cualquier otro sitio con una constante "cuánto tenemos" —
  sustituir la constante por una consulta a `existenciaDe()`.
- `src/components/ModalModoCarga.jsx` — al cerrar Vuelta, escribir movimientos.
- `src/nube.js` / `firestore.rules` — nueva colección `inventario_movimientos`.
- `src/asistente/conectores/inventario.js` (nuevo) + una línea en `herramientas.js`.

## Verificación

- Puras: `existenciaDe()` con una lista de movimientos conocida da el número
  correcto; `calcCarpas()` con existencia inyectada da el mismo resultado que antes
  con la constante fija (prueba de no-regresión, mismo criterio que ya se usó al
  extraer `calcCarpas()` para compartirla entre boda y producción).
- Un evento cerrado en Modo Carga genera los movimientos esperados (uno por línea con
  consumo o rotura, ninguno para lo que volvió completo).
- `npm run test:rapido` en verde antes de cada commit; `npm run test` completo antes
  de fusionar.
