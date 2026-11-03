# Pendientes — Lista corta para retomar (`PENDIENTES.md`)
> Al día: 2026-11-03. Solo QUÉ falta y DE QUIÉN depende. Al cerrar algo, quitarlo en el mismo commit (igual que `CONTEXTO.md`). Repo público: cero datos reales.

## Fuera de esta app (decidido por el dueño, 2026-09-30)
- **Logística del personal (por persona/turnos) y resumen financiero (presupuesto/margen)**: van en otra app del dueño (se unirán más adelante). No planificar ni programar aquí (`PLAN_PRESUPUESTO.md` retirado en `d7b28e7`).
- **Cocina (`PLAN_COCINA.md`) e Inventario (`PLAN_INVENTARIO.md`)**: SÍ van en esta app.

## 0. Mejoras grandes
1. **Cocina (`PLAN_COCINA.md`)**: recetario, escandallo (coste real/ración) y lista de compra. Va primero.
2. **Inventario inteligente (`PLAN_INVENTARIO.md`)**: stock de almacén conectado a la checklist (alquilar/comprar diferencia y caducidades). Material puede empezar ya; ingredientes depende de Cocina.
3. **Auditoría de funcionalidad (PR #231)**: 16 fallos (1 crítico en formulario + varios altos en calendario/checklist). Pendiente de revisión/fusión del dueño.
4. **Sin fecha**: marketing Meta OAuth (A4 v2/v3), gasto global (D2), memoria semántica (D3).

## 1. Código listo para empezar (preguntar orden al dueño)
- **Vajilla y cubertería (`src/checklist-generadores.js`)**: extraer `platosDoble`/`cubiertosDoble` (repetidos en los 3 generadores) a función compartida antes de añadir factor ajustable (`PLAN_MEJORAS.md` A1).

## 2. Esperando decisión del dueño
- **PRs abiertos (PROHIBIDO fusionar sin el dueño)**:
  - `#222`: Modo carga a 320px, plegar "Tiempos estimados".
  - `#231`: Plan de la auditoría de funcionalidad (ver 0.3).
  - `#232` *(seguridad)*: Enlace "para marcar" instalado se abría en modo edición.
  - `#233`: Fantas cortas y calibración de 4 a 8 bebidas.
  - `#237` *(seguridad)*: Calibración de tiempos -20%, HTML ejecutable en PDF y líneas `null`.
- **Modo carga a 320px**: decidir qué plegar por defecto en cabecera (escaleta, cronómetros, "Falta por preparar").
- **Limpieza de datos del calendario (en la app, no en código)**: quedan 19 apuntes en mes equivocado de la importación del 14/9; se borran pegando la lista de IDs en "Pegar una lista de lo que sobra" (lo pulsa el dueño).
- **Dónde mostrar `subconsciente.js`**: módulo hecho y probado, falta decidir en qué pantalla se llama.
- **Unificar o no `aplicar_factor_bebida` y `aplicar_calibracion`**.

## 3. Acción del dueño fuera del código
- **Cloudflare Worker**: configurar par VAPID + `nodejs_compat` (D1) y pegar `worker/pegar.js` actualizado (`worker/README.md`).
- **Visto humano**: revisión visual de las pantallas nuevas que lo requieren.

## 4. Esperando datos reales (no se acelera con código)
- **C1**: coeficientes de niños (medir un evento real antes de fijar número).
- **C2 / C3**: apuntar vuelta de hielo y paella en `>=3` eventos de cada uno.
- **Ratios de cumpleaños y producción**: medir un evento real de cada tipo.
- **Tabla del sector**: validar con un evento de 250 pax y uno de octubre.

## No hacer (ratificado en `PLAN_MEJORAS.md#L375-L397`)
- No partir `App.jsx` ni `index.css`; no añadir librerías de animación; no crear herramienta genérica "modifica cualquier cosa"; no tocar las 3 guardias de Firestore ni los formatos de ID sin migración.
