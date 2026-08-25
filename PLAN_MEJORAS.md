# Plan de mejoras

> Cómo leerlo: cada ítem lleva el porqué, el tamaño y de qué depende.
> La sección A es lo pedido en conversación, estructurado; las demás salen
> del análisis profundo (`ANALISIS.md`, medido el 2026-08-25 en `e5ca4d5`).
> Proceso de la casa para cada PR: español, JS puro con JSDoc donde toca,
> una prueba por comportamiento (con el porqué en su texto), `CONTEXTO.md`
> en el MISMO commit, `test:rapido` verde antes de commit, captura para
> cualquier cambio visual, y no se publica en rojo.

## A. Lo pedido en conversación (estructurado)

### A1 — Benchmark sectorial: comparar con el sector y reajustar

**Por qué:** se preguntó si el asistente puede comparar nuestros números con
los del sector para ver si estamos en el rango y reajustar. Hoy NO: no hay
fuente de datos del sector en la app, y la regla de oro prohíbe que el modelo
use su cabeza para los números ("los números SIEMPRE salen de las
herramientas"). Pero la infraestructura ya existe al 80 %: `indice/ratios` +
`ponRatios` + panel en el calendario (el "reajustar" ya funciona y está
validado), autocalibración desde el histórico (`calibracionBebida`: mediana
de *lo que salió − lo que volvió*, mín. 3 eventos, factor acotado 0,3–2) y
aviso "ratio sin comprobar". Falta solo el sector **como dato** y la
**herramienta** que los compare.

**Diseño (estilo de la casa):**

1. `src/asistente/sector.js` — puro, con JSDoc: la tabla del sector como
   dato, con la fuente de cada número (el estilo de `precios.js` cuando se
   migró a Firestore). Se edita a mano, con revisión, no se genera.
2. Función pura `compararRatios(actuales, sector)` — el patrón de
   `revision.js`: sale cada ratio con tono `dentro` / `por encima` /
   `por debajo` y el delta %.
3. Herramienta de SOLO lectura `comparar_con_sector` (`datos: false`, los
   ratios no tienen dueño): el asistente responde "¿estamos en el rango?"
   con dato, y si no, dice que no hay dato.
4. Opcional: `aplicar_ratio` con `escribe: true` → pasa por el sistema de
   permisos normal y escribe en el `indice/ratios` que ya existe.
5. Opcional: aviso determinista en el repaso de la noche (0 tokens): ratio
   activo fuera de banda → `indice/avisos` → se ve en Cerebro.

**Decisión que manda:** el sector es **banda de sanidad para lo no medido**
(cumpleaños 20 pax/camarero, producción, la merma del hielo, los factores de
bebida por tipo que arrancan en 1). NO es para pisar lo medido: la boda a 9
pax/camarero es medición de 19 eventos, y si el sector dice 12-15, la
diferencia es intencional y está comentada en `personal.js` ("los del sector
se quedaban cortos para cómo se trabaja aquí").

**Tabla inicial** (fuentes públicas recogidas el 2026-08-25; **por validar
con los números de verdad del equipo antes de meterla en `sector.js`**):

| Ratio | Nosotros (hoy) | Sector (fuente pública) |
|---|---|---|
| Camareros | boda/comunión 9 · corporativo 10 (medido) | banquete 1/12-15 · cena 1/8-12 · buffet 1/20-30 · corporativo 1/20-30 |
| Cocina | (en `personal.js`) | 1/40-50 en banquete; 100-200 pax → 3-5 |
| Vino | 0,72 botella/adulto | 1 botella/2-3 personas; boda media 40-50 tinto + 30-40 blanco por 100-150 |
| Cerveza | 3,0/2,0 tercios/adulto (1,0/0,66 L) | 1,5-2 botellines/persona con barra; boda completa ≈0,5-0,7 L/invitado |
| Cava | 0,2/adulto (1/5) | 1/6-8 solo por brindis |
| Refrescos | 7,4 uds/comensal (unidad a confirmar) | 1-1,5 L/persona |
| Hielo | 0,9/0,5 kg/pax × 0,6 sin barra × 1,35/1,2 merma | 0,7-1 kg/pax con barra verano; 0,3-0,5 sin barra (ya está en el comentario de `calculos.js`) |
| Margen | extremo alto de cada banda | +10-15 % recomendado |
| Paella | 1 paellera cada 30 pax (`PERSONAS_POR_PAELLA`, `paella.js`), talla por tramos (≤40 pequeña, ≤80 mediana, resto grande) | ración de sector ≈150-200 g de arroz seco/persona; por validar de ahí cuántas personas da cada talla de paellera antes de meterlo en la tabla |

**Añadido a petición del dueño:** la paella es el primer candidato de "sin
ningún dato que lo valide" — ni calibración propia (nadie ha marcado
"Vuelve" en paella todavía) ni sector. Es donde más se nota la diferencia
entre "banda de sanidad" (esto, mientras no haya histórico) y "medido de
verdad" (en cuanto lo haya, ver C3 abajo).

**Tamaño:** 1 PR, 1-2 días con pruebas. **Depende de:** nada (y alimenta a
C2, C3 y A2).

### A2 — Auditorías que proponen mejoras

**Por qué:** se pidió que el asistente haga auditorías y proponga mejoras. El
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
A1 (varias reglas necesitan la tabla del sector).

### A3 — El control del asistente: se mantiene (no es mejora, es decisión)

El modelo de permisos graduado (consultar / permiso / confianza) con la
lista `NUNCA` se mantiene tal cual: es la razón por la que el asistente no
destruye el trabajo del camión. Única corrección: B2 (abajo).

### A4 — Vista Marketing: el asistente como experto en marketing digital

**Por qué:** se pidió una vista donde el asistente analice una web o una red
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

| # | Ítem | Por qué | Tamaño |
|---|---|---|---|
| B1 | **Dependencias: `npm audit fix`** (2 HIGH: `nanoid`, `postcss` — solo de build) + menores (vite 8.2.2, react 19.2.8, lucide 1.34, firebase 12.18.0) + batería completa | Un HIGH en la cadena que corre `npm ci` + build en CI es deuda aunque no toque la app; el fix es barato | Pequeño |
| B2 | **`recordar`/`olvidar` en "Solo consultar"**: no llevan `escribe: true` y por tanto funcionan en el nivel read-only, contradiciendo la frase de sistema ("No puedes cambiar nada") | Es el antipatrón "el sistema contradice al nivel de permiso" que ya costó un bug (trampa nº2 de CONTEXTO) | Pequeño + prueba |
| B3 | **Ambigüedad en la búsqueda de eventos**: `buscar_eventos` coge el primer candidato aunque haya dos "Boda García"; el conector de calendario sí obliga a desambiguar | Con dos candidatos, adivinar es jugársela con los datos de alguien | Pequeño + prueba |
| B4 | **Comentario obsoleto** en la cabecera de `herramientas.js` ("Todas son de SOLO LECTURA") | Comentario = porqué; un comentario falso es peor que no tenerlo | 5 minutos |
| B5 | **README real** (hoy es el boilerplate de Vite) | El repo es público; `CONTEXTO.md` es para agentes, el README es para humanos: qué es, cómo se monta el Worker, comandos | Pequeño |
| B6 | **Salud de proveedores/modelos**: ping por proveedor en Ajustes + smoke test en CI | Cazar un modelo retirado antes del sábado, no después (ya pasó con `gemini-2.5-flash`) | Medio |
| B7 | **Prueba "no hay datos reales"**: barrido de patrones de teléfono/correo/precio sobre `src/` en cada batería | Ya se colaron tres nombres reales una vez; el barrido automático es el único cierre que no depende de la memoria | Pequeño |
| B8 | **Línea base de pintado de React en CI** (punto `medir` al chromium que CI ya descarga) | Es el único coste de rendimiento sin medir; sin el número, ninguna optimización (regla de la casa) | Medio |

## C. Negocio — lo que sale en el camión (pendiente de CONTEXTO, ordenado)

| # | Ítem | Por qué | Tamaño |
|---|---|---|---|
| C1 | **Coeficientes de niños** en comida, refrescos y equipamiento | Hoy solo el alcohol separa adultos (`alcoholPax`); el resto va sobre el total sin distinguir | Medio, con datos reales delante |
| C2 | **Hielo: calibrar la merma de verdad** — extender el patrón de `calibracionBebida` al hielo (la "vuelta" ya soporta cantidad: `true` = todo, o número) y contrastar 1,35/1,2 con el sector | Los números salieron de una estimación, no de una medición; la mecánica ya existe para la bebida, es estirarla | Medio |
| C3 | **Comida: calibrar raciones con datos reales** — mismo patrón que C2, aplicado a paella y demás cantidades de comida (frituras, bandejas). El marcador "Vuelve ✓" ya es genérico por ítem (`checklist-format.js`, no es solo de bebida), así que la parte que falta es la misma que en C2: agrupar por categoría de comida y sacar la mediana con ≥3 eventos | Hoy la paella y el resto van a ratio fijo (1 cada 30 pax), sin dato propio ni de sector detrás; en cuanto haya 3+ eventos con la vuelta marcada, el dato real manda sobre el ratio fijo — igual que ya pasa con la bebida | Medio, depende de A1 (paella) para la banda de sanidad mientras no hay histórico |

## D. Futuro (mucho valor, mucho trabajo)

- **D1 — Push para los recordatorios** (VAPID + PWA + trigger en el
  Worker): hoy "recuérdame X" solo se cumple al abrir la app. Fue decisión
  del dueño para no montar la infraestructura; esta es esa infraestructura,
  para el día que un recordatorio de "a las 6:47 sale el camión" valga
  más que abrirla a tiempo.
- **D2 — Gasto global**: el Worker agrega los contadores por aparato y el
  equipo ve el total. Solo si se quiere (hoy está documentado y explicado
  en pantalla que va por aparato).
- **D3 — Memoria semántica** (embeddings en el Worker): solo cuando las
  respuestas se noten peores al crecer los recuerdos.

## Orden recomendado

1. **B1** — dependencias: pequeña, independiente, y el resto se apoya en una
   toolchain sin HIGH.
2. **A1** — sector (incluida la paella): alimenta a C2, C3 y A2.
3. **C2** — hielo con sector + calibración propia.
4. **C3** — comida (paella y demás) con sector + calibración propia, mismo
   patrón que C2.
5. **A2** — auditorías (reglas → `ver_auditoria` → modo a pedido), incluidas
   las dos nuevas (catálogo con huecos, roturas sin revisar).
6. **B2 + B3 + B4 + B7** — los pequeños del asistente y de la seguridad del
   repo (agrupables en una PR si se mantiene limpia).
7. **C1** — niños: primero medir un evento real, luego el número.
8. **A4 v1** — vista Marketing (analizador en el Worker + capturas de
   Instagram con visión + estrategia + modo maestro). Con A2 en pie, el
   plan de marketing es su primer cliente.
9. **B5 · B6 · B8** — profesionalización sin prisa.
10. **A4 v2/v3 y D\*** — redes con visión, publicar de verdad y el resto,
    cuando toque.

## No hacer (ratificado)

No partir `App.jsx`/`index.css`; ningún `useMemo` sin medición; sin
librerías de animación; no Tinyflows; no partir el CSS; no tipar
`App.jsx` de golpe; no tocar las tres guardias ni las identidades. Todo con
su motivo en CONTEXTO, que sigue vigente.
