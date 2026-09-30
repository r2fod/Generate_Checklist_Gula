# Pendientes — la lista corta para retomar

> Al día: 2026-09-30. Aquí solo va QUÉ falta y DE QUIÉN depende; el detalle está en
> lo que se enlaza. Al cerrar algo, se quita de aquí en el mismo commit (igual que
> `CONTEXTO.md`). Repo público: ni nombres, ni importes, ni datos de clientes.

## Fuera de esta app (decidido por el dueño, 2026-09-30)

**La logística del personal y el resumen financiero los lleva otra app del dueño**,
que más adelante quiere juntar con esta. Por eso aquí NO se planifica ni se programa
presupuesto y margen, ni la vista de logística por persona. El plan de presupuesto
(`PLAN_PRESUPUESTO.md`) y el de #221 se quitaron; siguen en el historial de git
(commit `d7b28e7`) por si sirven al juntar las dos apps. **Cocina e inventario SÍ
siguen aquí.**

## 0. Mejoras grandes

1. **Cocina**: recetario, escandallo (coste real por ración) y lista de la compra.
   Ver `PLAN_COCINA.md`. Es la primera de las dos.
2. **Inventario inteligente**: lo que hay en el almacén alimenta la checklist, que
   dice sola cuánto alquilar o comprar, y avisa de caducidades. Ver
   `PLAN_INVENTARIO.md`. La parte de material (carpas, sillas, menaje) puede empezar
   ya; la de ingredientes necesita Cocina.
3. **Auditoría de funcionalidad**: 16 fallos (uno crítico en el formulario y varios
   altos en calendario y checklist) más mejoras de uso. El plan está en el PR #231
   (sección E de `PLAN_MEJORAS.md`), aún sin fusionar.
4. **Sin fecha**: marketing con Meta (A4 v2 y v3), gasto global (D2) y memoria
   semántica (D3).

## 1. Código, listo para empezar (preguntar al dueño el orden)

- **Vajilla y cubertería**: sacar `platosDoble`/`cubiertosDoble`, repetidos en los tres
  generadores de `src/checklist-generadores.js`, a una función compartida antes de
  darles un factor ajustable (`PLAN_MEJORAS.md`, A1).

## 2. Decisión del dueño

- **PR abiertos que esperan su revisión** (ninguno se fusiona sin él):
  - #222: Modo carga a 320px, plegar "Tiempos estimados";
  - #231: plan de la auditoría (ver 0.3);
  - #232 (seguridad): un enlace "para marcar" instalado se abría en modo edición;
  - #233: las Fantas se quedaban cortas, y la calibración pasa de 4 a 8 bebidas;
  - #237 (toca seguridad): calibración de tiempos un 20% corta, HTML que se ejecutaba
    en el PDF y líneas `null`.

  Los de seguridad necesitan revisión humana (`CLAUDE.md`). Los de código llevan
  tiempo abiertos: habrá que traerles `main` y volver a pasar la batería antes.
- **Modo carga a 320px**: la cabecera (escaleta, cronómetros y, desde #245, el
  recuadro "Falta por preparar") tapa el primer ítem. Hay que decidir qué se pliega
  por defecto; #222 propone una parte. Detalle en `CONTEXTO.md`, "Auditoría visual
  móvil…", punto 3.
- **Limpieza de datos del calendario** (en la app, no en el código): unos 29 apuntes
  en el mes equivocado, varios repetidos y dos "Posible…" ya confirmados. ¿Los borra
  él o se le borran? Detalle en `CONTEXTO.md`, "Estado de HOY".
- **Dónde se enseña `subconsciente.js`**: está construido y probado, pero ninguna
  pantalla lo llama.
- **Unificar o no `aplicar_factor_bebida` y `aplicar_calibracion`**: ver
  `PLAN_MEJORAS.md`, "Lo que queda de verdad", 3.
- **Sin fecha**: A4 v2/v3 (Meta, publicar de verdad), D2 (gasto global) y D3
  (memoria semántica).

## 3. Lo que tiene que hacer el dueño fuera del código

- **Cloudflare**: par VAPID + `nodejs_compat` (D1) y volver a pegar `worker/pegar.js`
  si cambió desde la última vez. Paso a paso en `worker/README.md`.
- **Visto humano** de lo nuevo que lo pide (lista en `CONTEXTO.md`): las pruebas no
  bastan para dar por buena una pantalla.

## 4. Esperando datos reales (no se acelera desde el código)

- C1: coeficientes de niños (medir un evento real antes de poner el número).
- C2/C3: marcar la vuelta del hielo y de la paella en ≥3 eventos de cada uno.
- Ratios de cumpleaños y producción: medir un evento de cada uno.
- Tabla del sector: validarla con un evento de 250 pax y uno de octubre.

## No hacer

Ver `PLAN_MEJORAS.md`, "No hacer (ratificado)".
