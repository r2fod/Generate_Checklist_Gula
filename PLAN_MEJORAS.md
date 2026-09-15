# Plan de mejoras

> Cómo leerlo: cada ítem lleva el porqué, el tamaño y de qué depende.
> La sección A es lo pedido en conversación, estructurado; las demás salen
> del análisis profundo (`ANALISIS.md`, medido el 2026-08-25 en `e5ca4d5`).
> Proceso de la casa para cada PR: español, JS puro con JSDoc donde toca,
> una prueba por comportamiento (con el porqué en su texto), `CONTEXTO.md`
> en el MISMO commit, `test:rapido` verde antes de commit, captura para
> cualquier cambio visual, y no se publica en rojo.

## A. Lo pedido en conversación (estructurado)

### A1 — Benchmark sectorial: comparar con el sector — **hecho**

`src/asistente/sector.js` (tabla del sector, a mano, con fuente por número,
incluida la paella) + `compararRatios()` (tono `dentro`/`por-encima`/
`por-debajo`/`sin-dato` y delta %) + herramienta de solo lectura
`comparar_con_sector`. Es banda de sanidad para lo NO medido (cumpleaños,
producción, paella): no pisa un ratio ya medido con eventos reales aunque
caiga fuera de la banda del sector, que es intencional y va comentado en el
propio fichero de ese ratio.

**`aplicar_ratio`, `aplicar_factor_bebida` y `aplicar_factor_cristaleria`,
hechos también** (a petición del dueño, tras probar que el asistente
calculaba bien pero no podía tocar el número): tres herramientas de
escritura —pasan por `ctx.onEscribir`, por tanto por el nivel de permiso,
igual que `apuntar_tarea`— para cambiar los pax/camarero (`personal.js`),
los factores de bebida (`bebida.js`, por tipo de evento) y los de
cristalería (`cristaleria.js`, nuevo, sin tipo de evento porque
`calcCristaleria` tampoco distingue). Los dos primeros ya tenían panel
manual en el calendario; cristalería no lo tiene todavía —de momento solo
se ajusta pidiéndoselo al asistente— y es candidata a tenerlo el día que
haga falta. No hay `aplicar_ratio` genérico para "cualquier cosa de la
app": cada ajuste escribible es su propia herramienta, con su propia
validación y su propio resumen — ver la nota en "No hacer" sobre por qué.
Sin aviso en el repaso de la noche — no hizo falta.

**Bug real cazado y arreglado al construir esto**: `buildChecklist()`
(`checklist-generadores.js`), la que genera la checklist de un evento,
tenía su propio 9/10/20 escrito a mano sin mirar `leerRatios()` para nada
— cambiar el ratio (a mano en el calendario, o con `aplicar_ratio`) nunca
había llegado a la checklist de verdad, solo a la previsión del calendario
y a `calcular_personal`. Arreglado (ver CONTEXTO.md, "Bug real: el ratio de
personal ajustable no llegaba a la checklist"): ahora los tres generadores
que calculan camareros caen a `leerRatios()` cuando no hay un ratio puesto
a mano para ESE evento. Sin riesgo para lo que ya había: por defecto da
exactamente los mismos números de siempre.

**Vajilla y cubertería (platos, cubiertos), pendiente**: el dueño lo pidió
también, pero a diferencia de bebida/cristalería su cálculo (`platosDoble`,
`cubiertosDoble` en `checklist-generadores.js`) está escrito TRES veces,
una por función de tipo de evento, en vez de en una función compartida como
`calcCristaleria`. Antes de poder ajustarlo con un factor limpio hace falta
sacarlo a una función común (mismo motivo que ya justificó extraer
`personal.js`/`bebida.js` en su día: un número escrito en tres sitios es un
número que se corrige en dos). Es el siguiente paso natural, no una
decisión de no hacerlo.

**Segundo bug del mismo hilo, también arreglado**: auditando a fondo se vio
que `App.jsx` (la pantalla de la checklist) nunca llamaba a
`cargarRatiosNube()`/`suscribirRatiosNube()` — existían en `nube.js` desde
que se construyó el panel del calendario, pero solo las usaba el
calendario. La checklist arrancaba siempre con los ratios de fábrica hasta
que algo (abrir el calendario embebido, o el asistente) los pusiera en
memoria de rebote. Arreglado con el mismo patrón que `factoresBebida`
(carga + suscripción al montar, solo con sesión de equipo) — ver
CONTEXTO.md, "Segundo bug del mismo hilo".

**El ratio de personal ya se autocalibra, como la bebida** (pedido:
"¿no recomiendas que se vaya reajustando lo que autocalcula?", respondido
con el propio dato que ya había: el campo `numCamareros`, donde alguien
pone a mano cuántos camareros hicieron falta de verdad, es el mismo tipo
de dato con el que se sacaron los ratios de partida — ver la cabecera de
`personal.js`). `calibracionPersonal` (`calibracion.js`) compara, por tipo
de evento con ≥3 eventos guardados con `numCamareros` puesto a mano, la
mediana de `pax/numCamareros` — descartando los eventos que además tengan
su propio `paxPorCamarero`, que ya es una decisión tomada y no una señal de
que el ratio de serie se quedara corto. Se enseña en el Resumen del Modo
carga con el MISMO componente `Ratios.jsx` que ya tenía el calendario
(nueva prop `calibracion`, opcional y vacía por defecto), mismo patrón
visual que el panel de bebida: sale el ratio medido con un botón para
usarlo en cuanto hay datos de sobra. Verificado con Playwright de verdad,
del botón a la checklist. Ver CONTEXTO.md, "El ratio de personal también
se calibra solo, como la bebida".

### A2 — Auditorías que proponen mejoras — **hecho**

Las tres capas de abajo, construidas: `revision.js` con el tono `oportunidad` (4
reglas deterministas), `ver_auditoria` de solo lectura, y `aplicar_calibracion`
para aplicar lo que propone (con la misma validación que las demás herramientas
de ajuste). Sección "Oportunidades" en Cerebro. Ver CONTEXTO.md, "Hecho".

**Por qué (contexto original):** se pidió que el asistente haga auditorías y proponga mejoras. El
asistente ya tiene la mitad del cuerpo de un auditor (reglas puras probadas,
repaso de la noche, calibración desde el histórico, flujo de propuestas con
aprobación). Falta el nombre y cerrar el bucle **hallazgo → propuesta**.

**Tres capas:**

1. **Determinista (0 tokens).** Extender `revision.js` con un tono nuevo,
   `oportunidad`, al lado de `falta`/`raro`/`acuerdate`. **No** se monta un
   motor nuevo: ese fue exactamente el motivo de descartar Tinyflows
   ("segundo motor de reglas junto a `revision.js` y el subconsciente;
   separados, uno avisa de cosas que el otro no"). Primeras reglas:
   - Ratio marcado sin medir **con historia disponible** (≥3 eventos con
     vuelta): el factor ya lo calcula `calibracionBebida`; falta quien lo diga.
   - Sobrecarga sistemática: N eventos con >X % de vuelta en una categoría.
   - Evento **sin vuelta apuntada**: la calibración no aprende; hoy pasa en
     silencio.
   - Catálogo dormido: precio de compra sin tocar en 12 meses.
   - Mismo sitio, checklist que diverge de la anterior.
   - **Catálogo con huecos**: X de Y ítems sin precio cargado (el Resumen ya
     lo cuenta por evento — "86 de 109 sin precio todavía" — pero solo lo ve
     quien entra a ESE evento; nadie lo ve de un vistazo para todos).
   - **Roturas sin revisar**: eventos con roturas apuntadas que nadie ha
     valorado en precio. El subconsciente ya sabe contarlas (`subconsciente.js`)
     pero solo si se le pregunta; falta que avise solo.
   Corre donde corre lo igual: Worker por la noche (como el repaso) y al
   abrir el panel (como el subconsciente) → `indice/avisos`.
2. **La boca.** Herramienta de solo lectura `ver_auditoria`: lee los
   hallazgos y los dice. Cada hallazgo lleva opcionalmente un campo
   `propuesta` con **exactamente la forma de `onEscribir`**
   (`{ que, resumen, datos }`): la tarjeta de propuesta con su botón
   "Hacerlo" que ya existe en Charla la pinta **sin una línea de UI nueva**,
   y el nivel de permiso decide el resto (consultar → lo cuenta y dice dónde
   se hace; permiso → se aprueba una a una; confianza → se aplica y se
   cuenta antes/después).
3. **Auditoría a fondo a pedido.** "Ratíname la boda del 12" → el modelo
   orquesta las herramientas que ya tiene (`revisar_evento`, `ver_checklist`,
   `comparar_con_sector`, `progreso_carga`) y sintetiza. Casi gratis: un
   párrafo en el mensaje de sistema. Con la regla de oro de red: **cada
   afirmación sale de una herramienta**; si no hay dato, lo dice.

**El LLM no inventa mejoras:** la parte que propone es determinista y
probada (una prueba por regla); el modelo traduce. Un auditor que inventa es
el primer auditor al que dejan de leer.

**Tamaño:** 2 PRs (reglas + `ver_auditoria` / modo a pedido). **Depende de:**
nada ya (A1, del que dependían varias reglas, está hecho).

### A4 — Vista Marketing: el asistente como experto en marketing digital — **v1, v2a y v2b hechos**

`analizar_web` por el Worker (con bloqueo de redes privadas — revisado y reforzado
tras la fusión, ver "Doce trampas" nº10 y 11), redes sociales por captura con
visión de Gemini (v2a), estrategia de captación guardada en `indice/marketing`
(v2b), modo maestro y textos listos para copiar. Solo queda **v3** (publicar de
verdad por OAuth), sin fecha prometida — ver más abajo. Ver CONTEXTO.md, "Hecho".

**Por qué (contexto original):** se pidió una vista donde el asistente analice una web o una red
social, dé pautas para que los vídeos funcionen, diseñe el embudo para
captar clientes, entregue la estrategia con sus herramientas, guíe paso a
paso en tiempo real "como un maestro" e incluso lo haga por ti.

**Lo que ya existe y se reutiliza (es mucho):**
- El bucle de conversación con herramientas: el "modo maestro" es un MODO de
  conversación, no una app nueva — un paso a la vez, espera a que confirmes,
  se adapta.
- `apuntar_tarea` con fecha: el plan de marketing se vuelve tareas con día,
  y los recordatorios (que ya existen) avisan el día.
- Cerebro: lo aprendido de la marca ("nuestro público son bodas de 100-150",
  "el tono") se guarda con `recordar` y viaja en cada pregunta.
- El conector de WhatsApp ya prepara enlaces `wa.me`: la puerta de captura
  del embudo de catering es WhatsApp.
- `formulario/` ya ES el formulario de captación (pedir presupuesto).
- `correo.js` ya documenta cómo meter OAuth en el Worker para lo de "hacerlo
  por ti".

**Arquitectura (respetando la casa):**
- **Nueva ruta del Worker `/__analizar?url=…`**: el navegador no puede leer
  otros orígenes (CORS); el Worker sí (ya hace peticiones externas). Trae la
  página y devuelve un resumen estructurado (título, metadatos,
  encabezados, CTAs visibles, móvil, si hay contacto/presupuesto/menú). El
  DATO sale de la herramienta, como todo lo demás.
- **Nuevo conector "marketing"** (herramientas de solo lectura
  `analizar_web`, `analizar_red`): el modelo interpreta con su conocimiento
  de marketing — eso SÍ puede salir de su cabeza: son pautas generales, no
  datos de clientes; la regla "los números salen de las herramientas" sigue
  intacta para los vuestros, y los de vuestra web salen siempre de la
  herramienta.
- **Estrategia y embudo**: el modelo lo estructura (atracción → captura →
  conversión → fidelización), queda en la conversación y sus acciones salen
  a `tareas` con fecha (cero infraestructura nueva en v1).
- **"Hacerlo por ti", por fases**, siempre con la regla de la casa de lo que
  sale hacia fuera — la app prepara, la persona envía:
  - v1: todo preparado y listo para copiar (texto del post + hashtags,
    guion del vídeo, enlace de WhatsApp, horario propuesto).
  - v3: publicar de verdad a Meta/TikTok por el patrón OAuth de
    `correo.js` (`escribeFuera: true`, confirmación acción a acción). Es el
    paso gordo: OAuth, tokens en el Worker y, en Meta, revisión de app. Sin
    fecha prometida.
- **Privacidad**: el análisis va por el Worker con la sesión del equipo; las
  URLs son públicas; se aplica la misma barrera de datos (si el contenido
  trae nombres, OpenAI queda fuera).

**Fases:**

| Fase | Qué da | Tamaño |
|---|---|---|
| v1 | Analizar web por URL (con renderizado) + capturas con visión (vuestro Instagram y competidores) + estrategia/embudo + plan a tareas con fecha + modo maestro + textos y guiones listos para copiar | 2-3 PRs |
| v2 | Conexión Meta: el Instagram de la empresa 100 % automático por URL, con métricas y antes/después a 30 días + estrategia guardada en la nube (colección `marketing/`, reglas + simulado + emulador, como todo lo demás) | Medio |
| v3 | Publicar de verdad vía OAuth, con confirmación acción a acción | Grande, sin fecha |

**Límites honestos (por escrito):** Instagram/TikTok no dan su contenido a
quien les golpea un URL (muro de login + JS): la v1 analiza a fondo la web (100 % automático por URL) y las redes por capturas del móvil — la única fuente fiable — y la v2 suma, en vuestra cuenta, lo que da de verdad la API de Meta. Y
"hacerlo viral" no es un botón: el asistente da las pautas que de verdad se
repiten (gancho en 3 segundos, estructura, CTA, constancia) y el embudo —
lo que promete es el proceso, no el algoritmo.

**El Instagram de la empresa, paso a paso (lo más pedido):**

1. **Cuenta Business como requisito** de las métricas oficiales (gratis, dos
   minutos; si hoy es personal, la conversión es la primera tarea del plan).
   Con Business + página de Facebook enlazada, la API de Meta da lo que da de
   verdad: seguidores, alcance, interacción y su evolución por publicación.
2. **Fase 0 — sin app de Meta (se puede construir ya)**: capturas del
   perfil/destacados/reels → visión de Gemini por el Worker (la ruta de voz ya
   demuestra que el Worker maneja lo que no es texto) → análisis cualitativo
   (qué se publica y en qué proporción, qué funciona, qué falta, el tono, los
   competidores de referencia también por capturas) + estrategia de captación
   + plan a tareas con fecha. Cero fricción de cuentas: funciona el día que se
   construye.
3. **Fase 1 — conexión oficial (la base sólida)**: app de Meta (gratis) +
   OAuth en el Worker (el patrón documentado en `correo.js`:
   `/instagram/entrar` → callback, token en KV) + herramienta de solo lectura
   `analizar_instagram` (perfil, últimas publicaciones con tipo/caption,
   insights de 7/28 días). Ahí el análisis es CUANTITATIVO, y lo mejor del
   bucle: a los 30 días se vuelve a medir y el asistente compara
   antes/después — la estrategia se confirma o se corrige con número, no con
   sensación. El endpoint no oficial que no pide app de Meta existe, pero es
   frágil (se rompe sin aviso) y va contra el ToS: **no se edifica sobre él**.
4. **Fase 2 — la v3 de siempre**: publicar reels/posts de verdad desde la
   app, con confirmación acción a acción.

**Automático por URL (lo que el muro de login sí y no deja):**
- **Webs (propia y de competidores)**: 100 % automático por URL — el Worker
  trae el dato y, si se quiere lo visual, lo renderiza con navegador
  headless (Browser Rendering de Cloudflare, o renderer propio). Se pega la
  URL y no se toca más.
- **El Instagram de la empresa**: el camino automático NO es la captura, es
  la API oficial (Fase 1): se pasa la URL del perfil, el Worker pregunta al
  Graph API por el username y trae perfil, publicaciones de verdad y
  métricas — mejor que píxeles: dato real.
- **Instagram de competidores / el "aire" de la rejilla**: la captura
  automática desde el Worker se estrella con el muro de login — Instagram
  no enseña el perfil a navegadores anónimos ni de centro de datos; la
  captura saldría de la pantalla de login. El único navegador que ve la
  rejilla es el del móvil, ya logueado: la captura se hace allí (30
  segundos, con guía de captura larga y subida arrastrando). El endpoint
  no oficial queda fuera (frágil y contra ToS, ver arriba).

Lo que la API NO da: el "aire" de la rejilla ni el contenido no público —
por eso la fase 0 no se descarta nunca: es el complemento permanente de la
fase 1, no el camino que la sustituye.

**Depende de:** nada estructural; conviene que A2 esté en pie (el plan de marketing es el primer cliente de "propuestas" y de "tareas con fecha").

## B. Correctitud y profesionalización (lo que sale del análisis)

**B1 (dependencias) ya está hecho** — `npm audit fix` + menores, 0
vulnerabilidades, batería completa en verde.

**B2 a B8 — todos hechos.** Frase de "solo consultar" que ya no contradice
`recordar`/`olvidar` (permisos.js), `buscar_eventos` desambigua con dos
candidatos, comentario de `herramientas.js` corregido, README real, salud de
proveedores en Ajustes (`/__salud`), el barrido anti-datos-reales corre en cada
`test:rapido` (ver "Trece trampas" nº12: un fixture de test tiene que reflejar
el valor real de la API externa, no uno cómodo — ese barrido no habría cazado
eso, son cosas distintas), y B8 (línea base de pintado de React,
`npm run medir` en el job `navegador` de `test.yml`) — se daba por bloqueado en
permiso de workflows, pero la app SÍ lo tiene concedido; solo hacía falta
probarlo. Ver CONTEXTO.md, "Hecho".

## C. Negocio — lo que sale en el camión

**C2 (hielo) y C3 (comida: paella y bandejas) — mecánica hecha**, mismo patrón
que `calibracionBebida` (PanelHielo, PanelComida, `indice/hielo`, `indice/comida`).
Lo que falta no es código: es que el equipo marque la vuelta en ≥3 eventos de
cada uno para que el factor pase de "sin medir" a un número real — ver
CONTEXTO.md, "Pendiente".

| # | Ítem | Por qué | Tamaño |
|---|---|---|---|
| C1 | **Coeficientes de niños** en comida, refrescos y equipamiento | Hoy solo el alcohol separa adultos (`alcoholPax`); el resto va sobre el total sin distinguir. Sin empezar a propósito — antes hay que medir un evento real | Medio, con datos reales delante |

## D. Futuro

**D1 (push de recordatorios, VAPID) — hecho.** App + service worker + Worker
con `avisosDelDia` en el cron. Falta la aplicación del dueño en Cloudflare: par
VAPID (`VAPID_CLAVE`/`VAPID_MAILTO`) + flag `nodejs_compat` — paso a paso en
`worker/README.md`. Mientras no estén, no se pierde nada: al abrir la app sale
igual el recordatorio de hoy.

- **A4 v3 — publicar de verdad vía OAuth** (Meta/TikTok), confirmación
  acción a acción. Grande, sin fecha: revisión de app en Meta incluida.
- **D2 — Gasto global**: el Worker agrega los contadores por aparato y el
  equipo ve el total. Solo si se quiere (hoy está documentado y explicado
  en pantalla que va por aparato).
- **D3 — Memoria semántica** (embeddings en el Worker): solo cuando las
  respuestas se noten peores al crecer los recuerdos.

## Lo que queda de verdad (todo lo de arriba, hecho o con su porqué de por qué no)

0. **Reparto de lo que queda listo para hacer, entre dos IAs a la vez (para no pisarse):**
   - **Esta sesión (Claude Code, ahora mismo) se queda con:**
     - **Grafo de Cerebro, animado de verdad.** Hoy `Grafo.jsx` coloca los nodos con
       una relajación de muelles+repulsión que corre UNA VEZ al montar y ya (ver más
       arriba, "El Grafo, de verdad, con líneas") — falta que se mueva, no solo que
       tenga líneas.
     - **Voz del asistente, más natural.** #138 ya metió voz más natural (local +
       Gemini) y personalidad audible en el saludo — falta comprobar si con eso basta
       o si sigue sonando leída en algún punto y hace falta afinar más.
   - **La otra IA se queda con todo lo demás listo para tocar, en concreto:**
     - **Vajilla y cubertería (platos, cubiertos)**, siguiente paso natural de A1:
       sacar `platosDoble`/`cubiertosDoble` de `checklist-generadores.js` (hoy
       escritos por triplicado, uno por tipo de evento) a una función compartida
       antes de poder darles un factor ajustable limpio — mismo motivo que ya
       justificó extraer `personal.js`/`bebida.js` en su día.
     - **Cablear `subconsciente.js`**: construido y probado, pero ninguna pantalla lo
       llama — decidir dónde se enseña.
     - El resto de los puntos 1-5 de aquí abajo que no sean puramente "esperar datos
       reales" o "decisión del dueño".
   - Si alguna de las dos IAs termina lo suyo y quiere seguir, que mire primero este
     reparto antes de coger algo de la lista del otro, para no duplicar trabajo en dos
     ramas a la vez.

1. **Tuyas, para aplicar** (código ya listo, esperando acción fuera de un PR):
   - B8: las 3 líneas en `.github/workflows/test.yml` (permiso de workflows).
   - D1: par VAPID + `nodejs_compat` en el Worker de Cloudflare.
   - Re-pegar `worker/pegar.js` en Cloudflare (cambió de verdad: `analizar_web`,
     VAPID, visión).
   - Visto humano de los elementos nuevos que lo piden — lista en CONTEXTO.md.
2. **Con datos reales, cuando los haya** (nadie puede acelerarlo desde el código):
   - C1 (niños): medir un evento real antes de escribir el número.
   - C2/C3: marcar la vuelta del hielo y de la paella en ≥3 eventos cada uno.
   - Ratios de cumpleaños/producción: el panel ya existe, falta medir un evento.
   - Validar la tabla del sector con un evento de 250 pax y uno de octubre.
3. **Decisión del dueño, no de código:**
   - Unificar o no `aplicar_factor_bebida` (#154) y `aplicar_calibracion` con
     `area: "bebida"` (esta rama) en una sola herramienta — documentado en
     CONTEXTO.md, "Hecho", ambas funcionan hoy sin pisarse.
   - A4 v2 (API de Meta) y v3 (OAuth, publicar de verdad) — grandes, sin fecha.
   - D2, D3 — solo si hace falta.
4. **Pendiente de cablear, sin decisión tomada todavía:** el subconsciente
   (`subconsciente.js`) está construido y probado pero ninguna pantalla lo llama
   — falta decidir DÓNDE se enseña. Ver CONTEXTO.md, "Pendiente".
5. **Tinyflows — decidido NO hacer por ahora** (segundo motor de reglas junto a
   `revision.js`; el repaso de la noche cubre el 80% del valor sin eso).

## E. Auditoría de funcionalidad — calendario, App.jsx y formulario (2026-09-15)

Pedida por el dueño ("revisa todo y plan de mejoras"), tras la auditoría de
CÁLCULOS del mismo día (7 bugs, ya arreglados y fusionados — ver CONTEXTO.md).
Esta es la mitad que faltaba: no fórmulas, sino estado, sincronización y
flujos de UI. Tres pasadas de solo lectura, cada una centrada en un
subsistema, cruzadas contra CONTEXTO.md para no repetir hallazgos ya
cerrados. Nada de esto está arreglado todavía — es la lista para decidir qué
se ataca y en qué orden. El asistente (`src/asistente/`, ~6700 líneas) queda
para una fase aparte, todavía sin auditar.

### E1 — Calendario compartido (`src/calendario/`)

1. **[Alto] `guardarCalendarioNube` sube el documento entero, sin la fusión
   por campo que ya se aplicó hoy a `guardarEventoNube` (Modo Carga)**.
   `useCalendarioNube.js:97-109` + `nube.js:593-604`: `setDoc` con la lista
   COMPLETA de `apuntes`/`equipo`, partiendo de una foto local que puede
   estar desactualizada — sin transacción ni `baseline`. Dos móviles
   editando el calendario a la vez (el caso normal aquí, no el raro) pueden
   perderse el cambio del otro en silencio, exactamente el bug que hoy se
   arregló en Modo Carga pero en el sitio hermano. Arreglo: mismo patrón
   `fusionaCampo`/baseline, o fusión por id de apunte contra el snapshot con
   el que se abrió la edición.
2. **[Alto] Un evento de varios días desaparece de "Lo que viene" y de la
   vista Equipo en cuanto EMPIEZA**, aunque siga en marcha. `apuntes.js:
   219-225` (`aVistaProxima`) y `Calendario.jsx:549-550` (`VistaEquipo`)
   miran `diasHasta(fecha)` (el día de INICIO) y descartan lo negativo — un
   apunte con `hasta` se vuelve invisible en cuanto pasa su primer día. El
   aviso de choques SÍ está bien (usa `porDia`, que expande el rango).
   Repro: rodaje 10-13 sept., mirado el día 12 → `aVistaProxima` da `[]`.
   Arreglo: comprobar si `hoy` cae dentro de `[fecha, hasta]`, no solo
   `diasHasta(fecha)>=0`.
3. **[Medio] `idDeApunte` trunca el slug a 40 caracteres y puede colisionar
   dos apuntes distintos el mismo día**. `apuntes.js:117-122`. Dos títulos
   que solo difieran DESPUÉS del carácter 40 dan el mismo id, y
   `saneaLista` se queda con el último — el otro desaparece sin aviso (y
   sin checklist, porque `checklistsPorCrear` ya no lo ve). Arreglo: no
   truncar antes de comparar, o desempatar con un hash del título completo.
4. **[Medio] `checklistsPorCrear` indexa el archivo SOLO por título, sin
   fecha** — un cliente recurrente con el mismo nombre en años distintos
   ("Cena de Navidad Empresa X") enlaza el segundo evento a la checklist
   del año anterior en vez de crear una nueva. `apuntes.js:280-288` +
   `App.jsx:1378-1382`. Arreglo: clave `${titulo}::${fecha}`, o comprobar
   también que la fecha coincida antes de dar el evento por "ya existe".
5. **[Bajo, no urgente]** El documento "solo ver" del calendario comparte
   regla de escritura con el editable en `firestore.rules` — quien tenga
   ese código podría escribir directamente por el SDK, sin pasar por la app
   (el guard `soloVer` es de la app, no de las reglas). Impacto acotado: se
   autorrepara en la siguiente edición real, y solo afecta a la copia de
   mirar. Verlo si algún día hay tiempo de sobra, no antes.

### E2 — App.jsx (~4900 líneas: estado, sincronización, UI de la checklist)

1. **[Alto] "Guardar evento" y "Duplicar evento" pisan otro evento sin
   avisar si el nombre coincide**. `App.jsx:1671-1690` y `2508-2524`. El
   autoguardado SÍ comprueba esto (`ocupadoPorOtro`, línea 1708); los dos
   diálogos manuales, no. Arreglo: la misma comprobación antes de
   `guardarEventos(...)` en los dos sitios.
2. **[Alto] Borrar el evento que tienes ABIERTO no lo borra de verdad —
   reaparece solo**. `App.jsx:2478-2503`: `handleBorrarEvento` no llama a
   `marcarEventoActivo("")`, así que el autoguardado (1200ms tras cualquier
   cambio, línea 1703) lo detecta como "el activo" y lo vuelve a escribir,
   subiéndolo de nuevo a la nube. Es el caso más habitual de borrar (el que
   tienes delante) el que falla. Arreglo: si `nombre === eventoActivoRef.
   current`, limpiar el evento activo en el mismo borrado.
3. **[Medio, confianza media] Una escritura vieja a la nube puede pisar a
   una más nueva del mismo aparato si llegan desordenadas** (red
   inestable). `App.jsx:1046-1071` + `nube.js:105-129`: dos guardados
   seguidos parten del MISMO `baseline` si el primero no ha resuelto
   todavía; si el segundo (más nuevo) confirma antes que el primero, el
   primero puede sobrescribirlo al llegar. Justo el escenario de cobertura
   floja cargando un camión. Arreglo: serializar los guardados, o
   actualizar `ultimoGuardadoNubeRef` de forma optimista al ENVIAR, no solo
   al resolver.
4. **[Medio] Las carpas se quedan encendidas al salir de "Producción" hacia
   otro tipo**. `App.jsx:1259-1279`: se encienden solas al ENTRAR en
   producción, pero no hay `setLlevaCarpas(false)` simétrico al salir — el
   resto de la función sí limpia simétricamente. Arreglo: en el `else`,
   `if (evento === "produccion" && llevaCarpas) setLlevaCarpas(false)`
   (mirando el tipo ANTERIOR).
5. **[Alto] Cuatro campos numéricos corrompen la cantidad al borrar y
   reescribir**: Nº barriles (línea 4461), sartenes (4578), planchas de gas
   (4587), chill out (4594). Mismo patrón `Math.max(1, parseInt(...)||1)`
   con `value={x}` directo: al vaciar el campo salta a "1", y escribir "2"
   da "12". Ya se arregló este mismo patrón en `Formulario.jsx` (líneas
   828-946) — aquí se quedó sin aplicar. Arreglo: mismo patrón (dejar pasar
   el valor en blanco mientras se escribe, aplicar el mínimo solo al salir
   del campo) — candidato a extraer como helper compartido (mejora A).

### E3 — Formulario de oficina (`Formulario.jsx`, `envios.js`, `codigo.js`...)

1. **[Crítico] "Inicio" + elegir OTRO evento (o "Es un evento nuevo") mezcla
   las respuestas del evento abandonado con las del nuevo**. `Formulario.
   jsx:373-380, 536-545, 589`: `irAlInicio` no limpia `respuestas` a
   propósito (para "seguir donde iba"), pero los otros dos botones de esa
   pantalla TAMPOCO la limpian, así que gente/menú/carpas/horas del evento
   anterior se cuelan en el nuevo. El patrón correcto ya existe en el
   código ("Mandar otro evento", línea 431: `setRespuestas({})`) — solo
   falta aplicarlo aquí. Arreglo: reset real de `respuestas` en esos dos
   `onClick`.
2. **[Alto] Se puede mandar el formulario con un archivo a medio subir —
   el adjunto se pierde en silencio**. `CampoArchivo.jsx:11,16-25`:
   `cargando` es estado local, el padre no lo sabe; nada bloquea "Siguiente"
   /"Enviar" mientras la foto se sigue comprimiendo. Arreglo: subir
   `cargando` a estado compartido y bloquear el avance mientras algún
   archivo esté procesando.
3. **[Medio-alto] `corregirEnvio` trata CUALQUIER error como "ya revisado"
   y manda un envío duplicado**. `Formulario.jsx:612-620`: el `catch`
   no distingue "ya revisado" (el único fallo real esperado) de un corte de
   red — en cualquier caso crea un envío nuevo y dice (quizá en falso)
   "logística ya revisó el anterior". Arreglo: mirar `e.code ===
   "permission-denied"` antes de hacer el fallback.
4. **[Medio] Editar "Nombre del evento" tras elegir uno de la lista no hace
   nada — "Sitio", en la misma pregunta, sí se aplica**. `Formulario.jsx:
   314-316` + `App.jsx:1955,1975`: mismo aspecto, comportamiento opuesto,
   sin ningún aviso de cuál de los dos "cuenta". Arreglo: nombre de solo
   lectura cuando se elige un evento existente (con nota de "para
   renombrar, hazlo en el calendario"), sitio se queda editable.
5. **[Medio-bajo] `buscarEnvioPorNombre` empareja solo por texto del
   nombre, sin fecha** — dos eventos reales con el mismo nombre (típico en
   corporativo recurrente) pueden hacer que "ya mandaste esto"/"Cambiar el
   de antes" apunten al envío equivocado. `mios.js:56-60`. Arreglo: añadir
   la fecha a la comparación, o comparar contra `eventoDestino` exacto.
6. **[Bajo]** El código de acceso se compara sensible a mayúsculas
   (`codigo.js`) — quien lo teclee a mano (la caja de "pegar el enlace",
   sobre todo iPhone) en minúsculas ve "este enlace ya no vale" en vez de
   un aviso de mayúsculas. Arreglo trivial: normalizar a mayúsculas antes
   de comparar.
7. **Curiosidad, no bug de datos**: el banner "Deshacer" de "No lo sé"
   (`Formulario.jsx:181,326-333,712-725,775-784`) es código muerto en la
   práctica — el `useEffect` que limpia `deshacer` se dispara en CUALQUIER
   cambio de `paso`, incluido el que lo acaba de fijar, así que la
   condición para mostrarlo nunca llega a cumplirse en ningún camino de
   navegación normal. No hay pérdida de datos (la respuesta se limpia
   igual), solo una función entera que nunca hace lo que su comentario
   dice. Arreglo: mover el `setDeshacer(null)` a los puntos donde de
   verdad toca limpiarlo, no a cualquier cambio de paso.

### E4 — Mejoras de UX/funcionalidad (para cuando haya hueco, no bugs)

- Duplicación de composición entre `calendario/main.jsx` y `EnChecklist.jsx`
  (montan casi el mismo árbol con pequeñas variaciones) — candidato a un
  `PanelesCalendario` con flags.
- `Traer.jsx` no dice cuántas filas pegadas se descartaron o colisionaron
  por id — solo "Añadidos N", sin explicar si N es menos de lo esperado.
- "Día cerrado" no cruza con disponibilidad ni con choques — se puede
  agendar un evento encima sin ningún aviso (a confirmar si es a propósito).
- ~20 campos numéricos en App.jsx comparten el patrón frágil del bug E2.5
  con mínimo 0 (más benigno, se autocorrige al seguir escribiendo, pero
  igual fuerza un "0" visible al borrar) — mismo helper compartido lo
  arreglaría de una vez.
- `ETIQUETAS_CAMPO` (App.jsx:216-252) no traduce `colorManteles`,
  `porcentajeBeige` ni `cronos`: el aviso de "actualizado desde otro
  dispositivo" enseña el nombre crudo de la variable para esos tres.
- Comprobación `qty && qty.u` ya inerte en dos sitios de App.jsx (el dato
  ya llega resuelto) — simplificable a `String(qty)`.
- La lista "Eventos guardados" no resalta cuál es el que tienes abierto
  ahora mismo — ayudaría a no pulsar "borrar" sobre el propio (ligado a
  E2.2).
- Formulario: sin confirmación al abandonar un evento a medio rellenar
  desde "Inicio" (ligado a E3.1); sin aviso suave si se avanza sin
  adjuntar un archivo en una pregunta que lo pide; el guardado en
  localStorage reserializa TODO `respuestas` (incluidos adjuntos en
  base64) en cada tecla, con lag plausible en móviles de gama baja.

### Por dónde empezar (sugerido, no decidido)

Los de impacto "Alto" tocan pérdida silenciosa de datos o de trabajo
(E1.1, E1.2, E2.1, E2.2, E2.5, E3.1, E3.2) — son los candidatos naturales a
ir primero, uno por rama como el resto de esta sesión. El resto puede
esperar a que el dueño priorice.

## No hacer (ratificado)

No partir `App.jsx`/`index.css`; ningún `useMemo` sin medición; sin
librerías de animación; no Tinyflows; no partir el CSS; no tipar
`App.jsx` de golpe; no tocar las tres guardias ni las identidades. Todo con
su motivo en CONTEXTO, que sigue vigente.

**No una herramienta "modifica cualquier cosa de la app" genérica**,
propuesta y descartada en conversación. Cada cosa que el asistente puede
escribir es su propia herramienta, con su propio nombre, su propia
validación (rango de un número, que el tipo de evento exista) y su propio
resumen de confirmación — igual que `apuntar_tarea`, `aplicar_ratio` o
`aplicar_factor_bebida`. Una genérica no podría llevar esas comprobaciones
puestas de antemano, porque no sabría qué va a tocar; y ampliaría sin darse
cuenta la lista `NUNCA` de arriba, que existe justo para que un fallo del
modelo no pueda borrar el trabajo de quien está cargando el camión. El
camino es seguir añadiendo herramientas concretas según haga falta, no una
que las sustituya a todas.

**El control graduado del asistente (consultar / permiso / confianza, con la
lista `NUNCA`) se mantiene tal cual** — no es una mejora pendiente, es la
razón por la que el asistente no destruye el trabajo del camión. B2 (la
corrección sobre esto) ya está hecha.
