# Análisis profundo — estado del proyecto

> Fecha: 2026-08-29 · Commit `30c066d` (punta de `arena/01a038bc-…`, 13 commits
> por delante de `main`).
> Supera al análisis de 2026-08-25 (`e5ca4d5`), que se midió antes de ejecutar la
> mayor parte de `PLAN_MEJORAS.md`. Lo de este documento se volvió a correr hoy
> (node 22): `npm ci`, `npm audit`, `npm run lint`, `npm run build`,
> `npm run medir` y la batería rápida (`tipos` + 439 cálculos + 597 asistente +
> build + 221 sincronización, 0 fallos). Lo que NO se volvió a correr lo dice cada
> sección: la batería de navegador (711, ~45 min) pide chromium, que este
> contenedor no puede bajar, y el emulador de reglas pide Java.

## Veredicto general

El plan (`PLAN_MEJORAS.md`) se ha ejecutado hasta donde se puede ejecutar sin los
datos reales del dueño: **A1, A2, A4 (v1 + v2a + v2b), B1–B7, C2, C3 y D1 están
hechos**, cada uno con su prueba y su entrada en CONTEXTO en el mismo commit. Lo que
queda no es código: son datos reales (C1, la validación de la tabla del sector, los
ratios de cumple/producción), aplicaciones que la sesión no puede hacer (B8 en el CI,
las claves VAPID del Worker) y decisiones del dueño (D2, D3, la API de Meta).

| Área | Estado | Resumen en una línea |
|---|---|---|
| Datos sensibles (repo público) | ✅ | Barrido limpio + prueba B7 que lo repite en cada batería; la única clave es la de cliente Firebase (pública por diseño) |
| Rendimiento | ✅ | Medido de nuevo; sin palanca sin medición, como antes |
| Limpieza del código | ✅ | 0 errores de lint; 149 warnings de la casa (`catch (e)` y compañía) — vigilar que la tendencia no sea hacia arriba |
| Duplicación | ✅ | Los tres barridos anti-copias siguen vivos y en verde; la calibración de bebida/hielo/comida comparten la cuenta, no la copian |
| Estructura y escalabilidad | ✅ | Mapa de módulos limpio; 8 módulos puros nuevos del plan, todos testeados con node; `App.jsx` creció 184 líneas y se mantiene la decisión de no partirlo |
| Pruebas y CI | ✅ | 1.257 comprobaciones node en verde; `npm audit` 0 vulnerabilidades (eran 2 HIGH); CI verde en cada push de la rama |

## 0. Qué cambió desde el análisis anterior

El análisis de 2026-08-25 proponía; desde entonces se ha ejecutado casi todo:

- **B1**: `npm audit` de 2 HIGH a **0 vulnerabilidades**; vite/react/lucide/firebase
  subidos dentro del rango. (En `main`, PR anterior.)
- **A1**: `sector.js` + `comparar_con_sector`, la banda del sector como dato con su
  fuente y tono `sin-dato` para lo que no hay número propio. (En `main`, PR
  anterior.)
- **C2 + C3**: la autocalibración se estiró de la bebida al **hielo** y a la
  **comida** (paella y bandejas): `calibracionHielo`/`calibracionComida` reutilizan
  `consumoDeBebida` con matcher, PanelHielo y PanelComida en el Modo carga,
  `indice/hielo` y `indice/comida`.
- **A2**: auditoría de negocio — 4 reglas deterministas en `revision.js`
  (`oportunidadesNegocio`, tono `oportunidad`), herramienta `ver_auditoria`,
  `aplicar_calibracion` que escribe por la misma puerta que el panel, sección
  "Oportunidades" en Cerebro.
- **A4 v1/v2a/v2b**: vista Marketing — `analizar_web` por el Worker (con bloqueo de
  redes privadas y loopback), capturas con visión de Gemini, estrategia guardada en
  `indice/marketing` con saneado (`estrategia.js`), textos listos para copiar y plan
  a tareas con fecha.
- **B2–B7**: frase de "Solo consultar" precisa, búsqueda que no adivina, comentario
  falso corregido, README real, salud de proveedores (`/__salud`), barrido anti-datos
  reales en la batería.
- **D1**: push completo — la app (`push.js` + service worker `gula-v5`) y el Worker
  (`vapidClaves` con la privada como secreto y la pública derivada, exigiendo 32
  bytes exactos; `avisosDelDia` en el cron que ya corre el repaso, TTL de 60 s).
- **Otro hueco pedido** que quedó en el camino: el asistente avisa de las
  actualizaciones y confirma que llegaron (`actualizacion.js` + `cambios.js` en
  `version.json`).

## 1. Datos sensibles y privacidad — el repo es público

El barrido de 2026-08-25 seguía limpio hoy: sin teléfonos, correos, precios de
compra, IPs, `.env` ni URL real del Worker en `src/`, `worker/`, `pruebas/` ni los
ficheros nuevos (la tabla del sector de `sector.js` cita fuentes públicas sin datos
propios; el README del Worker usa una `mailto:` inventada). La única credencial del
bundle es la clave pública de cliente de Firebase, correcta por diseño.

Y la diferencia de este análisis: **el barrido ya no depende de que alguien se
acuerde** — la prueba B7 lo repite en cada batería (teléfonos españoles reales,
correos fuera de la lista de ficticios, `PRECIOS_BASE` ausente del código) y sale en
verde.

**Veredicto: verde.**

## 2. Rendimiento — medido de nuevo, no a ojo

**Cuentas puras (`npm run medir`, node 22):**

| Apuntes | Una pintada entera del mes |
|---|---|
| 250 | ~3,7 ms (sanea 0,77 · porDia 0,47 · próximos 0,20 · choques 0,33 · rejilla 1,89) |
| 500 | ~7,3 ms |

Misma conclusión que antes: la aritmética no es el problema, lo es React pintando —
y eso sigue sin medirse (el plan B8 lo pone en CI, pendiente de aplicar).

**Build (`npm run build`), tamaños de hoy:**

| Trozo | Sin comprimir | Gzip | Cuándo se descarga |
|---|---|---|---|
| `index.esm` (Firebase/Firestore) | 554,9 kB | 162 kB | Solo al usar la nube (perezoso) |
| `users` (lucide-react) | 198,9 kB | 63,8 kB | Inicial |
| `checklist` (la app) | 131,2 kB | **40,2 kB** | Inicial |
| `index.esm` (React + compartido) | 126,7 kB | 36,1 kB | Inicial |
| CSS principal | 134,8 kB | 24,5 kB | Inicial |
| `Asistente` | 117,8 kB | **38 kB** | Perezoso, precargado en el rato muerto |

Los dos crecimientos respecto al análisis anterior son el trabajo del plan: la app
+1,2 kB gzip (A2, C2, C3) y el asistente +5 kB gzip (marketing, visión, estrategia).
Los pesos de siempre (iconos, SDK de Firestore) no se movieron.

**Sin palanca sin medición:** siguen en pie las dos decisiones documentadas de no
tocar los pesos iniciales; el aviso del build sobre el chunk de 500 kB es el SDK de
Firestore, ya verificado.

## 3. Limpieza del código

- **Lint (oxlint, 129 ficheros): 0 errores, 149 warnings.** La subida (116 → 126 →
  149) va con el código nuevo del plan, casi toda de la casa (`catch (e)`
  documentado en CONTEXTO). La regla es la de siempre: 0 errores, y vigilar que los
  avisos no crezcan más rápido que el código.
- **Tipos:** `tsc -p jsconfig.json` en verde (módulos puros con JSDoc).
- **`App.jsx` (4.541) e `index.css` (7.883):** decisión documentada de no partirlos,
  que se mantiene: la sesión creció 184 y 78 líneas con 5 funcionalidades, y el
  camino perezoso ya existe si algún día hiciera falta.

## 4. Duplicación

Los tres barridos anti-copias recorren `src/` en cada batería y salen en verde. La
pieza más delicada de la sesión —calibrar bebida, hielo y comida con el mismo
patrón— lo hizo bien: las tres comparten `consumoDeBebida` (que aprendió a aceptar
un matcher para etiquetas dinámicas como "Paella <talla>"), `mediana` y
`redondeaFactor`, y cada función se diferencia en su lógica de dominios, no en una
copia pegada.

## 5. Estructura y escalabilidad

- **Un sitio por preocupación**, ahora con ocho módulos puros nuevos del plan, todos
  testeados con node y sin React ni nube: `sector.js`, `estrategia.js`, `push.js`,
  `comida.js`, `actualizacion.js`, `avisosConfig.js`, `conectores/marketing.js`,
  `escrituraAjustes.js` (que se encadena con los demás aplicadores por
  `encadenar()`, como corresponde).
- **El Worker creció con cabeza**: 7 rutas (`__estado`, `__repaso`, `__salud`,
  `__analizar`, `__vision`, `__vapid`, `__voz`), todas con sesión salvo el
  diagnóstico que no enseña nada. `pegar.js` empaqueta `web-push` con rolldown como
  `revision.js` (45,8 kB) y el CI lo compara byte a byte contra su fuente.
- **Las reglas no se tocaron**: `marketing`, `comida`, `hielo`, `push-*` y todo lo
  nuevo viven en `indice/{doc}`, que ya lo cubre con sesión.
- **Límites de escala conocidos** (mismos que antes, con motivo): el estado en
  `App.jsx`; memoria sin embeddings (D3 cuando se note); gasto por aparato (D2 si se
  quiere); enrutado por listas de palabras.

## 6. Pruebas y CI

- **En verde hoy:** 439 (cálculos) + 597 (asistente) + 221 (sincronización) =
  **1.257 comprobaciones node**, más `tipos` y `build`. Las sumas crecieron 184
  comprobaciones desde el análisis anterior: una prueba por comportamiento, como
  manda la casa. (CONTEXTO apunta 711 de navegador, ~45 min, y 28 de reglas contra
  el motor real: no se volvió a correr en este análisis — el navegador pide chromium,
  que este contenedor no puede bajar, y el emulador pide Java.)
- **CI:** igual que antes — `test.yml` en cada push/PR (lint + rápidas + que
  `pegar.js` no se separe + reglas contra el emulador + navegador de noche) y
  `deploy.yml` que no publica en rojo. Verde en cada push de la rama.
- **Dependencias:** `npm audit` **0 vulnerabilidades** (eran 2 HIGH, ambos solo de
  build; B1 los quitó).
- **B8 (línea base de pintado en CI):** el cambio está listo y documentado en
  CONTEXTO, pero la App de la sesión no tiene permiso `workflows`: lo aplica el
  dueño desde la web de GitHub.

## 7. Lo que NO se toca (decisiones ratificadas)

Igual que en el análisis anterior: no partir `App.jsx`/`index.css`; ningún
`useMemo`/`useCallback` sin medición delante; sin librerías de animación; no
Tinyflows; no partir el CSS; no tipar `App.jsx` de golpe; no tocar las tres guardias
ni las identidades `categoría::etiqueta`/`fecha_slug`. Este documento no propone
saltarse ninguna de ellas.

## 8. Lo que queda (ver PLAN_MEJORAS.md y CONTEXTO.md)

- **Del dueño, aplicaciones**: B8 en `test.yml`; el par VAPID + la flag
  `nodejs_compat` en el Worker (paso a paso en `worker/README.md`); la batería de
  navegador (711) contra la rama; el visto humano de PanelHielo/PanelComida/
  Oportunidades.
- **Del dueño, datos reales**: C1 (coeficientes de niños), los ratios de
  cumpleaños/producción, la validación de la tabla del sector contra los números de
  la casa, el evento de 250 pax y el del 9–10 de octubre, y marcar la vuelta en 3
  eventos para que C2/C3 pasen de mecánica a número.
- **Futuro, con decisión**: la API de Meta (A4 v2, la parte que faltó: métricas
  oficiales del Instagram de la empresa), publicar de verdad vía OAuth (A4 v3, sin
  fecha), gasto global (D2, "solo si se quiere"), memoria semántica (D3, solo
  cuando se note).
