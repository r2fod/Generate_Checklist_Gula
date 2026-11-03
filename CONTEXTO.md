# Generate_Checklist_Gula — contexto para retomar

App interna de **Gula Catering** para montar la checklist de material de cada evento.
React 19 + Vite + Firebase Firestore, publicada en GitHub Pages.

- Rama `main` · Firebase: `gula-checklist`
- **Reglas del dueño → `CLAUDE.md`** (se carga solo en cada sesión). Léelo primero.
  Con Gemini se carga `GEMINI.md`, que importa ese mismo `CLAUDE.md`: las reglas son
  las mismas para cualquier IA.
- **Lo ya hecho, con su porqué → `HISTORIAL.md`** (más de 130 KB: NO lo leas entero, busca
  con `grep -n "palabra" HISTORIAL.md` y abre solo la entrada). Aquí queda lo vigente.
- **Estado del plan de mejoras (N1–N6, A–D) → `PLAN_MEJORAS.md`.** No se repite aquí: ese
  archivo lleva su propia tabla de hecho/pendiente por ítem, con su porqué y su tamaño, y
  apunta de vuelta aquí (`Ver CONTEXTO.md, "..."`) para el detalle técnico de cada uno.
- **Logística del personal y resumen financiero: fuera de esta app** (decidido por
  el dueño el 2026-09-30). Los lleva otra app suya, que más adelante quiere juntar con
  esta. Aquí no se planifica ni se programa presupuesto/margen ni vista de logística
  por persona; `PLAN_PRESUPUESTO.md` se quitó (sigue en git, commit `d7b28e7`).
- **Los dos planes grandes que SÍ siguen, sin código todavía → `PLAN_COCINA.md`
  (primero) y `PLAN_INVENTARIO.md`** (después: su parte de ingredientes necesita el
  escandallo de Cocina; la de material puede empezar antes).

## Orden de lectura e Índice Rápido por Líneas (para IA — no leer el archivo entero)

> **Regla de eficiencia**: lee solo el rango `StartLine`–`EndLine` que necesites o delega la búsqueda en un subagente N1 (`flash_lite` / `haiku`, ver `PLAYBOOK_AGENTES.md`). `HISTORIAL.md` (>130 KB) se consulta solo con `grep`.

- **`L1–L155` · Arranque rápido**: Mapa del repo (`L35`), Revisión visual/Playwright (`L60`), Estilo de código y tokens CSS (`L75`), Comandos, CI y Proceso (`L98`).
- **`L156–L265` · Arquitectura e Invariantes**: Firestore (`L160`), Identidad de ítem/apunte (`L188`), Cadena de datos (`L196`), Service Worker (`L207`).
- **`L266–L465` · El Asistente y Guardias**: Piezas (`L279`), Proxy Worker (`L356`), **Tres guardias intocables** (`L397`), Fallos reales cazados (`L405`).
- **`L466–L585` · ESTADO DE HOY (LECTURA OBLIGATORIA AL RETOMAR)**: Qué está en producción, qué PRs no se tocan (`#222`, `#231`, `#232`, `#233`, `#237`) y método de cruce del calendario Drive↔App.
- **Lista corta de pendientes activos → `PENDIENTES.md`** (`50` líneas).

## Mapa del repositorio

```
src/App.jsx                   la checklist entera (~4.000 líneas). Todo el estado vive aquí
src/calendario/                app del calendario
src/formulario/                app de la oficina (sin login)
src/asistente/                  cerebro, herramientas, permisos, muñeco
src/nube.js                    TODO lo que habla con Firestore, en un solo sitio
src/fecha.js                   hoy en ISO (local y UTC: son dos a propósito)
src/texto.js                   sinTildes / limpiaTexto / claveDeTexto (identidad por texto)
src/almacen.js                 localStorage con su try/catch, en un solo sitio
src/diario.js                  últimos fallos de ESTE navegador, sin datos de nadie
src/precarga.js                alSobrarTiempo(): trabajo para cuando el navegador está parado
src/tema.js                    claro/oscuro + aplicarTemaInicial (la usan los dos arranques)
src/precios.js                 catálogo de precios (vive en Firestore)
src/checklist-generadores.js   qué material lleva cada tipo de evento
src/asistente/revision.js      reglas de "esto no cuadra"
worker/                        proxy de claves + repaso de la noche + IA
src/__tests__/                 las cuatro baterías
pruebas/calendario.html        banco de pruebas sin nube, para lo que hay tras el login
```

**Lo más denso: `src/nube.js`.** Todo Firestore pasa por ahí; los comentarios explican
por qué cada colección vive donde vive (sobre todo el calendario, con dos documentos).

## Cómo se revisa lo visual

Las pruebas comprueban desbordamiento y texto cortado, **no si algo se ve bien**. Dos
cosas pasaron las pruebas estando rotas: el muñeco invisible fuera de su caja, y los
ajustes apilados encima de cada pestaña.

Al tocar interfaz, **captura y mira**:

```js
await p.locator(".asis-panel").screenshot({ path: "x.png", animations: "disabled" });
```

`animations: "disabled"` no es opcional: el compañero respira en bucle → sin eso,
Playwright espera 30s a que "esté quieto" y revienta por timeout.

## Cómo se escribe aquí

Mira `src/asistente/` antes de escribir — el estilo es marcado y desentona rápido.

- **Comentario = POR QUÉ, no qué.** Casi todos cuentan un fallo ya ocurrido — por eso valen.
- Cabecera por fichero: `// ─── TÍTULO ───`, explica por qué existe.
- **Cero duplicación** — se extrae a un fichero compartido en cuanto se repite. Tres
  pruebas recorren `src/` y fallan si algo vuelve a copiarse.
- **Los avisos dicen qué hacer**, no solo qué pasó.
- **Letra y radios, siempre con token**: `--fs-3xs` … `--fs-4xl` (y `--fs-input`, 16px
  por el zoom de iOS), `--radius-xs/sm/md/lg/pill`, en el `:root` de `src/index.css`. Un
  tamaño suelto nuevo es lo que llevó a 43 distintos. Fuera de la escala, a propósito:
  los px de la pantalla de acceso y los tamaños diminutos medidos (mini calendario,
  fichas a 360px).
- Una prueba por fallo arreglado **y por cada comportamiento nuevo**, con el porqué en su texto.
- **Esta misma nota vale para `CONTEXTO.md`**: entradas cortas, con el porqué, no un
  diario de "lo que se vio / lo que se probó" — eso es lo que hace crecer el archivo sin
  añadir nada que una sesión nueva vaya a necesitar.
- **`CONTEXTO.md` solo lleva lo vigente** (reglas, trampas, estado de HOY): se lee entero al
  empezar cada sesión, cada línea cuesta. La entrada de cada cambio hecho va arriba de
  "Lo hecho" en `HISTORIAL.md`, que no se lee entero. Si el cambio altera una regla o el
  estado de HOY, además se toca aquí.

## Comandos

```
npm run lint          # oxlint — ERRORES: 0 (los warnings de catch(e) son de la casa)
npm run tipos         # tsc --checkJs sobre los módulos puros con JSDoc (jsconfig.json)
npm run test:rapido   # tipos + calculos + asistente + build + sincronizacion (~1 min)
npm run test          # lo anterior + app.test.mjs (navegador, ~45 min)
npm run medir         # rendimiento: cuentas puras siempre; navegador si hay chromium
npm run worker:build  # empaqueta el Worker en worker/pegar.js
npm run reglas:deploy # firebase deploy --only firestore:rules
npm run deploy        # predeploy = test; no publica en rojo
```

**~2.000 comprobaciones entre las cuatro baterías rápidas + `app.test.mjs` (navegador,
barrido responsive: 9 anchos × 2 temas × 10 pantallas).** Y aparte, `npm run
reglas:emulador`: comprobaciones de `firestore.rules` contra el motor real de Google
(pide Java y el emulador — no corre en todos los entornos de trabajo, por eso el trabajo
`reglas` de CI es el sitio donde de verdad se comprueban siempre).

### CI y publicación (`.github/workflows/*.yml`)

En cada push/PR: `npm ci` + `lint` + `test:rapido`, más un trabajo que regenera
`worker/pegar.js` y falla si sale distinto del subido (si la fuente cambió y nadie lo
regeneró, el repo dice una cosa y Cloudflare corre otra), y otro que pasa
`firestore.rules` por el emulador real. El barrido del navegador va aparte: solo de
noche (04:00 UTC) o a mano, 45 min.

`deploy.yml` publica en `gh-pages` al fusionar en `main` (y a mano con *Run workflow*):
**no se publica en rojo** — el trabajo que sube `dist/` depende de otro que lanza la
batería ENTERA (~45 min) primero. Usa `npm run build`, no `npm run deploy`, para no
repetir esos 45 min.

**Trampa ya cazada, por si se vuelve a tocar el workflow**: `gh-pages -u
"github-actions[bot] <...>"` sin comillas no pasa el parser RFC 5322 estricto de
`gh-pages` (rechaza el corchete suelto) — hay que entrecomillar dos veces, nombre Y
dirección.

### Proceso — costó deploys rotos y trabajo perdido

- **No editar mientras corre `test`/`deploy`**: `deploy` publica `dist/` al terminar →
  reconstruir a medias publica sin probar.
- Una cosa a la vez: los dos usan el puerto 4178.
- **Commit + push en cuanto está verde.** El contenedor se recicla; lo no subido se pierde.
- **Rama que abres, rama que borras al fusionar.** No la dejes "por si acaso".
  **Sin permiso en este entorno**: ni `git push origin --delete <rama>` ni el refspec
  `git push origin :<rama>` — ambos dan `403`. Pídeselo al dueño (Settings → Branches).
- Matar procesos por PID; `pkill -f` se mata a sí mismo. `pgrep -f "npm run test"` **casa
  con su propio comando** → bucle infinito. Usar `pgrep -f "npm [r]un test"`.
- Batería con `setsid nohup … &`, leer de fichero. `| tail` no muestra nada hasta el
  final; un `timeout` corto mata sin rastro.
- **El build NO caza errores de ejecución.** Un `useCallback` cuyas dependencias nombran
  un `useState` declarado más abajo compila perfecto y revienta la app al pintar.

## Arquitectura

Tres apps, cada una en su carpeta (ámbitos PWA no se anidan): `checklist/` (login) ·
`formulario/` (sin login, entra por código) · `calendario/` (login salvo enlace). Un solo
`public/sw.js` en la raíz cubre las tres con una sola caché (ver "El service worker",
más abajo).

### Firestore

```
indice/evt_<slug>-<hash>  archivo de checklists (un doc por evento)
indice/eventosGuardados   doc antiguo: SOLO se lee, foto congelada de la migración
indice/calendario         apuntes originales + los dos códigos del calendario
indice/precios            catálogo ENTERO de precios (única fuente)
indice/ratios             pax por camarero por tipo (solo lo cambiado)
calendario/<codigo>       calendario real            — enlace "?cal="
calendario/<ver>          copia de solo lectura       — enlace "?ver=" (OTRO documento)
publico/<codigo>          próximos eventos, ve la oficina
envios/<id>               lo que manda la oficina
```

`firestore.rules` se sube con `npm run reglas:deploy` (no se pega a mano). Solo
despliega reglas — ni hosting ni funciones.

**Las reglas se prueban en dos sitios, y la diferencia importa:**

- `src/__tests__/firestore-simulado.mjs` — las REESCRIBE en JavaScript. Rapidísimo y sin
  red, permite probar la sincronización entre dos dispositivos, pero comprueba lo que
  alguien CREYÓ que dicen las reglas, no lo que dicen de verdad.
- `pruebas/reglas.test.mjs` — **el motor real de Google**
  (`@firebase/rules-unit-testing`), vía `npm run reglas:emulador`. Necesita Java.

Una prueba compara siempre las colecciones de `firestore.rules` con las que el simulado
declara cubrir, para que los dos no se separen en silencio.

### Conceptos que hay que respetar

- Identidad de item = `${categoría}::${labelOriginal}`. Cambiar el label **destruye los
  checks del usuario**.
- Identidad de apunte = `${fecha}_${slug}`.
- Estado se lee con `estadoInicial.X ?? por-defecto`: **parcial es válido**.
- Abrir evento = escribir `gula_checklist_estado` + recargar.

### Cadena de datos

```
CALENDARIO          →  CHECKLIST (archivo)  →  FORMULARIO      →  CHECKLIST
nombre, tipo, día,     creada sola a 14 días   menú, barra,       material
hora, sitio, pax       marcada "sinConfigurar" equipamiento…
```

**La lista de eventos de oficina sale del ARCHIVO, no del calendario.** Por eso la
checklist se crea pronto — si no existe, oficina la escribe a mano y llega duplicada.

### El service worker (`public/sw.js`)

Un solo SW en la raíz, cubre las tres apps con una sola caché. Estrategia por tipo de
petición: `version.json` solo red (nunca cacheado, es el que detecta versión nueva);
documento (`index.html`) red primero con respaldo en caché; todo lo demás (assets con
hash, iconos, manifests) caché primero.

**Regla que ya costó un bug real (ver más abajo, "El aviso de arriba no bastaba"):
subir `VERSION` en `sw.js` cada vez que cambie el CONTENIDO de un fichero SIN hash en el
nombre** (iconos, `manifest.webmanifest`, `favicon.svg`) — aunque `sw.js` en sí no toque
esos ficheros. El navegador solo relee `ESENCIALES` cuando estos BYTES cambian; si no,
sigue sirviendo la versión vieja cacheada del origen para siempre, y ni reinstalar el
acceso directo lo arregla (esa caché vive en el origen, no en el icono del sistema
operativo).

## Rendimiento: medido ANTES de tocar

`npm run medir` (`pruebas/medir.mjs`). Cuenta pura del calendario con 250 apuntes:
~2,7 ms de aritmética. **La aritmética no es el problema, es React pintando** → nada de
`useMemo` nuevos sin medición delante.

- **El asistente se precarga en el rato muerto** (`precarga.js`).
- **La rejilla no se repinta con cada foto de Firestore idéntica** (`mismaLista()`).
- **El repaso de la noche avisa de documentos cerca del MiB** (`indice/calendario`).
- **Modo carga, la bandeja y "añadir varios" van con `React.lazy`+`Suspense`** — no
  viajan en el trozo que hay que esperar para ver la pantalla de acceso.
- **`App` entera es perezosa desde `Acceso.jsx`**: la pantalla de login pasó de 755 kB /
  293 ms a 513 kB / 95 ms `DOMContentLoaded`, porque antes `Acceso.jsx` importaba `App.jsx`
  (6.600 líneas) con un `import` normal aunque solo se renderizara tras saber si hay
  sesión — el empaquetador no ve condicionales en tiempo de ejecución.
- **Cuatro suscripciones dejaron de competir con el arranque** (memoria, objetivos,
  tareas, precios): entran en el primer rato muerto, no en el montaje.
- **Lo que NO se tocó**: los iconos (`lucide-react`, 197 kB / 63 kB gzip) son 95 iconos
  distintos de verdad usados — quitar peso ahí es una decisión de diseño, no una
  optimización.

**Respaldo de `Suspense` con estilos EN LÍNEA** (`CargandoPanel.jsx`): las clases de una
pantalla perezosa viajan DENTRO del trozo que se está descargando, así que el respaldo no
puede depender de clases que aún no existen.

## Saber qué falló, sin espiar a nadie

`src/diario.js`. Cada apunte: hora · app + compilación (`__BUILD_ID__`, permite casar una
queja con un despliegue concreto) · qué pasó · motivo limpio · datos. Tres cierres para
que no se escape un dato de persona: lista blanca de sucesos, lista blanca de datos, y
`sinDatosPersonales()` (tacha entrecomillado, correos, teléfonos, rutas de Firestore).
20 apuntes como mucho, todo en el navegador de quien los sufrió — no se sube nada.

## Tipos, solo donde salen gratis

`jsconfig.json` + `npm run tipos` (tsc `checkJs`, sin emitir, **no** es migrar a
TypeScript — solo comprueba el JSDoc de los módulos puros: fecha, texto, almacen,
precarga, diario, tema y los de cálculo). `App.jsx` de golpe daría cientos de avisos que
taparían los que importan. Tres bugs reales cazados con esto: `calcPaella` devolvía la
CADENA `"3"` en vez del número, `paxDelDiaGrande` hacía `parseInt` sobre algo que ya
podía ser número, y `esFactorValido` no comprobaba de verdad que fuera un número.

## EL ASISTENTE

Propio, inspirado en **OpenHuman**, reimplementado (no clonado — OpenHuman es Rust +
Tauri, no cabe en una web estática). Vive en `src/asistente/`, se monta con una línea:

```jsx
<BotonAsistente contexto={contextoDelAsistente({ … })} />
```

En **checklist y calendario**. NO en formulario — decisión del dueño (no rellena
formularios).

**Regla de oro: el contexto es lo único que existe para él.** Se arma en un solo sitio
(`contexto.js`), no en cada app.

### Piezas

| Fichero | Qué es |
|---|---|
| `cliente.js` | Bucle de herramientas + mensaje de sistema. Máx. 6 vueltas |
| `herramientas.js` | Propias + conectores. Cada una declara `datos` y `escribe` |
| `conectores/` | WhatsApp, correo, calendario, checklists, marketing |
| `permisos.js` | 3 niveles + lista `NUNCA` |
| `memoria.js` / `arbol.js` | Cerebro: recuerdos con fuente, árbol tema/fuente/día |
| `subconsciente.js` | Qué ha cambiado / cómo van los objetivos / qué toca hoy. Determinista, 0 tokens. **Construido y probado, sin cablear a ninguna pantalla** — ver `PLAN_MEJORAS.md` |
| `objetivos.js` / `tareas.js` | Lo que importa / lo pendiente (`fecha` opcional = recordatorio) |
| `enrutado.js` | Elige proveedor según la pregunta, cascada gratis→pago, reintenta si falla |
| `gasto.js` | Tokens/euros por proveedor, mes, día. Tope |
| `personalidad.js` | Cuatro tonos — solo cambian CÓMO habla |
| `revision.js` | Reglas de "esto no cuadra". **Puro: lo reusa el Worker** |
| `sector.js` | Banda del sector (fuentes públicas, sin validar) + `compararRatios()` |
| `actualizacion.js` | Marca/confirma la actualización pendiente entre recarga y arranque |
| `vozGemini.js` | 8 voces curadas + validación — la misma lista la usa el Worker |
| `Humano.jsx` / `Companero.jsx` | Ocho oficios (cuerpo entero y busto) + Jarvis |
| `Jarvis.jsx` | El aro: única excepción a "personas, no objetos", pedida así por el dueño |

### Los compañeros

Ocho oficios con cuerpo, **comparten un mismo cuerpo** (cambian solo cabeza/manos/pecho).
Se dibujan dos veces: cuerpo entero en `Humano.jsx`, busto en `Companero.jsx` (30px). Una
prueba de paridad compara ambos ficheros por las CLAVES de `OFICIOS`, no por texto.

**Jarvis rompe la regla, a propósito**: un aro HUD que gira y cambia de color, sin nada
compartido con el cuerpo/busto de los otros ocho. Entiende los mismos cinco estados que
el resto del asistente, con colores de tokens ya existentes. En Humano, tocarlo minimiza
el panel entero (llama al mismo `onCerrar` que el aspa) — no un tamaño intermedio.

**Colores en tokens `--pj-*`, opacos, mezclados con el fondo — nunca la misma tinta a
media opacidad**: con transparencia cada pieza solapada suma color y deja costura.

### Lecciones que no hay que repetir

- **Con el teclado abierto, el panel sigue a la zona que SE VE** (`useZonaVisible.js`,
  `--zona-alto`/`--zona-arriba` en `.asis-fondo`). En el móvil abrir el teclado no
  encoge la pantalla "de diseño": encoge `visualViewport` y lo desplaza para enseñar el
  campo, y el panel fijo a pantalla completa perdía la cabecera y los mensajes, con un
  hueco en blanco encima del campo (captura del dueño, Android). Bajar al último mensaje
  mueve SOLO la lista (`scrollTop`): `scrollIntoView` movía también la página. Se hizo
  solo para el asistente y no con `interactive-widget=resizes-content` en el viewport,
  que cambiaría el teclado en toda la app (el botón flotante se subiría encima de los
  campos). La batería lo prueba con una zona visible de mentira.

1. **Barrera de datos**: cada herramienta declara `datos: true/false`. Un proveedor que
   entrena con lo que recibe solo ve las de calcular, nunca las de nombres. Desconocida
   = sensible por defecto.
2. **El sistema no puede contradecir al nivel de permiso** — probado.
3. **Las dos apps deben encender los mismos conectores** — probado.
4. **El muñeco se dibuja en dos ficheros; prueba de paridad por CLAVES, no por texto.**
5. **Flex en columna centrado + contenido que desborda = hijos empujados fuera por
   arriba**, sin scroll. Centrar verticalmente algo que puede crecer es una bomba de
   relojería.
6. **Animar `max-height` obliga a `overflow: hidden`** — si no, contenido cortado sin
   forma de llegar. Mejor animar opacidad + desplazamiento, con scroll propio.
7. **Los ajustes SUSTITUYEN a la pestaña, no se apilan encima.**
8. **Una ruta del Worker que llama la app va DESPUÉS del OPTIONS y del origen** — si no,
   se traga el preflight CORS y da `Failed to fetch` sin motivo visible.
9. **En móvil, un panel es una hoja que crece con su contenido**, salvo Charla/Humano
   (van enteras a propósito, evitan saltos).
10. **Validar la URL de partida no basta si la ruta sigue redirects.** `analizar_web`
    revalida CADA salto (`fetchValidando`), no solo el primero — una web pública puede
    devolver un 302 a `169.254.169.254` o `localhost`.
11. **Un filtro de "red privada" en IPv4 no cubre IPv6 que mapea esa IPv4**
    (`http://[::ffff:127.0.0.1]/` es el mismo loopback). `hostBloqueado` decodifica
    primero.
12. **Un fixture de test tiene que reflejar el valor real de la API externa, no uno
    cómodo.** `expirationTime: 123` en el test colaba un bug: el caso normal de un
    `PushSubscription` real es `expirationTime: null`, y con eso "Activar avisos"
    fallaba siempre en la práctica.
13. **Un banco de pruebas con fechas "dentro de N días" se rompe en los últimos días del
    mes** — si abre por defecto el mes de hoy y los datos de mentira caen todos en el
    mes siguiente. Arreglado con un `mesInicial` fijo al mes con más apuntes de la demo.

### El proxy (Cloudflare Worker)

Claves de API fuera del bundle (repo público) — viven como secretos del Worker.

- `worker/index.js` — la fuente. `worker/pegar.js` — lo que se pega en Cloudflare
  (`npm run worker:build`). Regenerar y repegar al tocar Worker o revisión.
- **URL del Worker fuera del repo**, a propósito: vive en `indice/proxy`.
- **Varias claves de Gemini, una por cuenta de Google** (`GEMINI_API_KEY_2/_3`,
  opcionales): `gemini()` prueba en orden y solo pasa a la siguiente si el fallo es DE
  CUOTA (429/`RESOURCE_EXHAUSTED`) — otro tipo de error es el mismo en las tres cuentas.
  **Ojo con el ToS**: crear cuentas SOLO para esquivar el límite de cuota va contra las
  condiciones de Gemini; con cuentas reales del negocio no hay problema.
- **Motores gratis en la cascada** (`enrutado.js` → `ORDEN`): Gemini, Groq, Cerebras,
  Z.AI, Cloudflare Workers AI, Claude, OpenAI, Mistral, OpenRouter, NVIDIA. Todos hablan
  el dialecto de OpenAI (`dialectoOpenAI`) salvo Gemini/Claude, que tienen el suyo.
  `SIN_DATOS_DE_CLIENTES` (OpenAI, Mistral, OpenRouter, NVIDIA) excluye a los
  proveedores que pueden entrenar con lo recibido en su capa gratis — investigado con
  fuentes antes de tocar código, tabla completa en `worker/README.md`. Cloudflare
  Workers AI usa su endpoint compatible con OpenAI (no el binding nativo `env.AI.run`:
  la forma de su respuesta CON herramientas no se pudo verificar contra una cuenta real).

### El repaso de la noche

Cron del Worker: `revisarProximos()` sobre los próximos 30 días → `indice/avisos`; la
app lo enseña en *Cerebro*. **No usa el modelo** (0 tokens). Entra con cuenta "robot" de
Firebase — las reglas de Firestore siguen pidiendo sesión, sin tocarlas.

`/__repaso` a mano **pide sesión en cabecera**: no se abre en una pestaña del navegador.

### Lo que el asistente NO hace, en ningún nivel

`marcar_cargado`, `marcar_preparado`, `marcar_vuelto`, `apuntar_roturas`,
`renombrar_item`, `renombrar_categoria`, `borrar_evento`, `borrar_archivo`.

No es un permiso configurable: identidad de item = `categoría::etiqueta`, tocarlo
destruye lo marcado en el camión, sin recuperación.

**Tampoco hay una herramienta "modifica cualquier cosa de la app" genérica** — decisión
tomada y ratificada, ver `PLAN_MEJORAS.md`, "No hacer". Cada ajuste escribible es su
propia herramienta, con su propia validación.

### Tres guardias intocables (las cazaron las pruebas)

1. **Esperar `archivoListo`** antes de crear checklists.
2. **Apunte sin `id` no genera enlace** — `undefined` casa con todos los que tampoco lo
   tengan.
3. **Marcar apuntes en UNA sola escritura** — tres seguidas parten de la misma foto,
   solo sobrevive la última.

## Fallos reales cazados en producción (resumen — detalle en cada commit)

Lista corta y con enlace mental al fichero, no la narrativa completa de cada uno (ya
está en el historial de git y en las pruebas que los cubren):

- **Hover con color a pelo en el tema oscuro** (6/10) — `.item-row.is-alquiler:hover`
  ponía `#fef3c7` en los dos temas: con el ratón encima, texto blanco sobre amarillo.
  Ahora `--alquiler-bg-hover` (claro/oscuro); y lo mismo, con regla oscura al lado, en
  el ✕ de borrar, el silenciar nota y "Todo vuelto" del modo carga. La prueba de
  contraste no pasaba el ratón por encima: ahora mide la fila de alquiler con hover.
- **`buildChecklist()` no leía `leerRatios()`** — cambiar el ratio de personal (a mano o
  con el asistente) nunca llegaba a la checklist real, solo a la previsión del
  calendario. Tres generadores arreglados.
- **`App.jsx` nunca cargaba el ratio de personal de la nube** — mismo hueco que el
  anterior, en la pantalla de al lado.
- **"Eventos próximos" traía TODOS los guardados, pasados incluidos** — el modelo no
  sabía qué día era; `cliente.js` ahora manda "Hoy es..." en cada pregunta.
- **"Crear checklists" decía "Hecho" sin crear nada** — un segundo filtro de "próximo a
  14 días", pensado para el arranque automático, descartaba en silencio lo que el
  asistente ya había elegido a mano por id.
- **Voz de Gemini muda sin avisar, dos veces** — el modelo de TTS por defecto quedó
  retirado (404 silencioso → 502 → caía a la voz local sin rastro). Mismo motivo que ya
  obligó a separar `GEMINI_MODEL` del chat: Google retira nombres de modelo sin avisar.
- **La burbuja flotante se fijaba a la cabecera, no a la pantalla** —
  `animation: ... both` deja el `transform` del último fotograma puesto PARA SIEMPRE, lo
  que convierte al ancestro en el contenedor de cualquier `position: fixed` descendiente.
  Arreglado con portal a `document.body` (mismo patrón que ya tenía el panel).
- **El halo de la burbuja dejaba ver un cuadrado un instante** — animar `box-shadow`
  hasta blur+spread en `0 0` a la vez pierde el recorte circular en algunos motores.
  Arreglado dejando blur/spread siempre fijos, animando solo el color.
- **Texto partido en columnas dentro de una nota flex** — varios nodos de texto sueltos
  como hijos directos de un `display: flex` se convierten cada uno en su propio elemento
  flex. Arreglado envolviendo todo el texto en un único `<span>`.
- **La voz se quedaba muda en desarrollo (StrictMode)** — una marca de "ya dicho" se
  ponía ANTES de esperar el token de sesión; con el doble montaje de StrictMode, el
  primer montaje la marcaba y el remontado de verdad ya no decía nada.
- **`aplicar_calibracion` y `aplicar_factor_bebida` escriben el mismo dato por dos
  herramientas distintas** (una de #154, otra de esta rama) — duplicación conocida,
  documentada, decisión de unificar pendiente del dueño.
- **El logotipo "gula" quedaba a distinta distancia del pictograma en cada icono** —
  14px en checklist, 38px en calendario, 6px en formulario: cada pictograma se dibujó a
  su propio tamaño sin mirar dónde caía el logotipo (fijo en `y=404` en los tres SVG
  fuente). Arreglado envolviendo cada pictograma en su propio `translate` para igualar
  el hueco a 14px en los tres, variantes maskable incluidas. `sw.js` sube a `gula-v7`
  (mismo fichero sin hash de siempre: sin subir `VERSION` el navegador seguiría
  sirviendo los iconos viejos en caché).
- **Modo carga · Vuelta a 320px partía nombres a media palabra** ("Regleta"/"s") — la
  pastilla "vino todo" (~105px fijos) le dejaba al nombre menos de 80px de los 264 de la
  fila. `overflow-wrap: anywhere` hacía lo que tenía que hacer con ese poco sitio; el
  fallo era el sitio, no la regla. Arreglado con `min-width: 110px` en
  `.carga-row-vuelta .carga-nombre`: ahora es la pastilla la que cae a su propia línea
  cuando no cabe.
- **El calendario arrancaba SIEMPRE en claro** — `aplicarTemaInicial()` se llama en el
  arranque de la checklist y del formulario, pero se quedó fuera cuando el calendario se
  separó en su propia carpeta/app. Ni el automático por horario (oscuro de noche, justo
  cuando más se usa para logística) ni "oscuro" puesto a mano llegaban nunca ahí.
  Arreglado en `calendario/main.jsx` y en su banco de pruebas (que tenía el mismo hueco:
  por eso las capturas "oscuro" salían idénticas a las "claro").
- **Solo Gemini/Claude/OpenAI se podían elegir a mano en Ajustes del asistente** — los
  siete proveedores gratis de la cascada automática (Groq, Cerebras, Z.AI, Cloudflare,
  Mistral, OpenRouter, NVIDIA) no tenían botón, aunque estuvieran configurados: solo
  entraban en modo Automático. Ahora se ofrecen los que el Worker diga que tienen clave
  puesta (`proveedoresUI.js`), mismo orden que la cascada.

## Qué queda pendiente ahora mismo (2026-10-14)

### Estado de HOY (2026-10-14) — léelo primero si retomas (Claude, Gemini u otra IA)

**En producción** (publicado en `gh-pages`, comprobado en Actions): `main` hasta
#275 (lo posterior: `git log --oneline`). Lo último de esta tanda, con su entrada en
`HISTORIAL.md`:
- #246 a #255 Limpieza de calendario, revisión de repetidos, formulario directo sin
  checklists intermedias, manifest PWA;
- #256 a #266 Rediseño visual (fases 1–5: verde corporativo, cabeceras de categorías,
  resumen en lista en Modo carga, contraste y accesibilidad completa);
- #267 a #273 Móvil sin palabras partidas, formulario con iconos animados según contexto,
  buffets con platos, tronas (máx 3 de almacén), barbacoas desglosadas por tipo (ladrillo,
  redondas, metálica con carbón y leña), cafeteras (Nespresso según pax + de bar + grande),
  mantel de papel;
- #275 Sincronización concurrente protegida: elimina la sobreescritura accidental al arrancar
  la app con un evento en caché local mientras otra persona edita, e hidrata la pantalla
  directamente con la versión fresca de la nube;
- #276 Ratios de bebida: aviso si la calibración o ratio cae por debajo del sector. Como las
  vueltas de bebida no se registran de forma recurrente, los factores automáticos tienden a la baja
  arriesgando poner bebida de menos. Se añade comprobación centralizada contra el sector (`comprobarBebidaSector`),
  avisos en el Panel de Bebida, advertencia en auditoría de oportunidades y en la revisión de eventos.
- #277/#278 Bebida: suelo automático del sector en la calibración y aviso de cambio brusco.
- Móvil/tableta: la configuración ya no se repite debajo de la checklist; solo se ve
  abierta con "Configurar el evento" o "Eventos guardados" (ver su entrada en `HISTORIAL.md`).
- **Bebidas frías e hielo responden a las horas de cóctel y de copas (`src/calculos.js`) — HECHO**:
  cerveza, refrescos, vino, tinto de verano, vermut, hielo, tónica y Red Bull escalan ahora
  con `horasCoctel` y `horasCopas` manteniendo exactos los puntos calibrados de referencia
  (`2h` cóctel y `4h–5h` barra; detalle en `HISTORIAL.md`).
- **Orquestación de agentes y optimización de `.md` (`PLAYBOOK_AGENTES.md`) — HECHO**:
  enrutado automático por niveles de coste (N1 `flash_lite`/`Argon Low`/`haiku`, N2
  `flash`/`Argon Medium`/`sonnet`, N3 `pro`/`Argon High`/`opus`), indicador visible de
  modelo/tarea e índices por líneas en `CONTEXTO.md` y `PLAN_MEJORAS.md`.
- **Café solo para el personal (`src/checklist-generadores.js`) — HECHO**: cuando no hay
  café para invitados (`!paraInvitados`) pero sí plantilla (`numPersonal > 0`), además de la
  Nespresso y las cápsulas del personal se suman `2` de leche entera, `2` de avena y `2` sin
  lactosa (marcadas como consumibles en `src/consumibles.js`).
- **Mesas de 1,8m: 8 de cocina, 2 de gueridón, 4 por barra (≥100 pax), buffets y corners (`src/checklist-generadores.js`) — HECHO**:
  en banquete y cumpleaños se suman dentro de `Mesas de 1,8m` (y en `Manteles`) `8` mesas
  de cocina a partir de 100 pax (`4` bajo 100), `2` de gueridón, `4` mesas por barra a
  partir de 100 pax (`2` bajo 100), más las de buffet (`numMesasBuffet`) y cada corner
  activo (`llevaCornerVermut`, `llevaCornerAperol`).
- **Cocina y Logística en `Personal` unificadas con `personal.js` (`src/checklist-generadores.js`, `src/calculos.js`) — HECHO**:
  la checklist usaba todavía `Math.ceil(pax * 3 / 50)` para Cocina (dando 11 personas en 180 pax)
  y `Math.ceil(pax / 60)` sin tope en Logística; ahora usa las curvas medidas de `personalNecesario()`
  (`2` ≤40, `3` ≤60, `4` ≤120, `5` hasta 275 en Cocina; `1` ≤30, `2` ≤100, `3` ≤200 y tope `4` en Logística).

**PR abiertos que NO son para fusionar sin el dueño**: #222, #231, #233, #237
y #232 (#232 y #237 tocan seguridad: revisión humana obligatoria, ver `CLAUDE.md`). No tocarlos ni
fusionarlos por mucho que estén en verde.

**Pendiente**: la lista entera, con las decisiones que esperan al dueño, está en
`PENDIENTES.md`. Presupuesto y logística por persona NO: los lleva otra app del dueño
(ver al principio de este archivo). Cocina e inventario sí siguen aquí.

**Pendiente de datos del calendario (en Firestore, no en el código)**:
- 2026-09-30 se volvió a cruzar la hoja de Google "CALENDARIO GULA" (pestaña del
  calendario de 2026 + la de bodas, que trae también las de 2027) con lo que había en
  la app, y el dueño pegó con "Añadir varios apuntes de golpe" los 30 que faltaban.
- 2026-10-06 tercera vuelta (hoja contra los 521 apuntes de la app): las 44 bodas de
  la lista, bien; faltaban 4 y se añadieron con "Añadir varios apuntes de golpe" con
  permiso del dueño (quedan 525).
- **Sobran todavía, a borrar en la app**: 19
  apuntes que la importación del 14/9 puso en el mes equivocado. Son días del mes
  anterior/siguiente que la hoja pinta al principio o al final de cada mes y se
  leyeron con el mes del bloque. La versión buena de cada uno ya está en su día:
  - próximos (11): 28, 29, 30 y 31 de octubre (son del 28/9 al 1/10, ya confirmados),
    el "Día cerrado" del 2/11 (ya no está en la hoja) y el 4 de diciembre (es del 4/7);
  - pasados (8): 1 y 3 de abril (turnos del 1 y 3 de mayo), 1, 2, 3 y 5 de junio
    (son del 1–5 de julio).

  Las sugerencias de "Limpiar el calendario" NO los ven: solo miran los tipos que son
  evento (`esTipoEvento`: boda, comunión, corporativo, cumpleaños, producción) y casi
  todos estos son tarea, recogida o día cerrado; dice "todo en orden" con ellos dentro.
  Y el dueño no quiere borrarlos uno a uno: **"Pegar una lista de lo que sobra"** (al
  final de "Limpiar el calendario", `grupoDeLista` en limpieza.js) los marca todos de
  una vez a partir de la lista de ids que se le pasa aparte (lleva nombres: nunca al
  repositorio), y se borran con el mismo "Borrar N marcados", con confirmación y
  "Deshacer". Borrar lo pulsa el dueño: la IA no borra datos de la app. La excepción:
  el "Posible X" que la hoja ya trae confirmado ("deberías quitar los posibles", el
  dueño, 25/10). Ese lo quita la IA, sin esperar a que lo borre él: copia de seguridad
  del documento, la lista entera reescrita como la escribe la app (`saneaLista`, con la
  copia de mirar si la hay) y con la condición de que nadie lo haya tocado desde que se
  leyó (`currentDocument.updateTime`). El 25/10 se quitaron así dos (un evento de empresa
  y una producción de finales de octubre), con sus confirmados ya en el calendario. Su
  checklist en blanco sigue en Eventos guardados: esa la borra el dueño.
- Opcional, ya pasado: unos 25 apuntes que son turnos del personal ("LIBRE",
  "TRABAJA", "COCINA", "LIMPIEZA", horas sueltas como "14:00") de enero a junio,
  leídos de las filas con etiqueta en A/B.
- **Cómo leer esa hoja sin repetir el fallo** (lo que funcionó):
  - Son dos bloques de 7 columnas (C–I enero–junio, K–Q julio–diciembre), con una fila
    de mes y otra de "L M X J V S D", y luego filas de números de día seguidas de las
    filas de apuntes.
  - La fecha de cada fila de días se ancla por el DÍA DE LA SEMANA: se busca en qué
    mes (el del bloque, el anterior o el siguiente) cae ese número en esa columna, y
    se vota entre todas las celdas de la fila. Así salen bien los días que arrastran
    de otro mes, los tapados con texto ("Día cerrado") y las erratas ("16 17 17 19").
    Una fila puede mezclar números y apuntes: los números de sábado/domingo de un mes
    nuevo a veces van en la misma fila que apuntes de la semana.
  - Fila con más números que textos = fila de días: las 7 columnas pasan a la semana
    nueva, y un texto en ella es un apunte de ese día (un "Día cerrado" que tapa el
    número). Con más textos que números, los textos siguen en su día y solo avanzan
    las columnas con número (el 1 y 2 de agosto al final de una fila de apuntes de
    julio).
  - La etiqueta en A/B solo vale para la mitad izquierda (C–I): en la misma fila, la
    derecha (K–Q) trae apuntes normales (una boda de octubre en la fila de turnos de
    abril).
  - Se ignoran: las filas con etiqueta en A/B (turnos del personal), las columnas
    fuera del bloque (importes, notas sueltas) y todo lo que va debajo del calendario
    (otra tabla, "APERTURA GULA BAR", con su propio mini-calendario que da fechas
    falsas).
  - Comparar con lo que ya hay en la app por fecha y título NORMALIZADO igual, no por
    parecido: con parecido, "Posible Produ X" se daba por igual a "Produ X, 73 pax" y
    se perdía la confirmación.
  - Antes de dar el JSON, meterlo en `saneaLista` + `mezclaApuntes` contra una copia
    del calendario actual: tienen que entrar todos, ninguno repetido.
  - El JSON lleva nombres de clientes y del equipo: NUNCA al repositorio (es público).
    Se le pasa al dueño aparte y lo pega él en Calendario → "Añadir varios apuntes de
    golpe", que solo añade (no borra ni cambia nada).

**Cómo se ha trabajado esta tanda** (sirve igual para otra IA):
- Una rama por cambio, PR en borrador y fusión solo con `npm run lint`,
  `npm run tipos`, `npm run test:rapido` Y la batería completa (`npm run test`,
  ~45 min, ~2500 comprobaciones) en verde, con capturas revisadas si es visual.
- Mientras corre una batería no se toca el código de esa carpeta ("File Lock" de
  `CLAUDE.md`). Para seguir trabajando en paralelo: `git worktree add` en otra
  carpeta, con `node_modules` enlazado y otro puerto para las pruebas.
- Al fusionar en `main`, "Publicar" vuelve a pasar la batería entera y luego sube
  `dist/` a `gh-pages` (~35 min). No decir "ya está en la app" hasta que ese job
  termine en verde.

Los cinco PR de la sesión anterior, y #176/#177 de esta (condensar este archivo, igualar
el logotipo en los iconos) ya están fusionados en `main`. Confirmado con git que el
despliegue anterior (commit `b734764`) llegó a `gh-pages`; falta reconfirmar tras esta
tanda de fusiones.
