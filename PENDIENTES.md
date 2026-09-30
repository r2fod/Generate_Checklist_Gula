# Pendientes — la lista corta para retomar

> Al día: 2026-09-30. Aquí solo va QUÉ falta y DE QUIÉN depende; el detalle está en
> lo que se enlaza. Al cerrar algo, se quita de aquí en el mismo commit (igual que
> `CONTEXTO.md`). Repo público: ni nombres, ni importes, ni datos de clientes.

## 1. Código, listo para empezar (preguntar al dueño el orden)

- **Presupuesto y margen por evento**: el diseño ya está fijado en
  `PLAN_PRESUPUESTO.md`; es la fase 1 de `PLAN_COCINA.md` (y luego
  `PLAN_INVENTARIO.md`, en ese orden).
- **Plan de logística por persona, con el asistente**: sin plan escrito todavía. De
  partida, la hora de cada apunte del calendario (`hora` en `saneaApunte`,
  `src/calendario/apuntes.js`) y el dato medido "sala entra 6 h antes de sentar".
- **Vajilla y cubertería**: sacar `platosDoble`/`cubiertosDoble`, repetidos en los tres
  generadores de `src/checklist-generadores.js`, a una función compartida antes de
  darles un factor ajustable (`PLAN_MEJORAS.md`, A1).

## 2. Decisión del dueño

- **PR abiertos #221, #222, #231 y #232**: no se fusionan sin él. #232 es de
  seguridad y necesita revisión humana (`CLAUDE.md`).
- **Modo carga a 320px**: la cabecera (escaleta, cronómetros y, desde #245, el
  recuadro "Falta por preparar") tapa el primer ítem. Hay que decidir qué se pliega
  por defecto. Detalle en `CONTEXTO.md`, "Auditoría visual móvil…", punto 3.
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
