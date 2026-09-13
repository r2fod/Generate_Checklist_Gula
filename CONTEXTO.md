# Generate_Checklist_Gula — contexto para retomar

App interna de **Gula Catering** para montar la checklist de material de cada evento.
React 19 + Vite + Firebase Firestore, publicada en GitHub Pages.

- Rama `main` · Firebase: `gula-checklist`
- **Reglas del dueño → `CLAUDE.md`** (se carga solo en cada sesión). Léelo primero.
- **Estado del plan de mejoras (N1–N6, A–D) → `PLAN_MEJORAS.md`.** No se repite aquí: ese
  archivo lleva su propia tabla de hecho/pendiente por ítem, con su porqué y su tamaño, y
  apunta de vuelta aquí (`Ver CONTEXTO.md, "..."`) para el detalle técnico de cada uno.
- **Los tres planes grandes, sin código todavía → `PLAN_PRESUPUESTO.md`,
  `PLAN_COCINA.md`, `PLAN_INVENTARIO.md`.** En ese orden (cada uno reutiliza del
  anterior). Presupuesto ya tiene su diseño fijado por la hoja de cálculo real que
  usa hoy el negocio (capturas del dueño, no reproducidas aquí por ser el repo
  público): cuatro partidas —Personal, Comida, Bebida, Otros— con líneas sueltas
  concepto+total, y un balance final Presupuesto/Gastos/Margen. Ver el propio
  fichero para el detalle.

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

## Qué queda pendiente ahora mismo (2026-09-07)

Los cinco PR de la sesión anterior, y #176/#177 de esta (condensar este archivo, igualar
el logotipo en los iconos) ya están fusionados en `main`. Confirmado con git que el
despliegue anterior (commit `b734764`) llegó a `gh-pages`; falta reconfirmar tras esta
tanda de fusiones.

**Formulario: buffets configuran mesas de verdad, y reorden por bloques — HECHO
(PR #184, tras #182/#183 ya fusionados)**:

- **Buffets**: era texto libre a notas, sin mover ni un número de la checklist.
  Ahora es marcado múltiple (quesos, dulce/candy bar, ibéricos, croquetas, fruta,
  otro) con su nº de mesas cada uno; el total (`numMesasBuffet`) llega a la
  checklist como línea nueva "Mesas de buffet" en boda/cumpleaños (que antes no
  existía en absoluto) y en producción sube el mínimo de siempre por pax sin
  bajarlo nunca. La línea de notas se sigue viendo igual que antes
  (`resumirRespuesta()` la reconstruye).
- **Reorden del formulario**: las ~44 preguntas de `PREGUNTAS`
  (`src/formulario/preguntas.js`) se agruparon en 11 bloques temáticos
  contiguos — antes cocina/equipamiento y mobiliario de exterior estaban partidos
  en dos sitios distintos de la lista. Confirmado antes de tocar nada que el orden
  es 100% independiente de cómo llega el dato a la checklist
  (`aRespuestasDeLaApp()` lee por `id`, `Formulario.jsx` navega el array sin
  ningún índice fijo) — solo hace falta respetar las dependencias `si:`
  (tamanoPaella/cuantasPaellas tras menu, entrantePersonas tras entrante,
  estiloPlatoPostre tras estiloPlato), que se mantienen.
- Auditoría completa de integración formulario↔checklist a petición del dueño
  ("que se auto-configure"): comparados los 92 campos que la app puede configurar
  contra lo que ya rellena el formulario. Todo lo que falta está excluido a
  propósito (personal, tarifas, logística — decisiones que la oficina no puede
  saber) o ya se auto-deriva de un dato ya recogido (la temporada verano/invierno
  sale sola de la fecha). El dueño confirmó que no hace falta subir de nivel nada
  más por ahora.
- **Iconos animados del formulario — HECHO**: `FondoIconos.jsx`
  (`ICONOS_POR_PREGUNTA`) rellenado para las ~26 preguntas que caían en el icono
  genérico por defecto (carpas, parabanes, buffets, alergias...), y quitadas las
  dos entradas muertas (`sombra`, `carpasAlquiler`, preguntas que ya no existen).
  La animación en sí (iconos flotando de fondo, cambian con la pregunta) ya
  existía y ya es CSS puro y respeta `prefers-reduced-motion` — no hizo falta
  construir nada nuevo, solo completar el mapa. Verificado con capturas en
  `npm run dev`.
- **Iconos en primer plano (título y opciones) — HECHO**: el mismo juego de
  iconos por pregunta de `FondoIconos.jsx` se reutiliza ahora también delante:
  `iconoDePregunta()` pone uno fijo junto al `<h1>` de cada pregunta, y
  `iconoDeOpcion()` uno por cada botón de opción/casilla (rotando el juego si
  hay más opciones que iconos) — nada nuevo que mantener, un solo mapa de datos
  para fondo y primer plano. De paso se corrigió un desajuste: en `tipo` el
  orden de iconos no coincidía con `TIPOS_EVENTO` (Cake y Briefcase estaban
  cambiados), invisible mientras solo era fondo pero que se notaría de golpe en
  un botón. Verificado con capturas en claro y oscuro.
- **"El entrante para compartir, ¿cada cuántas?" ya no se queda solo en 3 o 4 —
  HECHO**: tercera opción "Otro número" con su propio `conNumero`, mismo patrón
  que "¿Cuántas paellas?". El número va a `entrantePersonasOtras` y
  `aRespuestasDeLaApp()` lo usa en vez del valor fijo cuando se elige "otras".

**Dos bugs reales encontrados por captura de pantalla del dueño — HECHO**:
- **Calendario, campo "Nombre" de quien trabaja invisible en desktop**:
  `.cal-asignado` (grid, `calendario.css`) daba a "horario" una columna `auto`
  sin tope, que se comía todo su ancho de contenido ANTES de que "nombre" (1fr)
  viera un solo píxel — con el modal a su ancho normal (~490px de fila),
  rol+horario+quitar ya sumaban más que la fila entera, y el campo del nombre
  se quedaba en 0px. Arreglado dándole a "horario" `minmax(0, min-content)`
  (se ofrece encogido, envolviendo sus campos en dos líneas, que es lo que ya
  sabía hacer) y a "nombre" un suelo de verdad (`minmax(140px, 1fr)`).
- **Asistente, el selector de proveedores se reseteaba a solo Gemini**:
  `disponibles` (lo que el Worker dice que tiene configurado) solo vivía en
  estado de React, sin guardarse — a diferencia de la URL o el proveedor
  elegido, que sí se guardan. Cada apertura del Asistente lo perdía hasta la
  siguiente pregunta. Arreglado guardándolo con `leerJSON`/`guardarJSON`
  (`gula_asistente_disponibles`), igual que el resto de ajustes.

**Calendario, dos apuntes iguales el mismo día ahora se distinguen — HECHO**:
pedido por el dueño ("dos camiones Covey" que se veían idénticos). Nueva
`numeraRepetidos(lista)` en `apuntes.js`: numera SOLO los apuntes de un día que
comparten título tal cual ("Camión Covey 1" / "Camión Covey 2"); un día sin
repetidos no se toca. Se usa tanto en el chip del mes como en el panel del día.

**Formulario, icono también en la pantalla de "qué evento es" — HECHO**: la
pantalla de elegir evento (`paso === -1`) tenía su propio `<h1>`/botones, fuera
del recorrido normal de preguntas, así que se había quedado sin el icono de
título/opción de la ronda anterior. Título con `iconoDePregunta("elegir")`, y
cada evento de la lista con el icono de su tipo (`iconoDeOpcion("tipo", ...)`,
buscando el índice en `TIPOS_EVENTO`) — mismo Heart/Church/Briefcase/Cake/
Clapperboard que ya se usa en la pregunta "tipo".

**Buffets, "Otro" admite varios distintos con su propio nombre — HECHO**: antes
"Otro" en la pregunta de buffets era una casilla más con un número, sin decir
QUÉ era (había que aclararlo en el comentario libre). Ahora abre una lista
(`conLista`/`campoLista`, nuevo en `preguntas.js` y `Formulario.jsx`): cada fila
tiene su nombre ("gildas", "rincón de gin-tonics"...) y sus propias mesas,
sumadas al total de `numMesasBuffet` igual que el resto. La nota del evento sale
como "gildas (1), rincón de gin-tonics (2)" en vez de un número suelto.

**Plato de postre: azul y naranja — HECHO**: pedido explícito, colores reales
que antes solo se podían meter a mano en "Otro". Dos opciones más en
`estiloPlatoPostre`, mismo mecanismo que las demás.

**Iconos del formulario, también animados en primer plano — HECHO**: el icono
del título y el de cada opción entran con un "pop" (escala + giro leve,
`form-icono-entra`, 0.4s), con un pelín de escalonado entre opciones para que
no salten todas a la vez. Respeta `prefers-reduced-motion`. El fondo flotante
ya estaba animado; esto era lo que faltaba en primer plano.

**Service worker: gula-v7 → gula-v8, sin cambiar iconos**: un dueño con la app
instalada desde antes del arreglo de distancia (#173/v7) seguía viendo el
icono viejo tras desinstalar y reinstalar el acceso directo. Medido píxel a
píxel: los tres iconos (192, 512, maskable) ya tenían el mismo hueco — el
problema era la caché del origen, que un acceso directo no toca. Subir la
versión fuerza un purgado más para quien se haya quedado atascado.

**Cajas de madera para alturas del buffet: de "—" fijo a un número real —
HECHO**: iba siempre a ojo, hubiera buffet o no. Ahora con buffet calcula de
verdad (`alturasBuffet()` en `calculos.js`): mínimo 2, y nunca más de 6 —
en el almacén hay 4 de madera y 2 de plástico, así que no puede pedir más de
lo que hay. Sin buffet se queda en "—" como siempre. En boda/comunión/
corporativo y en producción (cumpleaños no tenía esta línea).

**Hielo: se puede decir que no hace falta — HECHO**: antes se cargaba siempre,
sin preguntar (kilos, bolsas y taxis enteros de más en un sitio que ya lo da,
o en un evento que no lo necesita). Nueva pregunta "¿Llevamos hielo?" tras
congelador; con "No hace falta" (`llevaHielo: false`), `calcBebidas()` no
calcula nada y la línea "Hielo" se apaga en checklist (boda/comunión/
corporativo, cumpleaños y producción, cada uno con su propia fórmula).

**Elegir evento: distinguir los que ya se mandaron — HECHO**: en la pantalla de
elegir evento, los que ya se enviaron desde este móvil se marcan con borde/fondo
verde y un ✓ (mismo criterio que ya usaba el aviso "Ya mandaste datos de..." del
repaso). Antes cada pantalla comparaba el nombre a su manera con el mismo código
repetido dos veces; ahora ambas llaman a `buscarEnvioPorNombre()` (`mios.js`).
De paso, aclarado: la lista de "Ver lo que he mandado" vive en el propio
navegador (localStorage) — si se borran los datos del sitio (recomendado antes
para forzar el icono nuevo) se pierde esa lista cómoda, aunque lo mandado sigue
a salvo en la nube. Y confirmado que reenviar el mismo evento NO duplica: cada
envío es un documento nuevo en `envios/`, y el aviso de "ya mandaste esto" es
un recordatorio, no un bloqueo — mandar una corrección aposta es un caso válido.

**Excepciones de mesa: de texto libre a casillas con su número de mesas —
HECHO**: "cubiertos de pescado en la mesa 4, cristalería aparte en la 7..." se
escribía a mano y se leía distinto cada vez. Ahora es una pregunta `marcar`
(mismo patrón que buffets: doble tenedor, doble cuchillo, cristalería aparte,
menú infantil, otro — cada una con "Cantidad en mesa"), y la línea de notas
del evento se reconstruye con `resumirRespuesta()` igual que ya hace buffets,
así que se lee siempre igual: "Doble tenedor (3), Cristalería aparte (2)". No
toca el cálculo agregado por pax que ya existe (cubiertos/copas totales), lo
complementa — sigue siendo una excepción sobre el aviso, no un editor mesa a
mesa.

**Menú: jamonero movido a "extras", "dos platos principales" aclarado —
HECHO**: dos hallazgos revisando el formulario a fondo, a petición del dueño.
(1) "Jamonero" vivía en "¿Qué lleva el menú?", junto a la paella, pero no es
comida del menú — es un servicio que se presupuesta, como el desayuno, con
quien además comparte fórmula (`platosPostreExtra` suma jamonero + tarta +
desayuno en `checklist-generadores.js`). Movido a "¿Está presupuestado algo
de esto?", junto al desayuno. De paso corregido un efecto secundario real:
como la lectura de jamonero antes vivía FUERA del reparto boda/rodaje, un
envío de producción sobreescribía `llevaJamonero` a `false` siempre —
aunque se hubiera puesto a mano en la app — porque la opción no se ofrecía
ahí (`soloEn` la excluye) y `marcado()` daba `false` igualmente. Ahora, al
vivir dentro del bloque de "extras" (que ya no se procesa para producción),
un envío de rodaje simplemente no lo toca, como el resto del formulario.
(2) "Dos platos principales" dobla cubiertos, copas Y platos en toda la
checklist (es el mismo interruptor "Doble servicio" de la app: "dobla
cubierto, copa y plato") — para cuando se sirven los DOS platos a cada
invitado, uno detrás de otro. El texto no lo dejaba claro y podía
confundirse con un menú que simplemente deja elegir uno de los dos (que no
dobla nada). Aclarado con nota en la pregunta y texto de la opción más
explícito ("se sirven los dos"); el valor guardado (`dosPlatos`) no cambió.

**Plato de postre: añadida "Relieve blanco" — HECHO**: ya existía en el plato
principal (`estiloPlato`) pero faltaba en el de postre, para cuando el postre
se sirve en el mismo plato grande en vez de uno pequeño aparte. "Verde" ya
estaba en los dos desde antes. Sin tocar ningún valor existente (serían el
label literal de la línea de checklist — un rename sin migración según
CLAUDE.md), solo se añadió la opción nueva.

**"¿Llevamos hielo?" solo si NO se lleva congelador — HECHO**: no tiene
sentido llevar congelador y no querer hielo, así que la pregunta (justo
después de "¿Y congelador?") ahora solo aparece cuando se contesta "No
lleva" ahí. Con congelador (mediano o grande) se salta directo a la
siguiente pregunta y se asume que sí hace falta hielo, como siempre.

**Formulario reordenado en 11 bloques temáticos — HECHO**: repaso a fondo
pedido por el dueño tras varias rondas añadiendo preguntas cerca de lo que
había en cada momento, no según un mapa pensado de principio a fin. Solo
cambia el ORDEN del array `PREGUNTAS` — ningún id/valor/campoNumero/soloEn/
si/conNumero/conCampos/conArchivo se toca, así que es seguro por diseño
(`aRespuestasDeLaApp()` lee por id, `Formulario.jsx` navega el array
dinámicamente, ninguno de los dos depende de la posición). La mayoría del
orden ya coincidía con el mapa de 11 bloques (sitio y mobiliario exterior,
barra, menú, cocina, alquileres, excepciones, mantelería, recogidas,
impresión de producción, cierre) de rondas anteriores; solo hacía falta
mover "¿Hay que imprimir el menú?"/"¿etiquetas?" (solo producción) del
hueco justo después de "¿Algo distinto de lo normal?" al final, junto a
"comprar"/"alergias", que es donde de verdad encaja (justo antes del
cierre, no en medio del bloque de mobiliario/cocina). Verificado con
`npm run test:rapido` en verde SIN tocar `sincronizacion.test.mjs` (la
prueba de que el orden no afecta al dato) y recorrido visual completo de
los tres tipos de evento con Playwright.

**Elegir evento: distinguir configurados de sin configurar — HECHO**: el
evento ya llevaba la señal exacta que hacía falta —`sinConfigurar`
(App.jsx): la pone el calendario al crear un evento en blanco (solo tipo/
día/sitio/pax) y se quita sola al aplicar un formulario, o a mano con
"Ya está configurado". `resumirParaOficina()` (envios.js) ahora también
publica `configurado: !sinConfigurar` en la lista corta que ve el
formulario. En "¿De qué evento son los datos?": los sin configurar salen
primero (son los que de verdad hace falta rellenar) y los ya configurados
al final, con un badge neutro "Ya configurado" — distinto del check verde
de "ya te mandé algo" (PR #195), que es otra señal aparte y puede darse a
la vez. Al vivir en el documento del evento en Firestore (no en
localStorage de un móvil), sale igual para cualquiera que abra el enlace
del formulario, sin depender de qué móvil lo mire.

**Entrante: opción "Individual" — HECHO**: la pregunta "El entrante para
compartir, ¿cada cuántas personas?" solo tenía 3, 4 u "otro número" —
para un entrante que en realidad es individual (un plato por persona,
no compartido) había que marcar "compartir" y escribir "1" a mano en
"otro número", que no tiene sentido llamarlo "compartir". Añadida
"Individual (un plato por persona)" como opción de serie (`valor: 1`),
delante de las de 3/4 — usa el mismo cálculo que ya existía
(`personasPorPlatoEntrante = 1` da exactamente un plato extra por
persona), sin tocar la fórmula.

**Cristalería: pregunta independiente de la barra libre — HECHO**: "Cristalería
aparte" (en excepciones de mesa) confundía al dueño con otra cosa; lo que hacía falta
era una pregunta nueva, "¿Llevamos cristalería?" (`preguntas.js`, tras "copas"),
que a propósito NO depende de cóctel/copas (`si:` ninguno) — puede que no haya barra
libre y aun así se sirva vino/agua/cava con la comida. `calcCristaleria()`
(`calculos.js`) admite ahora `llevaCristaleria` (por defecto `true`, para no
tocar ningún evento ya guardado); a `false` devuelve todo a cero y las líneas de
"Vasos de agua", "Copas de vino" y "Copas de cava" desaparecen de la checklist
(`opt(...)`, boda y cumpleaños — producción no lleva cristalería). Cableado igual
que "Jarras de cristal": estado propio en `App.jsx` (con su casilla manual en
Vajilla/Cristalería, por si hay que corregirlo a mano) y `getEstadoActual()`,
para que lo que conteste el formulario se vea también en la checklist real, no
solo en la calibración del asistente.

**Buffets: desmarcar todos ahora baja las mesas a 0 — HECHO**: bug real, encontrado
al auditar la checklist a fondo. `aRespuestasDeLaApp()` solo escribía
`numMesasBuffet` cuando `r.buffets.length > 0` — si un evento ya tenía mesas de un
envío anterior y llegaba una CORRECCIÓN desmarcando todos los buffets, `r.buffets`
llegaba como `[]` (Formulario.jsx inicializa así una pantalla de "marcar" que se
pasó sin marcar nada) pero el `if` no entraba, y `numMesasBuffet` se quedaba con el
número viejo — la checklist seguía enseñando mesas de buffet que ya no había.
Arreglado distinguiendo "nunca se contestó" (`r.buffets === undefined`, no se toca,
igual que siempre) de "se contestó y no se marcó ninguno" (`Array.isArray(r.buffets)`
aunque esté vacío → `numMesasBuffet = 0` explícito). Un test afirmaba a propósito el
comportamiento viejo ("no se toca" con `buffets: []`); corregido para esperar `0`.

**Mesa alta: por nº de barras, no una fórmula fija por pax — HECHO**: segundo punto
de la misma tarea de buffets. Antes `mesasAltas = hayBarra ? Math.max(2, pax/15) :
0` (solo en boda/comunión/corporativo, ni cumpleaños ni producción llevan "Mesa
alta"). Ahora hay una pregunta "¿Cuántas barras se van a montar?" (tras
"cristalería", solo si cóctel o copas tienen horas contestadas — sin barra no tiene
sentido preguntarlo) y `calcMesasAltas(pax, numBarras)` en `calculos.js`: 2 mesas por
barra, 4 si son 100 pax o más; sin contestar (`numBarras` a 0/undefined) cae sola al
cálculo viejo por pax, así que un evento guardado antes de esto sigue dando el mismo
número de siempre. Cableado en `App.jsx` igual que "Nº de mesas de buffet": estado
propio con su casilla manual (solo boda/comunión/corporativo, gastado el mismo
criterio que "Jarras de cristal"), y "pudiendo modificarlas" ya lo cubre el mecanismo
genérico de `overridesManuales` que tiene toda la checklist — no hacía falta nada
nuevo para eso.

**Elegir evento: separar visualmente los configurados de los que no — HECHO**: el
badge "Ya configurado" (PR #201) no era suficiente para el dueño — pidió primero
colorear la tarjeta, y viendo la lista real, separar los dos grupos del todo. Ahora
la tarjeta entera de un evento configurado lleva un fondo gris neutro (`.es-configurado`
en `index.css`, a juego con el badge), y si además ya se le mandó algo desde este
móvil manda el verde de `.es-enviado` (regla combinada, es la señal más útil ahora
mismo). Y como `lista` ya venía ordenada (sin configurar primero — PR #201), se
localiza dónde empieza el bloque de configurados (`primerConfiguradoIdx`) y se mete
un separador con su rótulo justo ahí (`Formulario.jsx`, envolviendo cada fila en un
`Fragment` con key para poder intercalarlo); si no hay mezcla de los dos grupos, no
sale separador. Verificado con una maqueta estática cargando el CSS real compilado
(la lista poblada de "próximos eventos" no se puede simular en este entorno — mismo
límite ya documentado en PR #195/#201, Firestore no es alcanzable offline).

**Elegir evento: el gris de "ya configurado" se veía casi invisible — HECHO**: el
dueño mandó una captura real de producción — el 6% de opacidad de `.es-configurado`
no se distinguía del resto en el tema oscuro, solo se notaba por la etiqueta y el
separador, no por color. Subido a 16% de opacidad y borde `--border-color-strong`
(mismo gris neutro, más fuerte); sigue sin competir con el verde de `.es-enviado`,
que manda cuando se dan las dos cosas a la vez. Verificado con la misma maqueta
estática, en claro y oscuro.

**Plato de postre: "Mismo que el principal" — HECHO**: el dueño explicó que muchas
veces el postre se sirve en el MISMO plato (grande) que el principal, no en uno
pequeño aparte — obligar a repetir a mano el mismo color en la pregunta de postre no
tenía sentido. Nueva opción, primera de la lista en `estiloPlatoPostre`: "El mismo
que el principal (no uno pequeño de postre)". Al marcarla, `aRespuestasDeLaApp()`
copia el valor ya resuelto de `estiloPlatoPrincipal` (la pregunta de arriba se
procesa antes, así que ya está puesto — funciona igual si el principal se escribió
a mano en "Otro"). Solo cambia la ETIQUETA del plato de postre en la checklist; la
cantidad (`platosDoble + platosPostreExtra`) no se toca, sigue siendo un curso
aparte que necesita sus propias unidades físicas.

**"Primero + segundo": cubiertos y cristalería doblan por separado, no todo a la vez
— HECHO**: había DOS mecanismos distintos sobre "doblar" que se pisaban: el menú
("Dos platos principales") doblaba TODO (cubiertos+cristalería+plato) de golpe vía
`dobleServicio`, y `excepcionesMesa` tenía "Doble tenedor"/"Doble cuchillo"/
"Cristalería aparte" para UNA mesa concreta — el dueño pidió unificarlo:
- La opción se renombra a "Primero + segundo (se sirven los dos)". Sigue doblando
  el PLATO siempre (`dobleServicio`, sin tocar).
- Nueva pregunta de seguimiento, "¿Qué se dobla?" (`queDobla`, tras el menú, solo si
  se marcó "primero + segundo"): cubiertos (tenedor/cuchillo/cuchara) y cristalería
  (vino/agua/cava), cada uno su propia casilla. Por defecto vienen marcados los
  cubiertos (lo normal) y SIN marcar la cristalería — la misma copa se rellena
  durante toda la comida, no suele doblar, pero se puede marcar si hace falta.
  Nuevo mecanismo genérico en `Formulario.jsx`: `porDefecto` en una pregunta `marcar`
  la muestra premarcada con esa lista en vez de partir siempre de `[]`.
- `calcCristaleria()` (`calculos.js`): su parámetro `dobleCopa` ahora acepta también
  un objeto `{vino, agua, cava}` con un flag por tipo (antes solo booleano, que dobla
  vino+agua igual y nunca cava — ese comportamiento se conserva tal cual si se sigue
  pasando un booleano, retrocompatible). `checklist-generadores.js`: `cubiertosDoble`
  (una cuenta compartida) pasa a tres — `tenedorDoble`/`cuchilloDoble`/`cucharaDoble`
  — cada una con su propio flag (`dobleTenedor`/`dobleCuchillo`/`dobleCuchara`, con
  fallback a `dobleServicio` si no se contestó el seguimiento — eventos de antes de
  esta tarea siguen calculando exactamente igual que siempre).
- `excepcionesMesa` pierde "Doble tenedor"/"Doble cuchillo"/"Cristalería aparte" —
  ya las cubre la pregunta de seguimiento (que es del evento entero, que es lo que
  el dueño quería de verdad). Quedan solo "Menú infantil" y "Otro", genuinamente por
  mesa; el caso raro de una mesa suelta con doble cubierto se resuelve editando la
  línea a mano en la app (`overridesManuales`, ya existente).
- Cableado en App.jsx: seis casillas nuevas junto a "Doble servicio" (que ahora dice
  "dobla el plato", ya no "cubierto, copa y plato"), con el mismo fallback a
  `dobleServicio` al cargar un evento antiguo.

**"Bebida aparte": el cliente/la finca trae su propia bebida — HECHO**: con barra
libre (cóctel o copas) la respuesta de quién pone la bebida y la cristalería es
obvia — las pone Gula, siempre — así que las dos preguntas ("¿La bebida la trae el
cliente/la finca, o la sirve Gula?", nueva, y "¿Llevamos cristalería?", de PR #203)
ahora solo se hacen cuando NO hay barra libre (`si: (r) => !(coctel>0) &&
!(copas>0)`, `preguntas.js`), que es el único caso realmente ambiguo. Con barra, se
saltan y se calcula todo como siempre.
- `calcBebidas()` (`calculos.js`) gana `llevaBebida = true`: a `false` pone a cero
  TODO el alcohol y los refrescos (cerveza, vinos, cava, refrescos, tónica,
  redbull...) — el hielo, que tiene su propio interruptor (`llevaHielo`) y es
  aparte de la bebida, se sigue calculando igual (movido al principio de la
  función, antes del corte, para que no dependa de `llevaBebida`). El agua para el
  personal ya vivía en `calcPersonal()`, una función totalmente aparte — no hace
  falta tocar nada ahí, ya estaba desacoplada.
  Las líneas de bebida en la checklist quedan a "0" (no null): ahí siempre se ha
  visto el número, nunca una línea que desaparece — a diferencia de cristalería o
  hielo, que si se apagan sí quitan la línea entera.
- Los vasos de cubata (ligados a horas de copas, no a esto) no se tocan.
- `aRespuestasDeLaApp()`: `estado.llevaBebida = r.bebidaAparte === "no"` ("no" =
  "la sirve Gula" = sí se calcula).

**El aviso de "hay una versión nueva" llevaba dos semanas mostrando lo mismo —
HECHO**: `cambios.js` se mantiene a mano (mismo estilo que `precios.js`/`sector.js`) y
nadie la había tocado desde el 2026-08-25, así que el banner de la checklist llevaba
~30 PRs de fondo sin decir nada de lo que de verdad había cambiado — el dueño lo cazó
al ver siempre la misma nota. Añadida una entrada nueva con las mejoras reales más
recientes, en el idioma de quien carga el camión, no del código. **A partir de
ahora, tocar `cambios.js` en el mismo commit de cualquier cambio con impacto de
usuario, igual que `CONTEXTO.md`** — si no, vuelve a quedarse atrás.

**Calendario: la fila de "Asignados" se veía rota en pantallas anchas — HECHO**: el
dueño mandó una captura real de producción — en "Editar apunte" el nombre de una
persona parecía flotar entre la hora de entrada de ARRIBA y el importe/horas de
ABAJO, como si fueran de otra persona. Causa real: a partir de 560px `.cal-asignado`
pasa a una sola fila con `horario` encogido a `min-content` (`calendario.css`); si su
contenido no cabe entero, envuelve en varias líneas dentro de esa columna, y con
`align-items: center` las celdas nombre/rol/quitar (de una sola línea) quedaban
centradas verticalmente contra ese bloque alto — el nombre acababa a media altura del
horario de al lado. Con el modal a su ancho fijo (520px), esto pasa en CASI cualquier
pantalla que no sea un móvil estrecho, no es un caso raro. Arreglado con
`align-items: start` en ese breakpoint (todo se lee de arriba abajo, junto a la
primera línea de horario) y un borde separador entre cada persona (`border-bottom` en
`.cal-asignado`, quitado en la última) para que nunca se confundan dos filas
distintas aunque una envuelva. Verificado en vivo con el banco de pruebas
(`pruebas/calendario.html`), añadiendo gente de mentira a un evento y probando 320,
390, 700 y 900px en claro y oscuro.

**"Mesa alta" se quedaba en "—" sin barra libre aunque SÍ se llevaran — HECHO**: caso
real del dueño ("Antoine y María" — bebida aparte, sin barra libre ni de cóctel ni de
copas, pero sí lleva mesas altas y cristalería). La checklist tenía `mesasAltas =
hayBarra ? calcMesasAltas(pax, numBarras) : 0` (`checklist-generadores.js`): sin
barra, el "Nº de barras" contestado a mano en la app se ignoraba del todo — el único
interruptor para pedir mesas altas sin barra no servía de nada. Arreglado a
`(hayBarra || numBarras) ? calcMesasAltas(...) : 0`: con barra, igual que siempre (cae
al cálculo por pax si no se contesta); sin barra, se queda en "—" salvo que se
conteste "Nº de barras" a mano, que entonces manda igual que con barra. Nada nuevo que
rellenar: ese campo ya estaba siempre visible en boda/comunión/corporativo, solo que
no hacía nada sin barra. Verificado en vivo con un evento de mentira igual al real
(sin cóctel ni copas, "Nº de barras": 1 → "Mesa alta: 2").

**Y el formulario tampoco lo preguntaba sin barra libre — mismo commit, mismo hallazgo
del dueño, HECHO**: el arreglo de arriba deja el campo funcionando en la app, pero la
pregunta "numBarras" del formulario (`preguntas.js`) tenía `si: (r) => coctel>0 ||
copas>0` — sin barra, la oficina no podía contestarlo desde el envío y alguien tenía
que acordarse de rellenarlo a mano en la app después. Quitado el `si:`: ahora se
pregunta siempre en los tipos con barra (`CON_BARRA`), texto reescrito para que tenga
sentido sin barra libre ("¿Cuántas barras hacen falta para las mesas altas?", con nota
aclarando que se pregunta aunque no haya barra libre). Sin contestar, sigue sin
tocarse (mismo patrón de siempre) — un evento con barra de verdad se comporta
exactamente igual que antes. Verificado en vivo: la pregunta sale con cóctel y copas a
0 horas.

**Auditoría a fondo pedida por el dueño (funcionalidad, duplicidad, escalabilidad,
responsive) — HECHO, un fallo real encontrado y arreglado**:

- **`llevaHielo` y `llevaBebida` nunca llegaban a la checklist real — el hallazgo
  gordo**. `aRespuestasDeLaApp()` (`preguntas.js`) calculaba bien las dos, y
  `calcBebidas()`/los tres generadores las aceptaban y usaban bien — pero `App.jsx`
  no las tenía en NINGÚN sitio: ni `useState`, ni `SETTERS_SYNC` (el mapa que aplica
  un envío del formulario), ni el objeto `opts` que de verdad llega a `buildChecklist`,
  ni una casilla para tocarlo a mano. Resultado: contestar "no hace falta hielo" o
  "la bebida la trae el cliente" en el formulario se guardaba, pero la checklist
  seguía pidiendo hielo y bebida completos como si nadie hubiera contestado nada —
  exactamente el mismo patrón de fallo silencioso que ya cazó antes "`buildChecklist()`
  no leía `leerRatios()`". Arreglado replicando el cableado completo que ya tenía
  `llevaCristaleria` (mismo patrón, en los mismos 6-7 sitios): `useState`, entrada en
  `SETTERS_SYNC`, en `opts` y su array de dependencias, en `ETIQUETAS_CAMPO`, y una
  casilla manual junto a "Llevamos cristalería" (`llevaBebida` no sale en producción,
  que no usa `calcBebidas`; `llevaHielo` sí, en los cinco tipos). Nuevo test en
  `app.test.mjs` que desmarca las dos casillas en la app REAL (no en `buildChecklist`
  directo, que es justo lo que no habría cazado este fallo) y comprueba que la
  checklist cambia de verdad — para que esta clase de fallo no vuelva a colarse en
  silencio.
- **Limpieza menor, de paso**: `calcCristaleria()` le faltaba la línea `@param` de
  `llevaCristaleria` en el JSDoc (añadida). Y la fórmula de logística
  (`numLogisticaEquipo > 0 ? ... : Math.max(1, Math.ceil(pax/60))`) estaba escrita
  tres veces, una por generador — extraída a `calcLogistica()` en `calculos.js`,
  mismo patrón que `calcMesasCalientes`/`calcMesasAltas`.
- **Responsive**: barrido visual manual (no solo la batería automática, que ya cubre
  9 anchos × 2 temas) por las pantallas más densas en campos de las tres apps — el
  panel de configuración del evento con casi todo marcado, una lista de bebidas con
  números de tres cifras, preguntas del formulario con muchas opciones, el equipo del
  calendario — en 320/390/768/1280px, claro y oscuro. Sin desbordamiento ni solapes
  en ninguna.
- **Sin más hallazgos que mereciera la pena forzar**: código muerto (revisados los 28
  exports de `calculos.js`/`checklist-generadores.js`, todos con uso real), render
  sin memorizar, y duplicidad real entre `calculos.js` y los generadores — la
  disciplina de extraer en cuanto algo se repite (bandejas, mesas calientes, mesas
  altas, cristalería, alturas de buffet) se mantiene bien en el resto del código.

**Café del personal: se pisaba con el de invitados, en vez de sumarse — HECHO**:
encontrado por el dueño justo revisando la auditoría de arriba. `calcCafe()`
(`checklist-generadores.js`) trataba "café para invitados" y "café del personal"
como mutuamente excluyentes (`if (paraInvitados) {...} else if (numPersonal > 0)
{...}`): con invitados marcado (el caso normal), el personal se quedaba sin su
propia cafetera, dando por hecho que "tomaba prestado" de la de invitados. Pero el
personal curra las mismas horas haya o no café de invitados — su parte tiene que
calcularse SIEMPRE que haya plantilla, no solo cuando los invitados no lo piden.
Arreglado quitando el `else`: los dos bloques son independientes ahora, y con
invitados + personal a la vez salen las dos cafeteras y sus cápsulas por separado.
Sin cambios en el caso "solo personal" (ya funcionaba bien) ni en producción (no usa
`calcCafe` para el personal, tiene su propia cafetera de mantenimiento aparte).

**Entrante "Individual" como su propia casilla, no un rodeo por "compartir" — HECHO**:
el dueño señaló que en "¿Lleva entrante?" (`preguntas.js`) la única forma de decir "un
plato por persona" era marcar "Para compartir" y, en la SIGUIENTE pantalla
(`entrantePersonas`), elegir "Individual (un plato por persona)" — al revés de lo que
dice la palabra "compartir". Añadida "Individual" como tercera casilla junto a
"chupito"/"compartir" en la misma pregunta, con su propio número inline
(`individualNumero`, mismo patrón que las demás casillas de `marcar`+`conNumero`).
Al marcarla, `entranteCompartido` sale `true` con `personasPorPlatoEntrante` fijo a 1
SIN preguntar nada más — la pantalla `entrantePersonas` sigue atada solo a "compartir"
(su `si:` no cambia), así que elegir solo "individual" ya no mete una pantalla de más
en medio. Si se marcan "individual" y "compartir" a la vez (raro, pero el marcar
siempre ha permitido varias casillas), sus números se suman en una sola línea de
"Platos extra entrante" con el ratio de "compartir" — la checklist solo tiene sitio
para un ratio, no dos, limitación que ya existía antes de este cambio. Verificado en
vivo con Playwright: marcar solo "individual" y pulsar "Siguiente" salta directo a la
pregunta del café, sin pasar por "cada cuántas personas".

De paso, revisado el aviso de que "seleccionar paella corta el hilo" (pregunta menú →
tamaño → cuántas, cada una en su propia pantalla): `cuantasPaellas` tiene un porqué
para seguir aparte y no meterse como número en la propia casilla "Paella" del menú —
`calibracion.js` usa explícitamente que `numPaellas > 0` signifique "el número lo puso
alguien a mano", para NO aprender de esos eventos y no torcer el ratio automático por
pax. Si el número se autorrellenara nada más marcar "Paella" (como si fuera
`conNumero` normal), CADA evento con paella pasaría a contar como "puesto a mano" y la
calibración dejaría de tener datos limpios de qué sale de verdad con el pax solo. Por
eso NO se fusiona con la casilla del menú — pero el dueño siguió insistiendo en que
"hay cosas donde no debería estar", y repasando el orden entero contra los 11 bloques
del reorden de #184 apareció el problema real, que no era el número de pantallas sino
DÓNDE estaban: **"¿Tamaño de paella?" y "¿Cuántas paellas?" están HECHO, movidas a
"Cocina y equipamiento"** — justo después de "¿Qué horno hace falta?", antes de
"¿Lleva armario caliente?". No son preguntas de MENÚ (qué se come), son de equipo de
cocina (paellera, trípode, bombona), así que interrumpían "menú → entrante → café" con
una pregunta que no era de ese tema, y encima estaban lejos del resto de "cuánto
material de cocina hace falta" (nevera/congelador/horno/gastros), que es donde de
verdad encajan. Solo se ha movido de sitio el objeto de la pregunta dentro del array
— mismo `id`, misma `si:` (`menu.includes("paella")`, que se sigue cumpliendo:
"menu" sigue estando mucho antes) — cero cambios de lógica ni de `calibracion.js`.
Verificado en vivo: con "Paella" marcada, el recorrido para una boda ahora es
menú → entrante → café → nevera → congelador → horno → **tamaño → cuántas** →
armario caliente, en vez de menú → tamaño → cuántas → entrante → café de antes.
`npm run test:rapido` en verde (1600 comprobaciones): ningún test de
`aRespuestasDeLaApp()`/`resumirEnvio()` depende del orden del array, que es
justo la prueba de que reordenar es seguro.

**Modo carga nunca avisaba de los items de alquiler — HECHO**: el dueño lo encontró
en un evento real (sillas de Dealde) — la lista normal (`FilaItem.jsx`) pinta de
amarillo y pone el cartelito "ALQUILER" en los items de un proveedor externo (por
nombre, o marcados a mano con el ✎), pero `ModalModoCarga.jsx` descartaba ese dato al
desestructurar la tupla del item (`[label, qty, , labelOriginal, , sufijo]` — la
coma vacía era justo la marca de alquiler) y por eso ningún evento la mostraba ahí,
nunca. Arreglado:
- Extraída `esItemDeAlquiler(label, esAlquilerManual)` a `checklist-format.js` — el
  criterio (tag manual, o el nombre lleva Dealde/Carvillo/Novelda/alquiler) estaba
  copiado a mano en `FilaItem.jsx` y en el exportador de Word; ahora los tres (los dos
  de antes + Modo carga) llaman a la misma función.
- `FilaCargaPrep`/`FilaCargaVuelta` reciben `esAlquiler` y pintan `.carga-row.is-alquiler`
  (mismo `--alquiler-bg` que la lista normal) más el cartelito.
- **Dos fallos de layout cazados por la propia batería, no a ojo**: (1) el cartelito
  puesto como hermano directo del nombre le robaba ancho hasta partir palabras letra a
  letra a 320px — arreglado agrupando icono+nombre en `.carga-nombre-lead` con
  `flex-basis:100%`, que fuerza al cartelito a su propia línea sin tocar el nombre. (2)
  el gris apagado de `.carga-cantidad` sobre el fondo amarillo bajaba a 4,48 de
  contraste (el mínimo AA es 4,5) — la prueba de contraste automática lo cazó con la
  cantidad "1" de un item real; arreglado con `var(--alquiler-text)` (el mismo ámbar
  del cartelito) en vez del gris, que si sube a 4,65.
- Un test ya existente ("los alquileres están en Modo carga para marcarlos") leía el
  nombre completo de `.carga-nombre` esperando texto exacto — al añadir el cartelito
  ahí al lado dejó de coincidir. No era un fallo del test: es que el cartelito ahora
  vive en el mismo contenedor. Se corrigió apuntando a `.carga-nombre-texto` (el
  nombre puro, sin el cartelito), que es lo que ese test siempre quiso comprobar.
- Verificado con capturas en claro/oscuro a 320/390px, y `npm run test` completo:
  761 comprobaciones, 0 fallidas.

**Auditoría visual móvil pedida por el dueño ("hay cosas mal") — 2 de 3 HECHO,
1 pendiente de una decisión suya**: sesión aparte con Playwright en 320/375/390/412px,
dos temas, las tres apps. Formulario y calendario salieron limpios; en la checklist,
tres hallazgos reales, los dos primeros con la misma causa de fondo:

1. **HECHO — El contador de items y la flecha ▼/▲ de cada categoría desaparecían a
   320px, en 9 de cada 10 categorías, sin dejar rastro (ni scroll ni aviso)**.
   `.category-header` es un flex `space-between` con `.cat-name` (nombre) y
   `.cat-count` (los 3 botones ✎/⌃/⌄ + el número + la flecha, con
   `flex-shrink:0`). Sin `min-width:0`, un flex item no encoge por debajo de su
   contenido — así que a 320px, con `.cat-count` fijo, algo tenía que desbordar, y
   la tarjeta redondeada con `overflow:hidden` se lo tragaba en silencio. Arreglado
   dándole a `.cat-name` `min-width:0` y envolviendo el texto en
   `.cat-name-texto` con `text-overflow:ellipsis` — ahora el que cede es el
   NOMBRE (se recorta con "…"), nunca la píldora del contador, que es la única
   pista de cuántos items tiene la categoría y si está abierta.
2. **HECHO — La cabecera perdía la hora y el sitio del evento a 320px**. Ya se
   había arreglado una vez (ocultar cóctel/nº de conceptos en móvil, limitar a 2
   líneas) y a 375px cabe entero, pero a 320px el texto seguía necesitando algo
   más de 2 líneas y se cortaba justo antes de la hora y el sitio. Arreglado con
   `-webkit-line-clamp:3` solo por debajo de 340px (a partir de 375px sigue en 2).
3. **PENDIENTE, necesita decisión del dueño — Modo carga tapa el primer ítem con
   su propia cabecera a 320px (78% de una pantalla de móvil real, 844px, antes de
   ver el primer checkbox)**. Ya se había medido y arreglado esto una vez
   (compactar los cronómetros a una línea, documentado en `.carga-modal` en
   `index.css`), pero la tarjeta "Escaleta del día" (añadida después de aquella
   medición) se suma al título + contador + barra de progreso + tiempos estimados
   + los cronómetros de Salida, y entre todos vuelven a tapar la lista — peor que
   antes de aquel arreglo. La escaleta YA está plegada por defecto
   (`Escaleta.jsx`, `useState(false)`), así que no es "una cosa más sin plegar":
   es que hay demasiadas cosas plegadas-pero-visibles apiladas antes de la lista.
   Arreglarlo bien significa decidir QUÉ información deja de verse por defecto en
   la pantalla que usa quien está cargando el camión en vivo — una decisión de
   producto, no un bug de CSS suelto. Se deja sin tocar hasta hablarlo con el
   dueño.
- Test nuevo en `app.test.mjs` para los dos hechos: contador/flecha de TODAS las
  categorías visible a 320px, y el subtítulo con hora+sitio incluidos.
- Los tres scripts temporales de la auditoría (`_pw_audit_*.cjs`) se borraron al
  terminar, sin tocar código.

**Nueva pieza planificada, sin código todavía — vista de logística por persona +
asistente integrado** (`PLAN_LOGISTICA.md`, mismo criterio de siempre: "nada se
arranca sin mostrarle antes una preview"). El dueño pidió una pantalla para ver/elegir
a cada persona de logística (ejemplo suyo: alguien conductor, el resto de reparto) y
pedirle cambios al asistente ahí mismo ("cambia el horario a fulano", "añade tal
tarea"). Investigado antes de diseñar: hoy no hay un roster de logística como
concepto propio — `logisticaEquipo` (checklist, por evento, sin desplegable),
`apunte.personal` (calendario, por apunte) y `EQUIPO` (`calendario/apuntes.js`, el
único roster persistente, hoy solo nombre+apodos) se pisan a medias sin resolver
"quién es esta persona en general". Diseño propuesto: `EQUIPO` gana un `rol` opcional
(se dice una vez, no por evento); pestaña "Personal" nueva en el calendario con
selector + agenda de esa persona (función pura `apuntesDePersona()`, reutiliza los
apuntes ya cargados, cero peticiones nuevas); las tareas de una persona usan el
`tipo: "tarea"` que YA existe (sin colección nueva) rellenando su `personal`; y dos
tools nuevas del asistente desde el principio (`asignar_tarea_personal`,
`cambiar_horario_personal`, conector propio, ambas por `onEscribir` como el resto —
nada de una tool genérica "modifica personal"). No toca `logisticaEquipo` ni
`personal.js`/`ROLES` (cálculos de coste/plantilla ya en producción). Pendiente de
que el dueño lo revise y dé el visto bueno antes de tocar código.

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

**PR #180, FUSIONADO Y DESPLEGADO** — el dueño pidió depurar el formulario en una
ronda de revisión antes de volver a producción, en vez de fusionar commit a commit
como el resto. Lo probó en el móvil recién publicado y salieron tres cosas; tras
confirmar que la batería completa pasaba también contra el commit exacto ya en
producción (para descartar que algo se hubiera roto entretanto), dio el visto bueno,
se fusionó (`abb87eb`) y el despliegue (run #69 de "Publicar") terminó en verde:

- **El campo numérico no dejaba borrar para escribir otro número** (`onChange` hacía
  `Math.max(1, parseInt(v,10) || 1)`: vaciar el campo da `NaN`, y `NaN || 1` fuerza el 1
  en cada pulsación de borrado). Arreglado en las dos rutas donde se repetía (opción
  única y `marcar`): vacío pasa tal cual mientras se escribe, el mínimo se aplica solo
  al salir del campo si se queda vacío. Con prueba que usa `Control+A`+`Delete`, no
  `.fill()` (que sustituye el valor de golpe y no pasa por `onChange` como un dedo real).
- **El comentario libre por pregunta salía hasta donde no aporta nada**: tipo de evento
  (primera pregunta, pura clasificación), nombre/sitio (ya son texto libre, un
  comentario ahí es una tercera caja redundante) y fecha/hora (un día es un día). Ahora
  se oculta en esas tres con `SIN_COMENTARIO` (por `tipo` de pregunta) + un id suelto
  para "tipo".
- **"Mobiliario extra de alquiler" era un sí/no suelto sin decir qué es ni a quién se le
  alquila** (proveedor fijo a Event Style en `alquileres.js`). Ahora es su propia
  pregunta (como flores/minutas): qué mobiliario, a qué proveedor (vacío = Event Style,
  que sigue mandando por defecto) y la hoja del alquiler adjunta. Se añadió también
  "¿Algo más presupuestado como alquiler?" como cajón de sastre (vajilla especial,
  decoración, sonido...) con el mismo qué+proveedor+adjunto, que solo va a
  `notasEvento` — no crea una recogida automática, es la excepción que no tiene su
  propia pregunta. Los adjuntos de las dos (`archivosAlquiler`) se acumulan en el
  evento sin sustituirse al reenviar el formulario (tope de 8, por el límite de 1 MiB
  por documento de Firestore); se listan en la bandeja (`archivosDelEnvio`) y en la
  pantalla de Alquileres, con botón de quitar.
- **Gap encontrado al mirarlo**: `tipo: "marcar"` (casillas múltiples) no soporta
  `conCampos`/`conArchivo`, solo `conNumero` — por eso mobiliario/otro-alquiler son
  preguntas `opciones` propias en vez de una casilla más dentro de "extras", mismo
  patrón que ya usaban flores/minutas.

`npm run test` en verde (735 comprobaciones navegador + el resto de baterías, sin
errores de JS) antes de cada commit.

**Bug real, cazado por el dueño en producción — HECHO, fusionado en el PR #180**: en
Modo carga → Vuelta, apuntar "0" en lo que ha vuelto de Hielo (fundido/gastado entero,
lo normal) sugería marcarlo como rotura ("faltan 70"). La sugerencia de "faltan N →
apuntar como rotura" (`FilaCargaVuelta`, `ModalModoCarga.jsx`) salía para CUALQUIER
material que no volviera, sin distinguir lo que se gasta (bebida, hielo, comida,
combustible, desechables) de lo que de verdad puede romperse o perderse (cristalería,
vajilla, mobiliario, herramientas). Se repasó el catálogo entero de los tres
generadores y se creó `src/consumibles.js` (`esConsumible(categoria, label)`, por
categoría entera — Bebidas/Alcoholes/Desechables— más una lista corta de sueltos
dentro de categorías reutilizables — cápsulas de café, carbón, jabón, servilletas de
papel, bridas...— y sus excepciones inversas — el tirador de cerveza, el calentador de
agua, la cafetera, no se gastan aunque vivan en esa categoría). Por defecto (nada en
la lista) sigue sin ser consumible, que es el comportamiento de siempre: la sugerencia
de rotura no desaparece por error en lo que sí puede romperse. De paso, "Menús
especiales" (recuento de alergias) salió también de Modo carga: es informativo, no
material que se cargue o vuelva, igual que ya pasaba con "Personal".

**Segunda vuelta sobre lo mismo, pedida explícitamente ("revisa a fondo")** — dos
afinamientos más, sin PR todavía:

- **El envase no es el contenido**: "Bombonas llenas" y "Garrafa gasolina" estaban en
  `consumibles.js` como fungibles, pero eso mezclaba dos cosas — se gasta el GAS de
  dentro, no la bombona; la bombona (vacía) es justo lo que se espera que vuelva con
  el equipo, y si no vuelve sigue siendo una pérdida de verdad (a diferencia de
  carbón/leña/pastillas de encender, que no tienen envase que devolver: se queman
  enteros). Sacadas de la lista. De paso, "Vasos de chupito de plástico (barra
  libre)" —de usar y tirar, a diferencia del resto de barware— entra como fungible.
- **"Marcar todo como vuelto" ponía la cantidad COMPLETA en todo**, hielo y bebidas
  incluidos — justo lo contrario de lo normal para eso, obligando a corregir a mano
  casi todas las líneas de golpe. Ahora lo fungible se marca por defecto como "no ha
  vuelto nada" (que es su caso normal) y lo reutilizable sigue marcándose como
  "volvió completo".
- **Sin el chip "faltan N", lo fungible se quedaba sin ninguna confirmación visual**
  de que la app se había enterado del consumo (apuntar la vuelta de una bebida y no
  ver nada más no dejaba claro que hubiera pasado algo). Ahora sale un texto neutro
  ("N gastados", `.carga-consumido`) que confirma el consumo sin invitar a marcarlo
  como rotura, que ahí no pinta nada.

**Calendario: personal de un evento pasado — HECHO**. La pantalla "Equipo"
(`VistaEquipo`, `Calendario.jsx`) era la ÚNICA de toda la app que enseñaba/editaba
`apunte.personal` ("HORARIO PERSONAL EN EVENTO": nombre, rol, horario, importe) — y
solo mira los próximos `DIAS_ANTICIPACION` (14) días; el editor genérico de un apunte
(`EditorApunte`, alcanzable también para eventos pasados desde la vista Año) no tenía
ese apartado en absoluto. El personal de un evento ya cerrado (como "Aryan Campana",
el piloto del plan de Presupuesto/margen) era invisible en toda la app. Arreglado
reutilizando el mismo componente `Asignados` dentro de `EditorApunte` —funciona para
cualquier fecha, pasado incluido—, guardado junto al resto del apunte (no aparte,
para que "Cancelar" siga descartando todo el borrador de una vez). De paso, una
barrita de progreso visible sin desplegar (cuánto de la plantilla necesaria está
cubierta, `.cal-asignados-barra`) — pedido explícitamente ("que sea más visual").
Con test de extremo a extremo: crear con fecha de hace 40 días → añadir gente →
guardar → reabrir desde Año → sigue ahí.

**Encontrado de paso, revisando Modo Carga y el formulario a fondo — LOS TRES, HECHOS**:

- El interruptor de Ajustes del asistente que solo ofrece los proveedores que el Worker
  dice tener configurados (`proveedoresUI.js`, de una sesión anterior) no es un fallo:
  antes de la primera pregunta de la sesión no se sabe qué hay configurado, así que se
  asume solo Gemini. Groq/Claude/Cerebras/etc. ya están implementados en el Worker —
  para verse en Ajustes hace falta además tener su clave puesta como *Secret* en
  Cloudflare (`worker/README.md`), que es infraestructura del dueño, no código.
- **Sufijo con número derivado que no se recalculaba al editar a mano — HECHO**: Hielo
  y Carpas calculaban su sufijo UNA VEZ al generar la checklist; editar la cantidad a
  mano solo cambiaba el número de delante, el sufijo se quedaba con el texto viejo.
  `conSufijo` (`checklist-format.js`) ahora también acepta una función en vez de un
  texto fijo; se resuelve en un solo sitio (el `useMemo` de `checklist` en `App.jsx`,
  justo donde la cantidad ya lleva aplicado el override manual), que es lo que
  alimenta tanto Modo Carga como la exportación a Word. Encontrado de paso: el camino
  del asistente (`catsDeEventoGuardado()` en `calibracion.js`) lee la checklist RAW sin
  pasar por ese `useMemo` — sin el mismo arreglo ahí, `listar_checklist` habría
  enseñado una función de JavaScript en vez del texto para cualquier evento con hielo o
  carpas por alquilar. Arreglado aparte, resolviendo con el propio número del item.
- **"Mesas calientes" — HECHO**: antes solo existía en producción (automático por
  pax); ahora hay pregunta sí/no en el formulario para el resto de tipos, reusando la
  misma fórmula ya existente (`calcMesasCalientes()`, extraída a `calculos.js` para
  que los tres builders compartan la cuenta).
- **"Gastros" — HECHO**: en boda/comunión/corporativo salía "—" (se apuntaba a mano).
  Ahora sale con un mínimo de serie (`GASTROS_MINIMO`, 4) y una pregunta para subirlo
  si el menú lleva más. Cumpleaños no lo usa (todo en bandejas) y producción sigue con
  su propia cuenta (2 por chafer) — ninguno de los dos se tocó.

**Regresión real, cazada por la propia batería antes de fusionar**: `preguntas.js`
(la app del FORMULARIO) importaba `GASTROS_MINIMO` desde `checklist-generadores.js`
(el motor de cálculo ENTERO de la checklist, con todas sus dependencias) solo para no
repetir un número. Vite convirtió ese fichero en un chunk compartido entre las dos
apps — cambia el mapa de bundles y rompió el test de versión-nueva del service worker
y el recorrido del formulario (timing). Arreglado duplicando la constante como un
número local en `preguntas.js` (con comentario explicando el porqué): las tres apps
son builds separados a propósito (`vite.config.js`), y una constante suelta nunca
justifica cruzar esa frontera. De paso, el tope del bucle de "recorrer el formulario
contestando No lo sé" en `app.test.mjs` vivía pegado al número exacto de preguntas de
una boda (32) — con dos preguntas más pasó a 34 y lo superó. Subido a 45, con margen
de verdad en vez de ir pegado a la cifra exacta.

**Tres planes grandes, sin código todavía, guardados por si se retoman** —
ver `PLAN_PRESUPUESTO.md`, `PLAN_COCINA.md`, `PLAN_INVENTARIO.md` (detalle arriba,
"Orden de lectura").

**Y lo de siempre**: lo nuevo está probado contra datos inventados, no contra un
septiembre con tres bodas el mismo día — no parar de añadir sin haberlo usado antes.
