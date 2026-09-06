# Plan: Cocina — escandallo y lista de la compra

## Cómo se conecta con los otros dos planes

Fase 2 del plan grande, después de `PLAN_PRESUPUESTO.md` (fase 1). A diferencia de
Presupuesto —que reutiliza motores de coste que ya existen—, esto **parte de cero**:
no hay recetario, ni menú de evento, ni escandallo en el código actual. Se conecta
con los otros dos así:

- **Con Presupuesto**: hoy el coste de comida en Presupuesto sale de precios
  estimados por item (`precios.js`, €/unidad de "Copas de vino", "Cerveza", etc., sin
  distinguir receta). El escandallo de aquí calcula un coste real por ración a partir
  de sus ingredientes — Presupuesto solo tiene que enchufar ese número en vez del
  estimado, sin cambiar su propia lógica de suma.
- **Con Inventario** (`PLAN_INVENTARIO.md`): el escandallo (qué ingredientes lleva
  cada plato, y cuánto de cada uno) es exactamente lo que Inventario necesita para
  saber cuánto se gasta de cada ingrediente por evento, y así poder avisar de
  caducidades y reponer stock. Sin escandallo, Inventario de cocina no tiene de dónde
  sacar la demanda por ingrediente — hoy `calculos.js` solo calcula cantidades
  agregadas (litros de bebida, kg de hielo), no ingredientes de una receta.

## Contexto

Aprobado como fase 2, después de Presupuesto (`CONTEXTO.md`). El propio dueño ya
señaló que "cocina no tiene un ratio único con el que compararla — depende del tramo
de pax" (nota histórica de `sector.js`, por eso quedó fuera del benchmark de sector):
el coste de un menú no es una cifra fija, cambia con lo que se sirve.

## Investigado antes de diseñar

- `calculos.js` calcula CANTIDADES agregadas por pax (litros de bebida, kg de hielo,
  raciones de paella…), nunca ingredientes de una receta. No hay nada que reutilizar
  para "de qué está hecho el plato X".
- `checklist-generadores.js` construye la checklist de MATERIAL (qué cargar), no un
  menú de evento con sus platos. El menú hoy es un conjunto de flags/preguntas del
  formulario (`llevaPaella`, `tipoPaella`, `entranteCompartido`…), no una lista
  estructurada de platos con ingredientes.
- `precios.js` es el catálogo de precios por ITEM de checklist (€/copa, €/kg de
  hielo…), no de ingredientes de cocina (€/kg de arroz, €/kg de pollo…). Son dos
  catálogos con forma distinta: uno es "cuánto cuesta este material que cargamos",
  el otro sería "cuánto cuesta este ingrediente que compramos para cocinar".
- `menus-especiales.js` ya sabe leer alergias de las notas de un evento y generar
  menús aparte — es el precedente más cercano a "modelar platos/menú de un evento",
  aunque no tiene ingredientes ni coste, solo nombres.

## Diseño propuesto

### 1. Recetario (catálogo compartido, no por evento)

```
recetario/{platoId}          # ajusteCompartido() en nube.js, como precios/ratios
  nombre: "Paella de marisco"
  racionGramos: 350
  ingredientes: [{ ingrediente: "Arroz bomba", cantidadPorRacion: 90, unidad: "g" }, ...]
```

Un ingrediente se identifica por nombre (mismo criterio que el Item ID de la
checklist: `${categoría}::${nombre}` si hace falta desambiguar, documentado en
`CLAUDE.md`). El catálogo de ingredientes con su €/unidad de compra vive en
`precios_ingredientes` (o se amplía `precios.js` con un segundo catálogo, a decidir
en la preview) — **no es el mismo catálogo que `precios.js`** de material.

### 2. Menú del evento

Qué platos lleva ESTE evento (no todo el recetario, solo los elegidos), con las
raciones que le tocan (pax del evento). Vive en el estado del propio evento, como
`llevaPaella`/`tipoPaella` hoy, pero como lista en vez de flags sueltos:

```js
menuEvento: [{ platoId: "paella-marisco", raciones: 90 }, ...]
```

### 3. Escandallo (coste por ración, y lista de la compra)

```js
export function costeRacion(plato, preciosIngredientes) {
  return plato.ingredientes.reduce((acc, i) =>
    acc + (i.cantidadPorRacion / 1000) * (preciosIngredientes[i.ingrediente] || 0), 0);
}
export function listaDeLaCompra(menuEvento, recetario) {
  // suma, por ingrediente, cuánto hace falta comprar para TODO el menú del evento
  // (la "mise en place" que pidió el dueño)
}
```

Sin precio de un ingrediente, igual que hoy con `precios.js`: esa línea no suma al
total y se avisa, no se inventa un número (mismo criterio ya usado en Resumen de
Modo Carga).

## Antes de tocar código: preview

Esto es la pieza con más margen de interpretación de las tres (el dueño no la
detalló tanto como Presupuesto/Inventario). Antes de escribir el motor de cálculo:
preview de cómo se vería el recetario, cómo se elige el menú de un evento, y cómo
sale la lista de la compra — con datos de mentira, para validar la forma antes del
cálculo.

## Ficheros a tocar (cuando se apruebe la preview)

- `src/recetario.js` (nuevo) — `costeRacion()`, `listaDeLaCompra()`, puras.
- `src/nube.js` — `ajusteCompartido("indice/recetario", "platos")`, mismo patrón que
  precios/ratios.
- `src/precios.js` o un `preciosIngredientes.js` nuevo — catálogo aparte de
  ingredientes (a decidir en la preview si comparte fichero o va separado).
- `src/App.jsx` / formulario — selector de menú del evento.

## Verificación

- Puras en un `recetario.test.mjs` nuevo: `costeRacion()` con ingredientes de precio
  conocido da el número exacto; sin precio de un ingrediente no rompe, avisa.
- `listaDeLaCompra()` con dos platos que comparten un ingrediente lo suma una vez,
  no dos líneas separadas.
- `npm run test:rapido` en verde antes de cada commit.
