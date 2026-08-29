# Auditoría del proyecto — fichero a fichero

> Fecha: 2026-08-29 · Commit `3390fe7` (punta de `arena/01a038bc-…`).
> 145 ficheros en `src/`, `worker/`, `pruebas/`, `public/` y `.github/`, barridos
> todos: lectura completa de los ~30 núcleos (el bucle del asistente, las reglas de
> negocio, la nube, el Worker, los tests) y cabecera + API del resto.
>
> Este documento no sustituye a `ANALISIS.md` (estado y cifras medidas): es el
> inventario por fichero, los hallazgos concretos con su severidad, los riesgos con
> su mitigación y las recomendaciones priorizadas.

## Método

1. Inventario completo de los 145 ficheros con líneas y cabecera.
2. Lectura completa de los núcleos: `worker/index.js`, `cliente.js`,
   `herramientas.js`, `revision.js`, `calibracion.js`, `sector.js`, `nube.js` (API),
   `calculos.js`/`bebida.js`/`personal.js` (cabeceras y exports), los cinco
   conectores, la batería de tests y los dos workflows.
3. Barridos transversales automáticos: nombres exportados duplicados, exports sin
   uso, TODO/FIXME/HACK, `console.*` fuera de los justificados, patrones de datos
   sensibles, librerías de animaciones, y cumplimiento de las prohibiciones de
   `CLAUDE.md`.

## Inventario por área

### Raíz — configuración y documentación (9)

| Fichero | Líneas | Qué hace |
|---|---|---|
| `package.json` | 44 | 5 dependencias en runtime (react, firebase, lucide, web-push) y 11 de build/pruebas. Guiones: `test`, `test:rapido`, `tipos`, `medir`, `worker:build`, `reglas:*` |
| `vite.config.js` | 67 | BUILD_ID en el bundle + `version.json` con la entrada más reciente de `cambios.js`, y la lista de ficheros de la compilación para el service worker |
| `jsconfig.json` | 47 | `tsc --checkJs` solo sobre los módulos puros (tipado gradual, no migración) |
| `.oxlintrc.json` | 8 | Lint de la casa (`catch (e)` y compañía permitidos con motivo) |
| `firebase.json` | 10 | Emulador + reglas |
| `firestore.rules` | 108 | La única puerta de datos: `indice/{doc}` con sesión, eventos por id con link, `envios` por código, y "todo lo demás denegado" al final (probado que sigue ahí) |
| `.gitignore` | 29 | Con el comentario "nunca al repositorio, que es público" |
| `ANALISIS.md` / `CONTEXTO.md` / `CLAUDE.md` / `PLAN_MEJORAS.md` / `README.md` | 2.308 | Estado medido · memoria viva del proyecto · reglas de la casa · el plan · README para humanos |

### `src/` — núcleo de la app (33)

| Fichero | Líneas | Qué hace |
|---|---|---|
| `App.jsx` | 4541 | TODO el estado de la checklist. Decisión documentada de no partirlo; creció 184 líneas con 5 funcionalidades de la sesión |
| `main.jsx` / `Acceso.jsx` / `PuertaSesion.jsx` | 316 | Punto de entrada; la puerta de sesión vive separada a propósito para que el calendario no se lleve la checklist en su bundle |
| `RedDeSeguridad.jsx` | 86 | Error boundary: convierte "pantalla en blanco" en algo con salida (descargar lo guardado, ver el diario) |
| `estado.js` | 85 | Sanea el estado que entra de los 3 sitios no controlados (navegador, `?c=` manipulado, nube) — pasó de verdad y está documentado |
| `diario.js` | 161 | Rastro sin nombres de lo que va mal, para pegarlo en el WhatsApp del equipo |
| `almacen.js` | 74 | El `localStorage` con try/catch, en un solo sitio (eran 13 copias; el fichero explica por qué se unificó) |
| `fecha.js` | 43 | UNA sola `hoyISO()` local — las fechas de esta app son días de calendario, no instantes UTC |
| `texto.js` | 44 | `sinTildes` y `limpia`/`clave` en un solo sitio (eran 4-5 copias que ya se estaban separando) |
| `auth.js` / `firebase.js` / `firestore.js` / `firebaseConfig.js` | 192 | Auth del equipo; el SDK se carga con `import()` solo si hay config; `getDb` en un solo sitio (estaba duplicado y empezando a separarse) |
| `nube.js` | 541 | La ÚNICA puerta a Firestore: archivo de eventos (documento por evento), la fábrica `ajusteCompartido` (precios, ratios, bebida, hielo, comida, marketing), suscripciones de push |
| `sincronizacion-eventos.js` | 21 | Aplicar al evento ABIERTO lo que cambió en la nube (sin esto gana la última en guardar, en silencio) |
| `calculos.js` | 434 | Los números de bebida y cristalería, puros y probados con node (los fallos de aquí costaron levantar un navegador entero por comprobación, antes) |
| `bebida.js` | 166 | Ratios por tipo de evento; todos los factores arrancan en 1: mientras nadie haya medido, no se inventa |
| `comida.js` | 124 | El hermano de bebida.js para paella y bandejas, mismo patrón |
| `calibracion.js` | 313 | La cuenta "lo cargado − lo vuelto" para bebida, hielo y comida (compartida, no copiada) + huecos del catálogo |
| `personal.js` | 211 | Cuánta gente hace falta — de contar el personal real de 19 eventos, no de manuales (documentado por qué los del sector se quedaban cortos) |
| `paella.js` | 50 | Cuántas paelleras y de qué talla; lo usan las dos puntas (checklist y formulario) |
| `checklist-generadores.js` | 927 | La lógica pura que construye la checklist de cada tipo; determinista y probada |
| `checklist-format.js` | 291 | Formateo y constantes de las checklists (incluida la identidad `categoría::etiqueta`) |
| `alquileres.js` / `carpas.js` / `mesas.js` / `manteles.js` / `menus-especiales.js` | 362 | Cada cosa que "las dos puntas" necesitan decidir: catálogo, reparto, cuentas. Cada uno con su porqué |
| `tiempos-carga.js` | 53 | Estimación de prep/carga/descarga/montaje, compartida con el formulario |
| `escaleta.js` | 125 | La línea de tiempo del día (¿a qué hora salimos del obrador?) — antes estaba repartida por cinco sitios |
| `precios.js` | 52 | El catálogo de precios VIVE SOLO en Firestore (los 53 de partida se migraron: repo público); aquí queda la puerta |
| `cambios.js` | 34 | Qué ha cambiado, en el idioma de quien carga el camión; la entrada más reciente va en `version.json` |
| `tema.js` | 36 | Claro/oscuro por hora del día (jornada de catering: a las 20:00 ya es artificial) |
| `precarga.js` | 53 | El panel del asistente se trae en el rato muerto, no cuando el dedo ya está en el botón |

### `src/asistente/` — el asistente (39 + 5 conectores)

| Fichero | Líneas | Qué hace |
|---|---|---|
| `cliente.js` | 253 | El bucle (máx. 6 vueltas): el Worker contesta, las herramientas se ejecutan AQUÍ con los datos de la app, el modelo nunca ve Firestore. Tope duro, diario de tokens, barrera de datos por proveedor |
| `herramientas.js` | 765 | 22 herramientas de la casa, cada una con su descripción para el modelo; las de escribir con `escribe: true` |
| `permisos.js` | 88 | Los tres niveles (consultar/permiso/confianza) y la lista `NUNCA` de 8 herramientas prohibidas en todos |
| `conectores.js` | 67 | El registro: un conector declara sus herramientas y se registra; añadir el correo el mes que viene es escribir un fichero |
| `conectores/whatsapp.js` | 82 | Redacta el mensaje del grupo con las mismas cuentas que la escaleta. NO manda nada solo |
| `conectores/correo.js` | 53 | Apagado por diseño: sin OAuth de Google no hay herramienta para el modelo (el fichero documenta qué falta para encenderlo) |
| `conectores/calendario.js` | 151 | Apuntes del calendario, `escribe: true`, se enciende solo donde tiene sentido |
| `conectores/checklists.js` | 81 | Crear checklists (no editar ni borrar: dentro está el trabajo de quien carga) |
| `conectores/marketing.js` | 142 | `analizar_web`, `analizar_captura` (visión), `ver_estrategia`/`guardar_estrategia` |
| `memoria.js` | 231 | Memoria en TEXTO legible y corregible, no vectores opacos ("un cerebro que no puedes abrir es un cerebro en el que no puedes confiar") |
| `arbol.js` | 206 | El SuperContext: pliega la memoria por fuente/tema/día y rastrea lo que de verdad tiene que ver con ESTA pregunta |
| `objetivos.js` / `tareas.js` | 241 | Lo que le importa al equipo ahora / lo apuntado por hacer. En la nube porque son del equipo |
| `enrutado.js` | 113 | Qué proveedor según qué pregunta (datos de clientes fuera de los que entrenan con ellos) y qué reintentar |
| `comprimir.js` | 100 | Comprime la salida de las herramientas antes de entrar a la conversación (una checklist de boda pedida 3 veces no se paga 3 veces) |
| `gasto.js` | 175 | El contador de tokens por mes, en el navegador a propósito (no sube un contador por pregunta) |
| `conversaciones.js` | 106 | Las charlas viven en el navegador: una conversación es de quien la tuvo |
| `contexto.js` | 113 | La única puerta por la que cada app le dice al asistente lo que hay a mano |
| `personalidad.js` | 51 | El tono, sin tocar números, alergias, errores ni permisos |
| `gestos.js` | 76 | Cada herramienta → un gesto y una frase en la cara (buscar y borrar no son lo mismo) |
| `subconsciente.js` | 167 | El parte al abrir, determinista, instantáneo, sin token ni conexión |
| `avisosConfig.js` | 117 | Lo que falta por configurar, en la misma forma que el repaso |
| `proxy.js` | 29 | La decisión de dónde vive la URL del Worker (arregló la trampa de "solo subía al teclearla") |
| `push.js` | 44 | Id del aparato, clave pública VAPID en bytes, validación de suscripción (D1a) |
| `estrategia.js` | 42 | Sanea lo que el modelo propone para que salga una estrategia con forma, o null (A4 v2b) |
| `sector.js` | 109 | La tabla del sector como dato con su fuente + `compararRatios` con tono `sin-dato` (A1) |
| `escrituraTareas/Checklists/Calendario/Ajustes.js` | 163 | Los cuatro aplicadores de `onEscribir`, encadenados: la herramienta no sabe cómo se guarda un ajuste |
| `actualizacion.js` | 47 | Confirmar que la actualización llegó (el banner no lo dijo nunca) |
| `voz.js` / `vozGemini.js` | 265 | Voz del navegador (0 tokens, sin conexión) + 8 voces curadas de Gemini con la lista compartida con el Worker |
| `suscripcionDiferida.js` | 53 | Las 4 suscripciones que no pinta la primera pantalla esperan al rato muerto |
| `Asistente.jsx` | 1104 | La pantalla: debajo de cada respuesta dice QUÉ herramientas se usaron; si el proxy no está, explica cómo en vez de fallar |
| `Humano.jsx` | 489 | La pestaña de voz: dictar y oír con el móvil en una mano y una caja en la otra |
| `Cerebro.jsx` | 294 | Cuatro vistas del árbol (temas, fuentes, días, grafo) — el cerebro legible |
| `Grafo.jsx` | 158 | Grafo de fuerzas en SVG puro, sin librería |
| `Companero.jsx` / `Jarvis.jsx` | 257 | El dibujo: cinco compañeros en SVG a mano (cientos de bytes) + el aro tipo HUD |
| `BotonAsistente.jsx` | 177 | La burbuja flotante que se monta con una línea en cada app |

### `src/calendario/` — la app del mes (12)

| Fichero | Líneas | Qué hace |
|---|---|---|
| `Calendario.jsx` | 742 | Año/Mes/Semana, la rejilla y los avisos |
| `apuntes.js` | 430 | La cuenta pura del calendario (lo que mide `medir.mjs`): sanea, porDia, choques, rejilla |
| `useCalendarioNube.js` | 131 | Las trae y las guarda; lo usan las dos vidas del calendario (app suelta y dentro de la checklist) |
| `enlace.js` | 83 | VER (copia, sin poder tocar) y ESCRIBIR (con sesión): dos botones, dos permisos |
| `Compartir.jsx` / `Equipo.jsx` / `Ratios.jsx` / `Traer.jsx` | 378 | Los paneles: compartir, equipo del evento, ratios de personal, y el empujón de "traer de Google" |
| `main.jsx` / `EnChecklist.jsx` / `prueba.jsx` | 426 | La entrada suelta; la vista dentro de la checklist (perezosa); y el banco de pruebas sin nube ni login |
| `calendario.css` | 1565 | El CSS de la app del mes |

### `src/formulario/` — la bandeja de oficina (10)

| Fichero | Líneas | Qué hace |
|---|---|---|
| `Formulario.jsx` | 871 | Una pregunta por pantalla, botón "No lo sé"; NO calcula nada, solo recoge y traduce a los campos de siempre |
| `preguntas.js` | 853 | Las preguntas por tipo de evento; el formulario las traduce sin que la checklist se entere |
| `envios.js` | 207 | La bandeja: se lee por código (sin él ni siquiera se puede listar), la fecha la pone el servidor, y corregir solo mientras no se ha revisado |
| `codigo.js` | 56 | El código por evento, con la trampa del iOS documentada (una app añadida a la pantalla de inicio estrena almacén vacío) |
| `archivos.js` | 99 | Las fotos se encogen en el móvil antes de subir (3-5 MB → 200-400 KB) porque un documento de Firestore no pasa de 1 MiB |
| `instalar.js` | 81 | Instalar el formulario en la pantalla de inicio, con la trampa de WhatsApp documentada (el botón de Compartir es el de WhatsApp) |
| `mios.js` | 50 | La lista de "los míos" en el navegador, a propósito (darle a la oficina permiso para listarlos sería enseñarle los de las demás) |
| `CampoArchivo.jsx` / `FondoIconos.jsx` / `main.jsx` | 275 | El estado de la foto; el fondo con iconos; la entrada por código |

### `src/components/` — los trozos de la checklist (16)

| Fichero | Líneas | Qué hace |
|---|---|---|
| `ModalModoCarga.jsx` | 741 | El Modo carga: marcas, vuelva, cronómetro, escaleta y los paneles |
| `ModalFormularioOficina.jsx` | 211 | La bandeja dentro de la checklist: repartir envíos y avisos |
| `ModalAgregarItems.jsx` | 142 | Pegar líneas y se interpretan ("nombre cantidad"), comparando para no duplicar |
| `ModalVistaPrevia.jsx` / `ModalRecalcular.jsx` | 170 | La vista previa; y las decisiones al recalcular (mantener vs. aplicar, una a una) |
| `PanelBebida.jsx` / `PanelHielo.jsx` / `PanelComida.jsx` | 370 | Los tres paneles de ajuste: el multiplicador se hace donde se ve el dato que lo justifica |
| `Escaleta.jsx` | 73 | La línea de tiempo plegada: a qué hora TOCABA y cuánto se tardó de verdad |
| `FilaItem.jsx` | 154 | Una fila de la lista, `React.memo` por una razón medida |
| `Iconos.jsx` | 95 | Icono + color pastel por categoría |
| `SelectConOtro.jsx` | 102 | "+ Otro..." con las opciones en el navegador (de comodidad, no de datos) |
| `Dialogo.jsx` / `ListaColapsable.jsx` / `SegmentedControl.jsx` / `CargandoPanel.jsx` | 99 | El diálogo propio (prompt/confirm rompen la estética); colapsar; los controles; y la espera con estilos en línea a propósito |

### `src/__tests__/` + `pruebas/` — la red (7)

| Fichero | Comprobaciones | Qué cubre |
|---|---|---|
| `calculos.test.mjs` | 439 | Los números del camión, más los tres barridos anti-duplicación sobre `src/` |
| `asistente.test.mjs` | 597 | El asistente entero: bucle, permisos, NUNCA, memoria, enrutado, conectores, y el push del Worker (`tareasParaPush`, `payloadDeRecordatorio`, `vapidClaves`) |
| `sincronizacion.test.mjs` | 221 | Móvil con todo y PC con lo viejo (y al revés), sin sesión, y el simulado de reglas contra `firestore.rules` |
| `firestore-simulado.mjs` | — | El Firestore en JavaScript para los tests sin red (el simulado que las pruebas reescriben; por eso las reglas van TAMBIÉN al emulador real) |
| `app.test.mjs` | 711 | La app entera en chromium: 5 tipos × 9 anchos × 2 temas, Modo carga, exportaciones, casos límite, la app instalada y su service worker |
| `pruebas/medir.mjs` | — | "Medir antes de tocar": la cuenta pura del calendario (12/200/250/500 apuntes) y el navegador si hay chromium |
| `pruebas/reglas.test.mjs` | 28 | Las MISMAS reglas que se despliegan, contra el motor real de Google (pide Java) |

### `public/` — las tres PWAs (12)

| Fichero | Qué hace |
|---|---|
| `sw.js` (146) | Cache por tipo de recurso: `version.json` nunca en caché (si no, no se detecta la versión nueva), HTML red-primero, assets con hash para siempre. Cubre las tres apps desde la raíz |
| `index.html` + `manifest.webmanifest` | El desvío raíz: un manifiesto heredero SOLO para las checklists instaladas en la raíz vieja (mismo `id` → se mudan solas) |
| `checklist/`, `formulario/`, `calendario/` (3 manifests) | Tres ámbitos hermanos (no anidados: una app dentro del ámbito de otra no se puede instalar aparte) |
| iconos y favicon | 192/512/maskable + SVG |

### `worker/` — el proxy (4)

| Fichero | Líneas | Qué hace |
|---|---|---|
| `index.js` | 912 | El proxy del modelo (4 proveedores, 3 claves de Gemini con rotación en 429) + 7 rutas con sesión: `__estado` (diagnóstico sin datos), `__repaso` (a mano), `__salud` (ping por proveedor), `__analizar` (webs, con bloqueo de redes privadas/loopback), `__vision` (capturas), `__vapid` (la pública derivada de la privada, 32 bytes exactos), `__voz` (TTS) + el cron: repaso de la noche y `avisosDelDia` (push, TTL 60 s) |
| `repaso.js` | 210 | El repaso en sí: `revision.js` empaquetada + Firestore por REST + el techo de 1 MiB con `avisoDePeso` |
| `pegar.js` | 1237 | Lo que se pega en Cloudflare; el CI lo regenera y lo compara byte a byte contra la fuente |
| `README.md` | 181 | El paso a paso completo, incluido el par VAPID y la única casilla a mano (`nodejs_compat`) |

### `.github/workflows/` — el CI (2)

| Fichero | Qué hace |
|---|---|
| `test.yml` | 4 trabajos: rápidas (lint + test:rapido), `pegar.js` regenerado, reglas contra el emulador (Java), y el navegador de ~45 min SOLO de noche o a mano (con `concurrency` que cancela el push anterior) |
| `deploy.yml` | No publica en rojo: `publicar` necesita la batería ENTERA pasada; sube a `gh-pages` con la BUILD_ID visible |

## Hallazgos

### ✅ Lo que aguanta bien un repaso fichero a fichero

1. **Cada fichero empieza explicando el porqué, no el qué** — y explica los fallos que ya pasaron (el `?c=` que tumbaba la app, la URL del Worker que no subía, el iPhone con "Falta el enlace", los dos `getDb` que empezaban a separarse). La documentación no es un extra: es el comentario.
2. **La deduplicación es historia, no aspiración**: `fecha` (7 copias → 1), `texto` (4-5 → 1), `almacen` (13 try/catch → 1), `getDb` (2 → 1), los paneles de calibración (3 áreas, 1 cuenta). Y hay 3 pruebas que recorren `src/` y fallan si algo vuelve a copiarse.
3. **Las identidades intocables están resguardadas**: `categoría::etiqueta` y `fecha_slug` documentadas como lo que se respeta antes que nada, y la lista `NUNCA` del asistente las cubre desde el otro lado.
4. **El asistente no puede mentir con los números**: la regla va en el mensaje de sistema, los proveedores que entrenan con tus datos no reciben herramientas con datos de clientes, los resultados se comprimen pero no se inventan, y la UI enseña debajo de cada respuesta qué herramienta lo dijo.
5. **La seguridad del repo público está cerrada por la batería, no por la memoria** (B7): teléfonos reales, correos fuera de la lista de ficticios y `PRECIOS_BASE` ausente fallan el suite.

### ⚠️ Hallazgos nuevos de esta auditoría

| # | Severidad | Fichero | Hallazgo |
|---|---|---|---|
| 1 | P2 (código muerto) | `conversaciones.js:88`, `cliente.js:98`, `conectores.js:67` | Tres exports sin uso en todo el árbol: `borrarTodas`, `nuevaConversacion` (Asistente.jsx no la importa) y `olvidarConectores` (dice "solo para las pruebas" y ninguna prueba lo usa). **Hecho:** eliminados en la limpieza P2 (el import huérfano de `borrar` en conversaciones.js también). Ojo: `leerFoto`/`guardarFoto` de `subconsciente.js`, que este mismo barrido marcó como sin uso, se quedaron — son la pieza de persistencia que falta para cablear el módulo (ver hallazgo 8) |
| 2 | P2 (naming) | `preguntas.js:837` vs `personal.js:204`; `arbol.js:59` vs `apuntes.js:180` | Dos nombres con dos significados: `loQueFalta` (lo que falta del formulario / lo que falta de personal) y `porDia` (agrupar memoria / agrupar apuntes). No hay conflicto real (se importan por nombre en su dominio), pero el mismo nombre para dos cosas distintas es justo lo que el barrido anti-duplicación no caza y lo que hace que quien busque "loQueFalta" encuentre primero la otra. **Hecho:** `loQueFalta` → `respuestasQueFaltan` (formulario) y `personalQueFalta` (personal); `porDia` → `memoriaPorDia` (árbol de la memoria). El de apuntes.js se queda: es el que mide `medir.mjs` y el de toda la cuenta del calendario |
| 3 | P2 (tendencia) | todo `src/` | Warnings de lint 116 → 126 → 149 entre el análisis de agosto y hoy: todos de la casa, 0 errores, pero el comentario de CONTEXTO dice "vigilar que no siga creciendo" y lleva creciendo tres veces |
| 4 | P3 (estilo) | 16 ficheros | Sin la cabecera `// ─── TÍTULO ───` de la casa en las 3 primeras líneas (los 10 componentes de `components/`, `App.jsx`, `main.jsx`, `calibracion.js`, `checklist-format.js`, `tiempos-carga.js` — varios llevan la sección más abajo). Cosmético, pero es la única regla de estilo que no está al 100 % |
| 5 | P1 (verificación) | la rama entera | La batería de navegador (711) no ha corrido contra esta rama: solo `test:rapido`. Es la verificación pre-fusión que falta, y este contenedor no la puede correr (no puede bajar chromium) |
| 6 | P1 (aplicación) | `test.yml` | B8 sin aplicar por el dueño (la App de la sesión no tiene permiso `workflows`): sin el número de pintado, ninguna optimización futura de React es medible |
| 7 | P1 (datos) | `sector.js` | La tabla del sector sigue marcada **SIN validar** contra los números de verdad del equipo (la paella, la más floja: 30-35 es una primera estimación de 150-200 g de arroz, no una medición) |
| 8 | P1 (módulo sin cablear) | `subconsciente.js` (167 l) | Refina el hallazgo 1: el problema no eran dos exports sueltos — **todo el módulo** (`parte`, `foto`, `queHaCambiado`, `comoVanLosObjetivos`) está construido y probado, pero ninguna pantalla llama a `parte()`. CONTEXTO lo documentaba como "repaso al abrir", y lo que de verdad mira al abrir es `avisosConfig.js`. No se borra (es código probado y con diseño pensado) ni se cablea a ciegas (cablearlo es un cambio visual y `CLAUDE.md` manda captura): queda documentado en CONTEXTO ("Pendiente" 4) con la decisión que falta — dónde se enseña |

### Riesgos conocidos y su mitigación (verificados, no inventados)

| Riesgo | Mitigación en el código |
|---|---|
| Un documento de Firestore pasa de 1 MiB y la escritura falla | `TECHO_DOCUMENTO` + `avisoDePeso` en `repaso.js`; las fotos del formulario se encogen antes de subir (`archivos.js`); el simulado de sincronización cubre el caso |
| Un estado corrupto deja la app en blanco y al recargar vuelve a reventar | `estado.js` sanea la entrada + `RedDeSeguridad.jsx` da salida (descargar lo guardado, diario para copiar) |
| El modelo pide una herramienta que no debe | `permisos.js` + la lista `NUNCA` + el filtro `datos: true` por proveedor + el Worker que no ejecuta nada |
| `?c=` o un enlace manipulado | `estado.js` descarta lo que no encaja; pasó de verdad y la prueba lo recuerda |
| El navegador no tiene localStorage (Safari privado) | `almacen.js` lo envuelve todo y dice "si no se puede, da igual" |
| La app instalada se queda con el ámbito viejo | El manifiesto heredero de la raíz con el MISMO `id` (documentado en `index.html`) |
| El Worker se separa de su fuente | El CI regenera `pegar.js` y falla si hay diferencia, byte a byte |
| Una clave VAPID truncada "funciona" con una clave distinta | `vapidClaves` exige 32 bytes exactos y el fallo dice con qué se arregla (esta sesión) |
| El SDK de Firestore (555 kB) en el inicial de todo el mundo | `import()` dinámico: solo quien toca la nube lo descarga |

## Recomendaciones priorizadas

**P0 — antes de fusionar (del dueño):**
1. La batería de navegador (711) contra la rama — es la verificación que falta y ninguna otra la sustituye.
2. B8 en `test.yml` (las tres líneas ya están escritas en CONTEXTO): sin ese número, "¿va más lento que antes?" no es una pregunta que se pueda responder.

**P1 — para que lo hecho funcione de verdad (del dueño):**
3. El par VAPID + `VAPID_MAILTO` + la flag `nodejs_compat` en el Worker (paso a paso en `worker/README.md`); sin eso D1 no empuja nada.
4. Validar la tabla del sector con los números de la casa — sobre todo la paella (30-35 es estimación, no medición) — y los ratios de cumple/producción.
5. El evento de 250 pax, el del 9-10 de octubre, y marcar la vuelta en 3 eventos (bebida, hielo, paella) para que C2/C3 pasen de mecánica a número.
6. El visto humano de PanelHielo/PanelComida/"Oportunidades" (la regla de la captura).

**P2 — pasada de limpieza (hecha la del 2026-08-29 salvo el 9):**
7. ~~Borrar o cablear los 4 exports muertos (hallazgo 1).~~ Hecho: 3 eliminados; `leerFoto`/`guardarFoto` se quedan como pieza de cableado del hallazgo 8.
8. ~~Renombrar uno de cada pareja de nombres dobles (hallazgo 2).~~ Hecho: `respuestasQueFaltan`, `personalQueFalta`, `memoriaPorDia`.
9. Una pasada de `catch (e)` para que los warnings dejen de crecer (hallazgo 3).

**P3 — cosmético / a plazos:**
10. Cabeceras a los 16 ficheros que las faltan (hallazgo 4).
11. La API de Meta (A4 v2, la parte que faltó): es el siguiente gran trozo de negocio, no una mejora.
12. C1 (niños), D2 (gasto global), D3 (memoria semántica): con sus condiciones ya puestas en el plan.

## Cumplimiento de las prohibiciones (CLAUDE.md)

| Prohibición / regla | Estado |
|---|---|
| No partir `App.jsx` / `index.css` | ✅ Respetado (4.541 / 7.883 líneas, decisión vigente) |
| Datos reales en el repo público | ✅ Barrido limpio + prueba B7 en cada batería |
| Cambiar identidades sin migración | ✅ `categoría::etiqueta` y `fecha_slug` intactos, resguardados por la lista `NUNCA` |
| `useMemo`/`useCallback` sin medición | ✅ Los que hay (`FilaItem` memo, `useDeferredValue` en App) llevan la medición en su comentario |
| Librerías de animaciones | ✅ Ninguna en `package.json` |
| `CONTEXTO.md` en el mismo commit | ✅ En 12 de los 14 commits de la rama. Los dos sin él se explican: `CLAUDE.md` (6fe7ba7) es solo la regla, sin código, y el de D1a (5f1b9db) se quedó a medio entregar — su entrada de CONTEXTO llegó en el commit siguiente, D1b (30c066d), que documenta las dos mitades a la vez |
| Todo nuevo con sus tests | ✅ Los 8 módulos nuevos de la sesión los traen (597 comprobaciones en asistente) |
