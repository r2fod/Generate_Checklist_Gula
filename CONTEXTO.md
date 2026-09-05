# Generate_Checklist_Gula — contexto para retomar

App interna de **Gula Catering** para montar la checklist de material de cada evento.
React 19 + Vite + Firebase Firestore, publicada en GitHub Pages.

- Rama `main` · Firebase: `gula-checklist`
- **Reglas del dueño → `CLAUDE.md`** (se carga solo en cada sesión). Léelo primero.
- **Estado del plan de mejoras (N1–N6, A–D) → `PLAN_MEJORAS.md`.** No se repite aquí: ese
  archivo lleva su propia tabla de hecho/pendiente por ítem, con su porqué y su tamaño, y
  apunta de vuelta aquí (`Ver CONTEXTO.md, "..."`) para el detalle técnico de cada uno.

## Orden de lectura

1. `CLAUDE.md` (ya lo has leído: se carga solo).
2. "Conceptos que hay que respetar" — identidad de item/apunte. Tocarlos sin cuidado
   borra el trabajo de quien está cargando un camión.
3. "Proceso" — cómo lanzar pruebas y deploy sin romperlo tú mismo.
4. `PLAN_MEJORAS.md` — qué falta de verdad, qué ya está cerrado.
5. "Qué queda pendiente ahora mismo", al final de este archivo — el estado de HOY.

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
- Una prueba por fallo arreglado **y por cada comportamiento nuevo**, con el porqué en su texto.
- **Esta misma nota vale para `CONTEXTO.md`**: entradas cortas, con el porqué, no un
  diario de "lo que se vio / lo que se probó" — eso es lo que hace crecer el archivo sin
  añadir nada que una sesión nueva vaya a necesitar.

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

## Lo hecho

- Calendario en colección propia, **dos enlaces**: el de mirar es otro documento, no se
  lee de vuelta → no puede tocar el real.
- **Checklists creadas solas** a 14 días al abrir la app, `sinConfigurar`.
- Enlaces rotos que se curan: borrar una checklist devuelve su apunte a pendiente.
- Precios y ratios en Firestore.
- **El asistente entero** (ver abajo): cerebro con memoria/árbol, subconsciente,
  objetivos, tareas, conversaciones, enrutado entre proveedores, tope de gasto, permisos
  por nivel, ocho compañeros animados + Jarvis, voz, conectores, diario de gasto.
- **Repaso de la noche**: el Worker mira eventos aunque nadie abra la app.

## Lo desduplicado (y lo que NO se unificó)

- **`fecha.js`** — "hoy" estaba escrito de siete maneras. Ahora hay UNA, `hoyISO()`, del
  calendario del dispositivo. **Unificarla destapó un fallo en producción todos los días
  del año**: los avisos hacían `hoy.setHours(0,0,0,0)` y `toISOString()` — poner el reloj
  a medianoche LOCAL y pasarlo a UTC da el día ANTERIOR en cualquier huso por delante de
  Greenwich (España incluida). Arreglado, con prueba, y la batería se lanza también con
  `TZ=Pacific/Auckland` para cazar esto de nuevo si vuelve.
- **`texto.js`** — `sinTildes`/`limpiaTexto`/`claveDeTexto`. **No** se tocaron
  `idDeApunte` ni `idDeNombreEvento`: ahí un carácter distinto es otro id y deja
  huérfano lo guardado. La ñ se sigue perdiendo en las claves, por lo mismo.
- **`almacen.js`** — los `try/catch` de `localStorage` en un sitio. Excepciones:
  `formulario/codigo.js` e `instalar.js` reciben el almacén COMO PARÁMETRO.
- Fallo que costó una tarde: `export { aISO } from "…"` reexporta pero **no define** el
  nombre en el módulo — las funciones que lo usaban reventaban al ejecutarse. El build no
  lo caza. Tiene prueba.

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

## Qué queda pendiente ahora mismo (2026-09-05)

Los cinco PR de la sesión anterior, y #176/#177 de esta (condensar este archivo, igualar
el logotipo en los iconos) ya están fusionados en `main`. Confirmado con git que el
despliegue anterior (commit `b734764`) llegó a `gh-pages`; falta reconfirmar tras esta
tanda de fusiones.

**Notas duplicadas en eventos YA creados (antes del fix de #169): hecho para el único
caso real que había.** Con una cuenta de servicio que dio el dueño se auditaron los 16
eventos del archivo (solo lectura primero) — solo "Evento Aryan Campana" tenía líneas
repetidas (9). Limpiado con backup previo del documento completo y verificación de que
ningún otro campo cambió. El resto de eventos ya tenía las notas limpias.

**Pendiente del dueño, no de código** — del contenido de #171 (motores gratis nuevos):
pegar `worker/pegar.js` regenerado en el panel de Cloudflare y añadir como *Secret* la
clave de cada proveedor que quiera usar — tabla completa en `worker/README.md`.

**Dos piezas grandes, planificadas, sin código todavía** (el dueño pidió explícitamente
"plan bien estructurado" para las dos — nada se arranca sin mostrarle antes una preview,
mismo criterio que ya pedía para el formulario):

1. **Cocina: escandallo → lista de la compra ("mise en place") + Presupuesto y margen
   por evento.** Plan aprobado (ver el propio plan de la sesión). Orden decidido:
   presupuesto/margen primero (reutiliza el motor de coste que YA existe en Resumen de
   Modo Carga para comida/bebida, y `totalLogistica()` para logística — solo faltan
   tarifas de sala/cocina y el presupuesto en sí), Cocina/escandallo después (parte de
   cero: recetario, menú del evento, nada reutilizable todavía). Fase 3, el asistente,
   al final. Piloto: el evento real "Aryan Campana" (ya limpio de notas duplicadas),
   para probar con datos de verdad antes de generalizar.
2. **Mejoras del formulario — HECHO, las seis.** Bug de las tronas: investigado a fondo
   (reproducción real con Playwright por los dos caminos posibles) y no se reprodujo —
   `Tronas` sale directo de `ninos` en los tres builders y ya estaba en las dependencias
   del `useMemo`; se deja una prueba de guarda por si reaparece por otra vía. El resto,
   implementado y con test: botón "ir al resumen" en cualquier pregunta; comentario libre
   y colapsable por pregunta (a `notasEvento`, sin duplicar al reenviar); pregunta de
   café (invitados/solo personal — `calcCafe` en `checklist-generadores.js`, con reserva
   modesta para el personal cuando los invitados no toman); carpas ampliadas a los cinco
   tipos de evento (cálculo compartido `calcCarpas()` en `carpas.js`, antes solo vivía en
   producción); parabanes (mobiliario nuevo, sin fórmula por pax); excepciones de mesa y
   buffets (texto libre a las notas, sin tocar el cálculo agregado todavía). Las
   producciones se verificaron aparte en cada paso: mismo resultado antes/después de
   compartir la lógica con el resto de tipos.

**Revisión visual a fondo**: primera pasada hecha (checklist, calendario, la bienvenida
del formulario) con los dos fallos de arriba. Queda el formulario paso a paso, las
pestañas Año/Equipo del calendario, y los anchos intermedios de la batería que no se
capturaron a mano.

**Y lo de siempre**: lo nuevo está probado contra datos inventados, no contra un
septiembre con tres bodas el mismo día — no parar de añadir sin haberlo usado antes.
