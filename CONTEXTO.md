# Generate_Checklist_Gula — contexto para retomar

App interna de **Gula Catering** para montar la checklist de material de cada evento.
React 19 + Vite + Firebase Firestore, publicada en GitHub Pages.

- Rama `main` · Firebase: `gula-checklist`
- **Reglas del dueño → `CLAUDE.md`** (se carga solo en cada sesión). Léelo primero.

## ⚠ El plan N1–N6 (CI, dedup, rendimiento, reglas, diario, tipado) ya está en `main`

Se verificó entero (`npm run test` 711/711, `TZ=Pacific/Auckland npm run test:rapido`,
`npm run reglas:emulador` 28/28 contra el motor real), se fusionó y **ya está publicado
en producción**. La rama `arena/01a02ba9-…` sigue existiendo en el remoto (fusión
limpia, sin nada que perder si se borra) por decisión del dueño, no porque falte algo
por traer de ella.

**CI y publicación, funcionando de verdad**: `.github/workflows/test.yml` y `deploy.yml`
corren solos en cada push, y `main` está protegida (PR + los dos checks obligatorios).
Un fallo real de CI ya cazado con esto en marcha: `gh-pages -u "github-actions[bot] <...>"`
—el email de bot de GitHub, sin comillas— no pasa el parser RFC 5322 estricto que usa
`gh-pages` (paquete `email-addresses`): rechaza el corchete suelto tanto en el nombre
como en la parte local de la dirección. Se entrecomilla dos veces (nombre Y dirección) y
pasa. Sin este fix, `deploy.yml` corría la batería entera (verde) y fallaba SOLO en el
último paso, el de publicar — dos veces seguidas, siempre igual, siempre instantáneo.

Por el camino de la verificación de esa rama aparecieron dos fallos reales más, los dos
arreglados y con su prueba:

1. **`pruebas/medir.mjs` tumbaba la batería completa si se lanzaba antes que `npm run
   test` en la misma sesión.** Usaba el mismo puerto (4179) que la prueba de "la app
   instalada" de `app.test.mjs`, y lanzaba Vite por `npx` — `vite.kill()` solo mata a
   `npx`, así que el Vite de verdad se quedaba huérfano ocupando el puerto. Arreglado:
   puerto propio (4180) y Vite lanzado directo (`node_modules/.bin/vite`), con una
   prueba en `calculos.test.mjs` que vigila que no vuelva a compartir puerto ni a
   pasar por `npx`.
2. **La prueba "la app instalada recibe los cambios" fallaba de verdad al lanzarla
   —no era un problema de la app.** Simulaba un despliegue renombrando solo la entrada
   y el chunk con el texto de prueba, pero no tenía en cuenta que Vite **encadena los
   hashes**: si un chunk perezoso importa a otro que cambia, su propio contenido
   cambia y por tanto también su hash. Con los tres perezosos nuevos (Modo carga, la
   bandeja, añadir varios) reexportando cosas de la entrada, la prueba dejaba un chunk
   con el nombre viejo pero el contenido tocado, y el service worker servía la copia
   que ya tenía cacheada de ANTES del cambio. Arreglado con un barrido de punto fijo
   que también renombra cualquier chunk que referencie a uno ya renombrado —así se
   simula de verdad el encadenado de hashes—. Confirmado con y sin cobertura.

**Lo que sigue pidiendo ojos humanos** (`CLAUDE.md` manda captura; ninguna prueba lo
verifica a nivel de píxel):

1. **Cerebro → El repaso de la noche, con aviso de documento cerca del MiB.** El JSX y
   las clases CSS están comprobados (por código y por una prueba de estructura), pero
   nadie ha visto la raya de color renderizada de verdad.
2. **Modo carga, la bandeja y "añadir varios items"**: el barrido de 711 los abre y
   comprueba que aparecen, pero un vistazo humano al respaldo perezoso (un instante la
   primera vez) sigue sin hacerse.
3. **PanelHielo (C2 del plan):** panel nuevo del Modo carga. Reusa clase por clase la
   estructura del panel de bebida, pero nadie lo ha visto renderizado en un móvil.
4. **PanelComida (C3 del plan):** panel nuevo del Modo carga (paella y bandejas por
   tipo, con la convención "lo vuelto es lo no usado" en la nota). Mismas clases que
   el de bebida.
5. **Sección "Oportunidades" de Cerebro (A2 del plan):** tarjetas con la raya verde
   nueva `es-oportunidad`; solo se pinta con avisos (el caso normal no suena a aviso).
6. **"Probar los proveedores" en Ajustes (B6):** botón y su lista de estados
   (`.asis-salud`); el motivo de un fallo va tal cual detrás del nombre.

**c) Hecho por el dueño** (la API le devolvía `403` a esta sesión, así que lo hizo él a
mano): `.github/workflows/test.yml` y `deploy.yml` movidos y corriendo solos, `main`
protegida con los dos checks obligatorios, y `worker/pegar.js` vuelto a pegar en
Cloudflare (confirmado con "Repasar los eventos ahora").

**d) Lo que NO está hecho de lo que se pidió**: los coeficientes de niños (ver
"Pendiente", punto 2). La calibración del hielo ya está montada (ver "Hecho"); solo
le falta que el equipo marque la vuelta en tres eventos para que el número salga solo.

## ⚠ Rama de sesión pendiente de verificar y fusionar (C2 + C3 + regla de tests)

La rama `arena/01a038bc-…` lleva **ocho commits por delante de `main`**: el **C2 del
plan** (calibración del hielo con lo que volvió), el **C3** (calibración de la comida —
paella y bandejas— con lo que volvió), la regla nueva de `CLAUDE.md` ("lo nuevo entra
con sus tests unitarios"), el **A2** (auditoría de negocio que propone mejoras), el
paquete **B2+B3+B4+B7** (frase de consultar precisa, búsqueda que no adivina,
cabecera corregida y barrido de datos reales en la batería), **B5+B6** (README real y
salud de proveedores desde Ajustes) y **B8** (línea base de pintado en el CI
nocturno — el cambio está listo, pendiente de aplicar por el dueño: la App de la
sesión no tiene permiso `workflows`, ver "Hecho"). Detalle y porqués en "Hecho".
`test:rapido` en verde (tipos + 439 calculos + 527 asistente + build +
sincronización).

**Antes de fusionar o desplegar, verificar:**

1. **La batería completa de navegador** (`npm run test`, ~45 min): contra C2, C3 y A2
   solo ha corrido `test:rapido`; `app.test.mjs` (711) es la que barre la pantalla de
   Modo carga (PanelHielo, PanelComida) y el asistente.
2. **Visto humano de PanelHielo, PanelComida y la sección "Oportunidades" de
   Cerebro** (`CLAUDE.md` manda captura): 390/412 y escritorio, dos temas, con
   `animations: "disabled"`. Los paneles reusan las clases `cal-ratios`/`cal-ratio`
   del panel de bebida y la sección reusa `cer-aviso` (tono verde nuevo
   `es-oportunidad`), pero nadie lo ha visto renderizado.
3. **El factor de hielo o de comida sin datos no es un bug**: la mecánica está montada
   y el número saldrá solo cuando el equipo marque la vuelta en 3 eventos (el hielo
   puede ser en kilos; la paella, las que no salieron). Un 1 en el panel es "aún sin
   medir", no "roto".
4. **La convención de la comida**: lo vuelto es lo NO usado — en la paella, las que
   no salieron; en las bandejas, las que no se usaron para pasar. PanelComida lo dice
   en pantalla, pero conviene que el equipo lo lea antes de marcar vueltas de verdad.
5. `worker/pegar.js` NO se ha tocado en C2/C3: el check de CI "regenerado" pasa de
   largo, no hay nada que reencolar en Cloudflare.

El resto del plan (A2, A4, C1…) sigue pendiente en `PLAN_MEJORAS.md`, en el orden
escrito allí.

## Orden de lectura

0. **El bloque de aquí arriba**, si vas a fusionar o publicar.
1. `CLAUDE.md` (ya lo has leído: se carga solo).
2. "Conceptos que hay que respetar" — identidad de item/apunte. Tocarlos sin cuidado
   borra el trabajo de quien está cargando un camión.
3. "Proceso" — cómo lanzar pruebas y deploy sin romperlo tú mismo.
4. "Pendiente" + "Hecho" — qué falta de verdad, qué ya está cerrado.

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
src/precios.js                 catálogo de precios (vive en Firestore, ver "Hecho")
src/checklist-generadores.js   qué material lleva cada tipo de evento
src/asistente/revision.js      reglas de "esto no cuadra"
worker/                        proxy de claves + repaso de la noche
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

Para lo automatizable (nada se sale del panel ni se monta sobre la cabecera): recorrer
`.asis-panel *` comparando cada caja con la del panel.

## Cómo se escribe aquí

Mira `src/asistente/` antes de escribir — el estilo es marcado y desentona rápido.

- **Comentario = POR QUÉ, no qué.** `// suma los pax` sobra; `// se lee la nube antes de
  escribir: partir de lo de pantalla pisaría lo que otro acaba de guardar` es el estilo.
  Casi todos cuentan un fallo ya ocurrido — por eso valen.
- Cabecera por fichero: `// ─── TÍTULO ───`, explica por qué existe.
- **Cero duplicación** — se extrae (`promoverApuntes`, `ajusteCompartido`,
  `companeros.js`, `asistente/texto.js` y, en la última pasada, `fecha.js`, `texto.js`,
  `almacen.js`, `tema.js`). Tres pruebas recorren `src/` y fallan si algo vuelve a
  copiarse.
- **Los avisos dicen qué hacer**, no solo qué pasó (el motivo del proveedor va tal cual,
  ahorra abrir logs de Cloudflare).
- Una prueba por fallo arreglado **y por cada comportamiento nuevo** (regla ya en
  CLAUDE.md), con el porqué en su texto.

## Comandos

```
npm run lint          # oxlint — ~108 warnings de catch(e) son de la casa; ERRORES: 0
npm run tipos         # tsc --checkJs sobre los módulos puros con JSDoc (jsconfig.json)
npm run test:rapido   # tipos + calculos + asistente + build + sincronizacion (~1 min)
npm run test          # lo anterior + app.test.mjs (navegador, ~45 min)
npm run medir         # rendimiento: cuentas puras siempre; navegador si hay chromium
npm run worker:build  # empaqueta el Worker en worker/pegar.js
npm run reglas:deploy # firebase deploy --only firestore:rules
npm run deploy        # predeploy = test; no publica en rojo
```

**387 (cálculos) + 420 (asistente) + 221 (sincronización) + 711 (navegador), 0 fallos.**
Y aparte, `npm run reglas:emulador`: 28 comprobaciones de `firestore.rules` contra el
motor real de Google (pide Java y el emulador; en el contenedor de trabajo original se
saltaban — otra sesión, con Java y chromium disponibles, los ha lanzado los dos).
Batería completa: **~45 min** (barrido responsive: 9 anchos × 2 temas × 10 pantallas =
180 cargas). No está colgada.
Confirmado en verde de punta a punta (ver "Estado de la rama" arriba del todo).

### CI y publicación (`.github/workflows/*.yml`, ya en su sitio y corriendo solos)

En cada push/PR: `npm ci` + `lint` + `test:rapido`, y un trabajo aparte que regenera
`worker/pegar.js` y falla si sale distinto del subido (si la fuente cambió y nadie lo
regeneró, el repo dice una cosa y Cloudflare corre otra). El barrido del navegador va en
un tercer trabajo, solo de noche (04:00 UTC) o a mano: 45 min en cada empujón y nadie
mira el resultado.

**`ci/deploy.yml`** publica en Pages al fusionar en `main` (y a mano con *Run workflow*).
Copia la regla del `predeploy` de siempre —**no se publica en rojo**—: el trabajo que sube
`dist/` depende de otro que lanza la batería ENTERA, barrido del navegador incluido
(~45 min). Sigue empujando a la rama `gh-pages`, que es lo que hay configurado hoy en
Settings → Pages, así que no cambia de sitio nada y publicar a mano con `npm run deploy`
sigue funcionando igual. Usa `npm run build`, no `npm run deploy`, para no repetir los
45 minutos que el trabajo anterior ya pasó.

**Ya movidos.** Vivían en `ci/` porque GitHub rechaza el push entero cuando una App sin
permiso `workflows` toca `.github/workflows/` (*"refusing to allow a GitHub App to
create or update workflow"*) — solo el dueño podía moverlos, y lo hizo a mano desde la
web de GitHub.

### Proceso — costó deploys rotos y trabajo perdido

- **No editar mientras corre `test`/`deploy`**: `deploy` publica `dist/` al terminar →
  reconstruir a medias publica sin probar.
- Una cosa a la vez: los dos usan el puerto 4178.
- **Commit + push en cuanto está verde.** El contenedor se recicla; lo no subido se
  pierde (ya pasó).
- **Rama que abres, rama que borras al fusionar.** No la dejes "por si acaso" — se
  acumulan (llegaron a juntarse 10, todas con 0 diferencias contra `main`).
  **Sin permiso en este entorno**: ni `git push origin --delete <rama>` ni el refspec
  `git push origin :<rama>` — ambos dan `403`, y no hay herramienta de GitHub para
  borrar refs. Pídeselo al dueño (Settings → Branches, papelera 🗑️).
- Matar procesos por PID; `pkill -f` se mata a sí mismo. `pgrep -f "npm run test"` **casa
  con su propio comando** → bucle infinito. Usar `pgrep -f "npm [r]un test"`.
- Batería con `setsid nohup … &`, leer de fichero. `| tail` no muestra nada hasta el
  final; un `timeout` corto mata sin rastro (pasó: exit 143).
- **El build NO caza errores de ejecución.** Un `useCallback` cuyas dependencias nombran
  un `useState` declarado más abajo compila perfecto y revienta la app al pintar (página
  en blanco; síntoma real: un locator del barrido esperando 30s a un botón inexistente).

## Arquitectura

Tres apps, cada una en su carpeta (ámbitos PWA no se anidan): `checklist/` (login) ·
`formulario/` (sin login, entra por código) · `calendario/` (login salvo enlace).

### Firestore

```
indice/evt_<slug>-<hash>  archivo de checklists (un doc por evento)
indice/eventosGuardados   doc antiguo: SOLO se lee, foto congelada de la migración
indice/calendario         apuntes originales + los dos códigos del calendario
indice/precios            catálogo ENTERO de precios (única fuente, ver "Hecho")
indice/ratios             pax por camarero por tipo (solo lo cambiado)
calendario/<codigo>       calendario real            — enlace "?cal="
calendario/<ver>          copia de solo lectura       — enlace "?ver=" (OTRO documento)
publico/<codigo>          próximos eventos, ve la oficina
envios/<id>               lo que manda la oficina
```

`firestore.rules` ya **no se pega a mano**: hay `firebase.json` y se sube con
`npm run reglas:deploy` (la primera vez: `npm i -g firebase-tools`, `firebase login`,
`firebase use gula-checklist`). Solo despliega reglas — ni hosting ni funciones.
Repo y consola se separaban en cuanto alguien tocaba una y olvidaba la otra.

**Las reglas se prueban en dos sitios, y la diferencia importa:**

- `src/__tests__/firestore-simulado.mjs` — las REESCRIBE en JavaScript. Rapidísimo y sin
  red, y es lo que permite probar la sincronización entre dos dispositivos. Pero
  comprueba lo que alguien creyó que dicen las reglas, no lo que dicen: un paréntesis mal
  puesto en `firestore.rules` no lo caza. Ya cubre `publico/` y `envios/` (crear sí,
  listar no, corregir solo mientras nadie lo haya revisado, fecha del servidor); antes las
  denegaba todas, y eran las únicas colecciones a las que se llega SIN sesión.
- `pruebas/reglas.test.mjs` — **el motor real de Google**, con
  `@firebase/rules-unit-testing` cargando `firestore.rules` tal cual se despliega:
  `npm run reglas:emulador` (o `npm run reglas:test` con el emulador ya levantado).
  Necesita Java y bajar el JAR una vez; si no está, avisa y se salta en vez de fallar.
  **En el contenedor de trabajo no corre** (sin Java y con la descarga cortada), así que
  el único sitio donde de verdad se comprueban hoy es el trabajo `reglas` de CI.

Y para que los dos no se separen en silencio, hay una prueba —de las que corren
siempre— que compara las colecciones de `firestore.rules` con las que el simulado
declara cubrir, y que el "todo lo demás, denegado" del final sigue en su sitio.

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

## Lo hecho

- Calendario en colección propia, **dos enlaces**: el de mirar es otro documento, no se
  lee de vuelta → no puede tocar el real. Códigos en `indice/` (pide sesión): de ver no
  se pasa a editar.
- **Checklists creadas solas** a 14 días al abrir la app, `sinConfigurar`, aviso en
  pantalla + etiqueta en archivo. Se apaga al aplicar el envío del formulario.
- Enlaces rotos que se curan: borrar una checklist devuelve su apunte a pendiente. Lo
  pasado no se resucita.
- Precios y ratios en Firestore. Aviso "ratio sin comprobar" se apaga al ponerlo.
- Responsive medido a 9 anchos con `revisaCaja()` de la batería.
- Logo 67 → 11 kB (WebP 450px q80).
- **El asistente entero** (ver abajo): cerebro con memoria/árbol, subconsciente,
  objetivos, tareas, conversaciones, enrutado entre proveedores, tope de gasto, permisos
  por nivel, ocho compañeros animados (7 gestos), voz, conectores, diario de gasto por
  vuelta, cuatro personalidades.
- **Sin markdown en respuestas**: se pide en el sistema Y se limpia en `sinMarcas()`
  (pedirlo no basta — el modelo se olvida y no avisa).
- **Repaso de la noche**: el Worker mira eventos aunque nadie abra la app.
- **Limpieza del repo**: 3 nombres reales colados en pruebas, cambiados por inventados.
  Fixtures nuevas → nombres inventados, siempre.

## Lo desduplicado (y lo que NO se unificó)

- **`fecha.js`** — "hoy" estaba escrito de siete maneras y no todas daban el mismo día.
  Ahora hay UNA, `hoyISO()`, y es la del calendario del dispositivo, porque las fechas de
  esta app son días que escribe una persona ("la boda del 12"), no instantes. También
  `enDiasISO(n)` (suma por días de calendario: los del cambio de hora tienen 23 y 25) y
  `diaDeMs(ms)`. En el Worker no hay huso —Cloudflare va en UTC—, así que allí devuelve
  exactamente lo que devolvía antes.

  **Y unificarlas destapó un fallo que estaba en producción todos los días del año.** Los
  avisos de recogidas hacían `hoy.setHours(0,0,0,0)` y luego `toISOString()`: poner el
  reloj a medianoche LOCAL y pasarlo a UTC da el día ANTERIOR en cualquier huso por
  delante de Greenwich, o sea siempre en España. La ventana de avisos iba corrida un día
  y el "hoy" que viajaba a la interfaz era ayer. Arreglado, con prueba.

  La batería se lanza ahora también con `TZ=Pacific/Auckland`: las fixtures que fijaban
  fechas con `toISOString` mentían en husos por delante de Greenwich, y con eso se cazó.
  Hay una prueba que prohíbe volver a sacar un día de calendario de `toISOString()`.
- **`texto.js`** — `sinTildes` (3 conectores + `enrutado.js`, y con otro nombre en
  herramientas, menús especiales, apuntes y checklist-format) y
  `limpiaTexto`/`claveDeTexto` (memoria, objetivos, tareas, conversaciones). **No** se
  tocaron `idDeApunte` ni `idDeNombreEvento`: ahí un carácter distinto es otro id y deja
  huérfano lo guardado. La ñ se sigue perdiendo en las claves, por lo mismo.
- **`almacen.js`** — los 13 `try/catch` de `localStorage`. `guardarJSON` devuelve si
  pudo: lo necesitan las conversaciones para tirar la mitad vieja cuando no cabe.
  Excepciones: `formulario/codigo.js` e `instalar.js` reciben el almacén COMO PARÁMETRO.
- **`aplicarTemaInicial` → `tema.js`** — estaba copiada en los dos arranques.
- Fallo que costó la tarde: `export { aISO } from "…"` reexporta pero **no define** el
  nombre en el módulo, así que las funciones de `apuntes.js` que lo usaban reventaban al
  ejecutarse. El build no lo caza. Tiene prueba.

## Rendimiento: medido ANTES de tocar

`npm run medir` (`pruebas/medir.mjs`). Las cuentas puras corren siempre; la parte de
navegador necesita el chromium de `app.test.mjs` y, si no está, se salta y lo dice.

Cuenta pura del calendario (node 22): con **250 apuntes**, una pintada entera del mes son
**~2,7 ms** de aritmética (saneaLista 0,7 · porDia 0,46 · próximos 0,18 · choques 0,31 ·
rejilla+disponibles 1,75). Con 500, ~5,7 ms. **La aritmética no es el problema**, lo es
React pintando casillas → **nada de `useMemo` nuevos aquí**.

Con esa medición delante se cambió solo esto:

- **El asistente se precarga en el rato muerto** (`precarga.js`, `requestIdleCallback`
  con respaldo `setTimeout`), llamado UNA vez desde `BotonAsistente.jsx`, que es el sitio
  compartido por las dos apps. Quien lo abre ya no espera a la red de una finca.
- **La rejilla no se repinta con cada foto de Firestore**: cada escritura dispara dos
  (local y confirmada) con listas nuevas que dicen lo mismo. `mismaLista()` (pura, en
  `apuntes.js`) compara por contenido y el hook deja el estado intacto si no hay novedad.
- **Animaciones en bucle**: las 30 usan `transform`/`opacity` salvo tres de pintado (el
  degradado del logo, la boca del muñeco, el aro del micro) que no provocan reflow. Hay
  prueba que falla si alguien anima en bucle algo que mueva la maqueta.
- **El repaso de la noche avisa de documentos cerca del MiB** (`indice/calendario` y
  `indice/eventosGuardados`): al 75 % avisa, al 90 % urge, y dice qué hacer. Sale en
  *Cerebro*. Sin esto el techo lo descubre quien no puede guardar una boda un sábado.

Banco de pruebas, dos modos nuevos: `?muchos=250` (calendario lleno) y `?boton=1` (el
botón del asistente, para cronometrar del clic al panel).

### Lo que se descarga al abrir la checklist (medido en bytes, no a ojo)

Las tres pantallas gordas ya no viajan en el trozo que hay que esperar mirando la
pantalla: **Modo carga** (723 líneas, solo la ve quien carga un camión), **la bandeja de
la oficina** y **añadir varios items** van con `React.lazy` + `Suspense`.

| Trozo inicial de la checklist | Antes | Después |
|---|---|---|
| `checklist-*.js` | 168,4 kB (50,1 gzip) | **129,3 kB (39,3 gzip)** |

Son 11 kB gzip menos que descargar, analizar y ejecutar antes de ver nada, y encima el
JavaScript que se deja de ejecutar en el arranque es el que más pesa al pintar. Modo
carga se precarga sola en el primer rato muerto (`alSobrarTiempo`): en el almacén, con la
cobertura justa, no se espera a la red con el camión delante.

**El respaldo de `Suspense` va con estilos EN LÍNEA** (`components/CargandoPanel.jsx`):
las clases de esas pantallas viajan dentro del trozo que se está descargando, así que
mientras carga todavía no existen y el respaldo saldría descolocado. Hay prueba de que
ninguna pantalla perezosa se pinta sin su `Suspense` — sin él, React no avisa: lanza al
pintar y deja la pantalla en blanco.

**Cuatro suscripciones dejaron de competir con el arranque**: memoria, objetivos, tareas
y precios no se ven en la primera pantalla, así que entran en el primer rato muerto
(`asistente/suscripcionDiferida.js`, que además borra los cuatro efectos idénticos que
había en `App.jsx`). Sin `clave` en `alSobrarTiempo` a propósito: la deduplicación es
permanente y en StrictMode el efecto se monta dos veces, así que con clave la segunda
vuelta se saltaba y la app se quedaba SIN suscripción.

**Lo que NO se tocó, y por qué:** los iconos (`lucide-react`) son 197 kB / 63 kB gzip, el
trozo más grande de todos — pero son **95 iconos distintos** de verdad usados, no un
barril mal sacudido. Quitar peso ahí es quitar iconos, que es una decisión de diseño, no
una optimización.

## Saber qué falló, sin espiar a nadie

`src/diario.js`. Antes, "esta mañana no me dejaba guardar" no se podía mirar: estaba en
la consola de un móvil ya cerrado. Cada apunte va **estructurado y siempre igual**:
hora · [en qué app y con qué compilación] · qué pasó · motivo limpio · datos.

La compilación (`__BUILD_ID__`, el mismo que va en `version.json`) es lo que permite
casar una queja con un despliegue concreto: un móvil de montaje puede llevar días con el
bundle viejo en caché, porque los `.js` van con hash y un `index.html` antiguo sigue
apuntando a la compilación antigua. El "dónde" sale de la CARPETA (checklist/,
formulario/, calendario/), no de nada que escriba una persona.

Qué queda apuntado hoy: los tres fallos de nube, el asistente cuando el proveedor
falla, la pantalla rota, y **que el navegador no haya podido guardar el estado** — eso
último es lo más grave que puede pasar en la checklist (el trabajo no se está guardando)
y hasta ahora ocurría en silencio. Ahora los fallos de nube y los de pantalla quedan
apuntados **en el navegador de quien los sufrió** (no se sube nada) y se copian de un
toque desde la pantalla de fallo. Tres cierres para que no se escape un dato de persona:
lista blanca de sucesos, lista blanca de datos (números, booleanos y etiquetas cortas —
el texto libre no entra) y `sinDatosPersonales()`, que tacha lo entrecomillado (en esta
app suele ser el nombre de un evento), correos, teléfonos y rutas de Firestore. 20
apuntes como mucho.

## Tipos, solo donde salen gratis

`jsconfig.json` + `npm run tipos` (tsc con `checkJs`, sin emitir). **No es una migración
a TypeScript**: solo comprueba el JSDoc de los módulos puros. Hoy son **trece**: `fecha`,
`texto`, `almacen`, `precarga`, `diario`, `tema` y los de cálculo — `calculos`, `bebida`,
`mesas`, `manteles`, `carpas`, `paella`, `alquileres`. `App.jsx` de golpe daría cientos
de avisos, y una lista que nadie mira tapa la que importa. Para añadir uno: que sea puro,
meterlo en `include` y dejarlo verde en el MISMO commit.

Los 91 avisos que salieron al meter los de cálculo eran casi todos "esto no dice qué
recibe", pero **tres eran de verdad** y se arreglaron con el tipo delante:

- `calcPaella` devolvía la CADENA `"3"` cuando el número de paelleras venía de un
  `<input>` (`"3" > 0` es cierto, y se pasaba tal cual a la checklist).
- `paxDelDiaGrande` hacía `parseInt` sobre algo que podía llegar como número.
- `esFactorValido` se apoyaba en `Number.isFinite` con un valor sin tipo; ahora comprueba
  también que sea un número de verdad y avisa a quien la llama (`n is number`), que es lo
  que hacía falta para que `factorDe` no devolviera `null` disfrazado.

`src/globales.d.ts` declara `__BUILD_ID__`, que no existe en ningún fichero: lo sustituye
Vite al compilar.

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
| `herramientas.js` | 18 propias + conectores. Cada una declara `datos` y `escribe` |
| `conectores/` | WhatsApp, correo, calendario, checklists — hueco por donde crece |
| `permisos.js` | 3 niveles + lista `NUNCA` |
| `memoria.js` / `arbol.js` | Cerebro: recuerdos con fuente, árbol tema/fuente/día |
| `subconsciente.js` | Repaso al abrir. Determinista, 0 tokens, sin red |
| `objetivos.js` / `tareas.js` | Lo que importa / lo pendiente |
| `enrutado.js` | Elige proveedor según la pregunta |
| `gasto.js` | Tokens/euros por proveedor, mes, día. Tope |
| `personalidad.js` | Cuatro tonos — solo cambian CÓMO habla |
| `texto.js` | `sinMarcas()` — quita markdown de las respuestas (lo genérico está en `src/texto.js`) |
| `revision.js` | Reglas de "esto no cuadra". **Puro: lo reusa el Worker** |
| `sector.js` | Banda del sector (fuentes públicas, sin validar) + `compararRatios()` |
| `actualizacion.js` | Marca/confirma la actualización pendiente entre recarga y arranque |
| `vozGemini.js` | 8 voces curadas + validación — la misma lista la usa el Worker |
| `Humano.jsx` / `Companero.jsx` | Ocho oficios (cuerpo entero y busto) + Jarvis |
| `Jarvis.jsx` | El aro: única excepción a "personas, no objetos", pedida así por el dueño |
| `companeros.js` | LISTA de compañeros + `companeroValido()`, aparte para node |

### Los compañeros

Ocho oficios con cuerpo: cocinera, cocinero, camarero, camarera, logística, parrillero,
sumiller, repostera. **Comparten un mismo cuerpo**, cambian solo cabeza/manos/pecho —
ocho torsos distintos se descuadran al tocar uno.

Empezaron como objetos con cara (gorro, cazuela, paella) y no funcionaban: un objeto
solo se inclina, así que los 7 gestos se quedaban en un balanceo.

Se dibujan **dos veces**: cuerpo entero en `Humano.jsx` (pestaña Humano), busto en
`Companero.jsx` (cabecera, 30px — una persona entera ahí es una mancha). Lista en
`companeros.js`; una prueba compara ambos ficheros (añadir en uno solo → desaparece en
el otro al elegirlo).

**Y un noveno que rompe la regla, a propósito.** El dueño pidió un aro tipo HUD que gire
y cambie de color en vez de una persona — justo lo que "objetos con cara" descartaba
arriba. Vive en `Jarvis.jsx`, generado por número (marcas y barras en bucle, no a mano)
y sin nada compartido con el CUERPO/BUSTO de los otros ocho: ni parpadeo, ni gestos por
herramienta (esos son de alguien con brazos). Entiende los mismos cinco estados que ya
usa el resto del asistente —quieto, pensando, oyendo, hablando, error— cada uno con su
color, tomado de tokens que ya existían (`--pj-fuego`, `--accent`, `--green-qty`,
`--error-texto`) para no inventar una paleta nueva. `Companero.jsx` y `Humano.jsx` lo
detectan por `cual === "jarvis"` y devuelven `<Jarvis>` antes de tocar el resto del
dibujo; en la prueba de paridad lleva una entrada `jarvis: null` en los dos `OFICIOS`
—nunca se lee, solo está para que la prueba lo siga contando como "en los dos sitios"—.

Colores en tokens `--pj-*`, con versión oscura (blanco sobre fondo oscuro deslumbra).
**Opacos, mezclados con el fondo — nunca la misma tinta a media opacidad**: con
transparencia cada pieza solapada sumaba color y dejaba costura (cuello a través de la
chaquetilla).

### Nueve trampas que no hay que repetir

1. **Barrera de datos.** Cada herramienta declara `datos: true/false`. A un proveedor
   que entrena con lo que recibe (OpenAI) solo se le ofrecen las de calcular, nunca las
   que devuelven nombres — y si aun así pidiera una, el cliente la rechaza. Herramienta
   desconocida = sensible por defecto.

2. **El sistema no puede contradecir al nivel de permiso.** Había una línea suelta
   ("No puedes cambiar nada todavía") de cuando de verdad no escribía. En Confianza el
   modelo recibía las dos órdenes y obedecía la equivocada. Hay prueba que lo vigila.

3. **Las dos apps deben encender los mismos conectores.** Calendario los tenía, checklist
   no → mismo asistente, respuesta distinta según por dónde lo abrieras. Prueba compara
   ambos ficheros.

4. **El muñeco se dibuja en dos ficheros.** Añadir uno solo en uno → desaparece en el
   otro al elegirlo. Prueba de paridad lee las CLAVES del objeto `OFICIOS`, no el texto
   de la línea (mirar el formato exacto avisaba de fallos inexistentes).

5. **Flex en columna centrado + contenido que desborda = hijos empujados fuera por
   arriba**, sin llegar ni con scroll. `.hum` centrado + pantalla que crece → muñeco
   218px fuera, invisible detrás de los ajustes. Centrar verticalmente algo que puede
   crecer es una bomba de relojería.

6. **Animar `max-height` obliga a `overflow: hidden`.** Los ajustes, siendo hijos flex
   de un panel que los encogía, quedaban cortados sin forma de llegar (botón imposible
   de pulsar). Ahora animan con opacidad + desplazamiento, con su propio scroll.

7. **Los ajustes SUSTITUYEN a la pestaña, no se apilan encima.** Apilados se comían media
   pantalla de móvil en las cinco pestañas a la vez.

8. **Una ruta del Worker que llama la app va DESPUÉS del OPTIONS y del origen**, contesta
   con `json()`. La app llama con `fetch` + cabecera `authorization` → el navegador manda
   antes un OPTIONS. Puesta arriba, se tragaba ese OPTIONS y contestaba sin CORS →
   `Failed to fetch` sin motivo visible. Prueba comprueba el ORDEN en el fichero.
   `/__estado` no lo sufre: se abre como navegación, no como fetch.

9. **En el móvil el panel es una hoja que crece con su contenido**, no pantalla completa
   siempre (Gasto: 844px de panel para 296 de contenido → 426 en blanco parecían algo
   sin cargar). Charla y Humano sí van enteras a propósito (evitan saltos). Lo decide la
   clase `es-<pestaña>` del panel.

### El proxy (Cloudflare Worker)

Claves de API fuera del bundle (repo público) — viven como secretos del Worker, que
comprueba sesión del equipo.

- `worker/index.js` — la fuente, se lee y edita.
- `worker/pegar.js` — lo que se pega en Cloudflare (fuente + `revision.js` empaquetada,
  `npm run worker:build`). Regenerar y repegar al tocar Worker o revisión.
- **URL del Worker fuera del repo**, a propósito: vive en `indice/proxy`; el primero que
  la configura la deja para el equipo. Decisión en `src/asistente/proxy.js` (probado).
  **Trampa ya arreglada:** solo subía al teclearla → quien la puso antes de este reparto
  se la quedaba para él, los demás veían el campo vacío. Ahora, si la nube no la tiene y
  este navegador sí, se sube sola al abrir el asistente.

**Varias claves de Gemini, una por cuenta de Google.** El dueño preguntó si se podían
usar varias cuentas suyas de Gmail para no quedarse sin la cuota gratis de Gemini a
media tarde. `GEMINI_API_KEY` sigue siendo la única obligatoria; `GEMINI_API_KEY_2` y
`GEMINI_API_KEY_3`, opcionales, son claves de OTRAS cuentas de Google, cada una con su
propia cuota gratis aparte (se sacan igual que la primera, en
<https://aistudio.google.com/apikey>, iniciando sesión con esa cuenta). La función
`gemini()` en `worker/index.js` prueba las que estén puestas en orden y solo pasa a la
siguiente si el fallo es DE CUOTA (HTTP 429 / `RESOURCE_EXHAUSTED`) — un error de otro
tipo (clave mal puesta, modelo retirado) es el mismo en las tres cuentas, así que
insistir con otra clave solo tardaría más en decir lo mismo. `clavesGemini(env)` — el
filtrado de qué claves hay puestas y en qué orden — está exportado y probado aparte
(`src/__tests__/asistente.test.mjs`) porque el resto de `gemini()` necesitaría mockear
`fetch` y la respuesta entera de la API para probarse de verdad. **Ojo con el ToS:**
crear cuentas de Google SOLO para esquivar el límite de cuota suele ir contra las
condiciones de uso de Gemini; con cuentas reales del negocio, sin ese propósito, no hay
problema — se lo advertí al dueño antes de tocar nada.

### El repaso de la noche

Cron del Worker: `revisarProximos()` sobre los próximos 30 días → `indice/avisos`; la
app lo enseña en *Cerebro*. **No usa el modelo** (0 tokens, sin depender de proveedor).
Entra con cuenta "robot" de Firebase (secretos del Worker) — las reglas de Firestore
siguen pidiendo sesión, sin tocarlas.

`/__repaso` a mano **pide sesión en cabecera**: no se abre en una pestaña del navegador
(se documentó mal una vez). Botón "Repasar los eventos ahora" en ajustes del asistente,
único sitio con el token.

### Lo que el asistente NO hace, en ningún nivel

`marcar_cargado`, `marcar_preparado`, `marcar_vuelto`, `apuntar_roturas`,
`renombrar_item`, `renombrar_categoria`, `borrar_evento`, `borrar_archivo`.

No es un permiso configurable: identidad de item = `categoría::etiqueta`, tocarlo
destruye lo marcado en el camión, sin recuperación y sin saber por qué.

### Tres guardias intocables (las cazaron las pruebas)

1. **Esperar `archivoListo`** antes de crear checklists — con el archivo bajando, un
   evento no consta aún; se crearía uno encima pisando la buena.
2. **Apunte sin `id` no genera enlace** — `undefined` casa con todos los que tampoco lo
   tengan, marca media lista con el nombre equivocado.
3. **Marcar apuntes en UNA sola escritura** — tres seguidas parten de la misma foto,
   solo sobrevive la última.

## Plan de mejoras por niveles (N1–N6) — estado

El plan lo dio el dueño en una sesión y **vivía solo en el chat**, que es justo lo que
`CLAUDE.md` prohíbe. Queda aquí, con lo hecho, lo que falta y lo que se descartó **con su
motivo**, para que la siguiente sesión no lo reinvente ni lo repita.

Ojo con la numeración: el encargo llegó dos veces con el mismo trabajo en distinto orden
(primero como "N1–N6", después como "Level 1–6" de un brief más largo). **La tabla va en
el orden en que se ejecutó**, que es el del segundo. Lo que el segundo encargo añadía y
el primero no tenía —el punto de logística— es la última fila, y es lo único sin empezar.

| Nivel | Qué era | Estado |
|---|---|---|
| **N1** | CI en push/PR, check de `worker/pegar.js`, `deploy.yml`, proteger `main` | Código hecho. **Del dueño**: mover los dos `.yml` y proteger `main` |
| **N2** | Desduplicar `texto`, `fecha`, `almacen`, `tema` + un solo `hoyISO()` | Hecho. Destapó un fallo de un día en los avisos, arreglado |
| **N3** | Rendimiento: perezosas, suscripciones diferidas, jank | Hecho y medido: el arranque baja de 50,1 a 39,3 kB gzip. Barrido del navegador: verde |
| **N4** | `firebase.json` + reglas contra el emulador de verdad | Hecho y comprobado contra el motor real (28/28) |
| **N5** | Observabilidad sin PII, con `__BUILD_ID__` | Hecho: `src/diario.js`, estructurado y con la compilación |
| **N6** | Tipado gradual (`checkJs`) en los módulos de cálculo | Hecho: 13 ficheros. Cazó tres fallos reales |
| **—** | **Logística: niños, hielo y contraste con el sector** | **En marcha.** El contraste con el sector está montado (A1, ver "Hecho"); el hielo se calibra solo (C2, ver "Hecho"); queda lo de los niños, con datos reales delante |

**Reglas que puso el dueño para todo el plan** (siguen vigentes): no partir `App.jsx` ni
`index.css`, no cambiar el sistema de estado, no tocar las tres guardias ni la identidad
`categoría::etiqueta`, ni un `useMemo`/`useCallback` sin medición delante, todo en
español, repo público sin PII, y una prueba por cada fallo arreglado.

### Lo que queda abierto del plan

1. **Las capturas.** Se arreglaron dos cosas de interfaz (el aviso de documentos, que era
   un `<li>` suelto, y sus tonos) y se hicieron tres pantallas perezosas. El barrido de
   711 confirma que todo aparece donde debe, pero el ojo humano sobre el respaldo
   perezoso y la raya de color del aviso de documento sigue sin hacerse (ver "Estado de
   la rama" arriba).
2. **El punto 2 del encargo (logística) sin empezar**: coeficientes de niños en comida,
   refrescos y equipamiento; hielo en kg y en taxis con margen de derretimiento cuando no
   hay congelador; y contrastar los ratios con lo que usa el sector. Se ha dejado aparte a
   propósito: cambia cantidades que se cargan en un camión, así que va con los números
   delante y una prueba por ratio, no de propina al final de otro nivel.

### Descartado en este plan, y por qué

- ~~No unificar UTC y local~~ — **se hizo al revés de lo que decía este apartado, y menos
  mal**: al unificar en `hoyISO()` local apareció un fallo que llevaba en producción todos
  los días del año (la ventana de avisos, corrida un día). Ver "Lo desduplicado".
- **Meter `useMemo` en el calendario**: medido, la aritmética son ~2,7 ms con 250
  apuntes. El coste está en React pintando, y eso todavía no se ha medido.
- **Cambiar las tres animaciones en bucle que no son `transform`/`opacity`** (degradado
  del logo, boca del muñeco, aro del micro): son de pintado, no provocan reflow, y
  tocarlas es riesgo visual a cambio de nada.
- **Tipar `App.jsx`**: cientos de avisos que nadie miraría, tapando los que importan.

## Pendiente

**1. Logística: los números que se cargan en el camión — en marcha**
- **Coeficientes de niños** en comida, refrescos y equipamiento (bodas, comuniones y
  eventos familiares). Hoy los niños ya cuentan para agua y refresco (`alcoholPax`
  separa a los adultos), pero comida y equipamiento van sobre el total sin distinguir.
- **Hielo: hecho** (ver "Hecho", C2 del plan). Falta lo que falta siempre: que el
  equipo marque la vuelta del hielo en tres eventos para que el factor salga medido.
- **Contrastar los ratios con lo que usa el sector**, para no cargar de más ni quedarse
  corto. Cada cambio, con su prueba y su porqué: son cantidades que alguien mete en un
  camión, no una constante cualquiera.

**2. Del dueño, en la app** (necesita su sesión):
- Apunte a **250 pax**; otro del **9 al 10 de octubre** (campo *Hasta*).
- Ratios de cumpleaños/producción: panel existe, falta medir un evento real.
- ~~Verificar los 53 precios en `indice/precios` desde otro dispositivo~~ — hecho,
  confirmado por el dueño: llegaron los 53.

**3. Tinyflows — decidido NO hacer por ahora.** Automatizaciones definidas por el dueño
("cada lunes revisa la semana"). Necesitan editor de reglas + intérprete en el Worker →
segundo motor de reglas junto a `revision.js` y el subconsciente; separados, uno avisa
de cosas que el otro no. El repaso de la noche cubre el 80% del valor sin eso.

## Hecho (referencia, no acción)

**B8 del plan — línea base de pintado en CI — listo, pendiente de aplicar por el
dueño.** El trabajo de navegador de `test.yml` ya descargaba chromium y lo dejaba en
`CHROMIUM_PATH`, pero `medir` nunca se ejecutaba ahí: el único sitio donde se medía
era el portátil de quien corría la batería. Sin número de referencia no se detecta la
regresión de pintado, y sin detección la regla de "no optimizar sin número" se queda
a medio hacer. El cambio son tres líneas al final del trabajo `navegador`, pero la
App de la sesión NO PUEDE subirlo: GitHub rechaza el push cuando una App sin
permiso `workflows` toca `.github/workflows/` (el mismo motivo por el que los ymls
vivieron en `ci/` y se movieron a mano). El dueño lo aplica desde la web de GitHub
(`test.yml` → editar → después de la línea de `app.test.mjs`):

```yaml
      # Línea base de pintado (B8 del plan): el número que convierte "¿va más lento
      # que antes?" en un hecho. Va aquí, no en cada push, porque necesita chromium.
      - run: npm run medir
```

Aplicado, el log del trabajo nocturno muestra la rejilla con 250 apuntes, el cambio
de mes y el abrir del asistente; lo que se compara es ese log contra el anterior.

**B5+B6 del plan — README real y salud de proveedores — hechos.**
- **B5**: `README.md` deja de ser el boilerplate de Vite y dice lo que es el repo
  para quien llega (las tres apps, el asistente y dónde viven las claves, comandos,
  nube, pruebas), apuntando a CONTEXTO.md y CLAUDE.md para el detalle.
- **B6**: la salud de los proveedores se puede comprobar desde Ajustes del
  asistente. Nuevo `salud()` exportado en `worker/index.js` + ruta `/__salud` (misma
  sesión y mismo patrón que `/__repaso`): a cada proveedor configurado se le manda un
  mensaje de DOS tokens y se ve si el modelo existe y la clave vale — el motivo llega
  tal cual ("Gemini 404: … not found" dice por sí solo que el nombre del modelo ha
  cambiado; es el fallo que ya ha costado dos veces enterarse a ciegas, con
  gemini-2.5-flash y el TTS). Sin claves, dice qué falta en cada uno sin gastar ni un
  token. A demanda (un botón), no en cada pregunta. Lo que NO se hizo: el smoke test
  en CI — el Worker pide sesión de equipo y su URL no vive en el repo a propósito,
  así que CI no puede llamarlo sin secretos; el botón del viernes es el mecanismo.
  `worker/pegar.js` regenerado (CI lo compara byte a byte). 5 comprobaciones nuevas.

**B2+B3+B4+B7 del plan — los pequeños — hechos.**
- **B2**: la frase de "Solo consultar" es precisa ("No puedes cambiar nada **de la
  app**"): su memoria (recordar/olvidar) está disponible en todos los niveles —no es
  un dato de la app, es su propio estado, y el equipo la lee y la borra a mano en
  Cerebro—. Antes, la frase a secas contradecía a las herramientas que sí tenía
  (la trampa nº2, la que ya costó un bug).
- **B3**: `buscaEvento` ya no adivina: dos candidatos empatados al top se listan y se
  pide detalle ("Hay 2 que se parecen… dime cuál con más detalle"), el mismo criterio
  y la misma frase que el conector de calendario; un nombre EXACTO se coge sin
  preguntar. Vale para ver_evento, ver_checklist, ver_escaleta y revisar_evento.
- **B4**: la cabecera de `herramientas.js` ya no dice "Todas son de SOLO LECTURA" —
  dejó de ser cierto cuando llegaron las de escribir. Describe el sistema real
  (escribe: true + permisos.js + la lista NUNCA).
- **B7**: prueba nueva que barre `src/` en cada batería (salvo `__tests__`, donde los
  patrones viven A PROPÓSITO como fixtures ficticios): un teléfono español real o un
  correo que no sea de los ficticios conocidos fallan la suite, y se comprueba
  directamente que `PRECIOS_BASE` no existe en el código (el catálogo de precios de
  compra vive en Firestore). Lo que ya pasó una vez (tres nombres reales) y lo que
  pasó otra (precios en un repo público) queda cerrado por la batería, no por la
  memoria.

**A2 del plan — auditoría de negocio que propone mejoras — montada.** Las reglas
viven en `revision.js` (`oportunidadesNegocio`, puro, mismo motor que el repaso:
no se ha montado un motor nuevo, que fue el motivo de descartar Tinyflows) con un
tono nuevo, `oportunidad` —nada roto, pero se deja dinero o aprendizaje en la
mesa; el CSS le da su raya verde—. Cuatro reglas: **medido y sin aplicar** (lee
las calibraciones de C2/C3 y propone aplicar el factor con `aplicar_calibracion`,
que escribe por la MISMA puerta que el botón del panel —`escrituraAjustes.js`,
encadenada en App—), **roturas sin precio** (la fuga que se ve como "gratis"),
**eventos pasados sin vuelta** (aprendizaje perdido, 30 días, 3 nombres) y
**huecos del catálogo** (en `calibracion.js`, no en `revision.js`, porque
reconstruye la checklist: no se mete el generador en el bundle del Worker). La
app lo calcula al tenerlo todo en memoria y lo pasa al asistente (`ver_auditoria`,
que en una pantalla sin datos dice que no hay auditoría, no "todo en orden") y a
Cerebro (sección "Oportunidades", que no se pinta sin avisos). El sistema le
dice al modelo cuando usarlo y que los datos de aplicación se copian, no se
inventan. Decisión documentada: corre **al abrir la app, no en el repaso
nocturno** — el dato que aporta valor (precios, medidas) es local, y una copia
nocturna sería stale sin avisar de nada que el repaso no avise ya; si algún día
el repaso lo necesita, las reglas son puras y ya están exportadas. 24
comprobaciones nuevas, `test:rapido` en verde.

**C3 del plan — calibración de la comida (paella y bandejas) con lo que volvió —
montado.** La paella (1 cada 30 pax) y las bandejas (por tramos de pax) eran ratios
fijos sin dato detrás; ahora se calibran contra los eventos reales con el mismo
patrón que la bebida y el hielo: `calibracionComida()` en `calibracion.js` reutiliza
`consumoDeBebida()` — que ahora acepta un matcher para etiquetas dinámicas ("Paella
<talla>", sin pisar "Paletas de paella" ni "Descansadores de paella") — con la
misma convención que la bebida, hecha explícita para el equipo: **lo vuelto es lo NO
usado** (en la paella, las que no salieron; en las bandejas, las que no se usaron
para pasar). Con ella "lo cargado − lo vuelto" es lo que de verdad se usó, y el
factor converge. El factor vive en el nuevo `comida.js` (esparcido por tipo ×
grupo, mismas reglas que la bebida) y se aplica en `paellasPorPax`/`calcPaella`
(allí el número a mano manda) y en la cuenta por pax de `calcBandejas` (los extras
manuales no se escalan). Se ve y se aplica en PanelComida del Modo carga (junto a
los de bebida y hielo) y sube a `indice/comida` con el mismo `ajusteCompartido`
(las reglas no se tocaron). Lo que NO cuenta: los eventos con paella a mano (ese
número no es el ratio) se salta, y las frituras no se calibran (su número es manual
por evento, no hay ratio base que calibrar). 21 comprobaciones nuevas, `test:rapido`
en verde.

**C2 del plan — calibración del hielo con lo que volvió — montado.** La merma por
derretimiento (`MERMA_SIN_CONGELADOR`, 1,35/1,2) era una estimación; ahora se calibra
contra los eventos reales con el MISMO patrón que la bebida: `calibracionHielo()` en
`calibracion.js` reutiliza `consumoDeBebida()` tal cual (la línea "Hielo" ya soporta
cantidad en "Vuelve": true = volvió todo, o los kilos que volvieron), mediana con 3+
eventos, acotado 0,3–2, y converge (aplicar la sugerencia y volver a medir da 1). El
factor vive en `calculos.js` (esparcido por tipo, como los de bebida) y multiplica los
kilos FINALES —después de temporada, barra y merma— para que absorba a la vez "llevamos
más hielo de lo que dice el manual" y "la merma no es la nuestra". Se ve y se aplica en
el nuevo PanelHielo del Modo carga (junto al de bebida, donde se mira la vuelta), y
sube a `indice/hielo` con el mismo `ajusteCompartido` que los demás ajustes (las reglas
de `indice/{doc}` no se tocaron). `calcular_hielo` del asistente recibe `tipo` para dar
el MISMO número que la checklist. La banda del sector (A1) sigue comparando el ratio
base, no el factor: el factor es ajuste del equipo, la banda es referencia. 15
comprobaciones nuevas, `test:rapido` en verde.

**Migración de precios a Firestore — cerrada, los tres pasos.** `src/precios.js` tenía
53 precios de compra en el código (repo público → revelaban márgenes). Subidos desde
💶 Precios, comprobados los 53, `PRECIOS_BASE` fuera del código junto al botón de
migración (ya usado). Nube = única fuente: navegador que nunca se conectó se queda sin
precios hasta la primera vez. `handleGuardarPrecios` sube el catálogo entero en cada
corrección — con `setDoc`, subir solo la diferencia sobrescribiría el documento.

**Repaso de la noche — montado y probado en producción.** Mira 11 eventos, escribe en
`indice/avisos`; cron a las 05:00 UTC.

**Ajustes del asistente, sin texto de instalación.** El párrafo de "las claves no viven
aquí… `worker/README.md`…" era para quien monta el Worker, no para quien usa la app cada
día — el dueño lo vio y no le aportaba nada. Se quitó de `Asistente.jsx`; se quedan solo
las dos notas de privacidad por proveedor (automático / OpenAI), que sí son del día a
día. La razón de por qué la clave no vive en la app pasó a comentario de código.

**`.asis-explica` / `.asis-vacio`, con tarjeta de verdad.** Primer intento: solo
`background: var(--bg-subtle)`, sin borde. Insuficiente — el dueño lo volvió a ver en el
móvil real y seguía sin gustarle: en claro, `bg-subtle` (#f8fafc) casi no se distingue de
`card-bg` (#fff), así que la "tarjeta" seguía leyéndose como una mancha, no como una
forma. Segundo intento, el que quedó: `border: 1px solid var(--border-color)` en las dos
—igual que ya llevan `.asis-recuerdo` y `.asis-gasto-cifras`, así que ahora es
consistente con el resto del panel—, y `.asis-explica` además con
`border-left: 3px solid var(--accent)` para distinguir "nota del asistente" de "tarjeta
de datos" de un vistazo; `.asis-vacio` suma `box-shadow: var(--shadow-sm)` por ser lo
primero que se ve al abrir una pestaña vacía. Como las usan Charla vacía, Tareas, Gasto y
Cerebro, una sola clase mejora las cuatro pantallas a la vez. Comprobado con capturas en
los dos temas, en móvil (390/412px) y en escritorio, antes de subirlo.

**El Gasto es por aparato, y ahora lo dice claro.** El dueño vio números distintos en el
móvil y en el ordenador y lo tomó por un fallo. No lo es: `gasto.js` lo dice desde
siempre ("No va a la nube a propósito: subir un contador en cada pregunta serían
escrituras constantes por un número que solo sirve para mirarlo"), pero el texto en
pantalla solo decía "contado en este navegador", que no deja claro que el móvil y el
ordenador van cada uno por su cuenta. Reescrito en `Asistente.jsx` para decirlo sin
rodeos: "EN ESTE APARATO: el móvil y el ordenador cuentan cada uno el suyo, no se suman
ni se ven entre sí". Sin tocar `gasto.js` — el diseño no cambia, solo se explica mejor.

**El asistente, en una burbuja flotante (`BotonAsistente.jsx`).** Pedido tal cual: "el
muñeco en la parte inferior derecha como si fuera el botón de WhatsApp". Antes era un
botón de texto más entre los de la cabecera (`btn btn-ghost`, "Asistente"), a un scroll
de distancia en una checklist larga. Ahora `BotonAsistente` se dibuja fijo en la esquina
inferior derecha (`position: fixed`, `z-index: 55` — por debajo del panel y de Modo carga,
que lo tapa solo al abrirse), con la cara del compañero elegido dentro (lee
`gula_asistente_companero` del navegador directamente, porque tiene que enseñarla ANTES
de que el panel —que es quien de verdad la guarda— llegue a cargarse; con "Ninguno"
elegido o "Jarvis" cae en Sparkles / el aro, según toque). Fondo NEUTRO (`card-bg`), no de
acento: el compañero está pensado para vivir sobre un fondo neutro —el traje ya es un
tinte de acento mezclado con el fondo, ver `.comp-viste`— así que un círculo sólido en
acento lo dejaba casi invisible; probado primero así y corregido antes de subirlo.

Con posibilidad de esconderla, que era la otra mitad del encargo: una aspa pequeña en la
esquina de la burbuja la esconde, guardado en `gula_asistente_flotante_escondido` (este
navegador). Escondida no desaparece del todo — queda una pastilla mucho más discreta en
el mismo sitio, para no dejar el asistente sin ninguna puerta de vuelta. Se esconde sola
mientras el panel está abierto (ahí ya se ve el muñeco grande en la pestaña Humano).
`className`/`etiqueta` salieron de las props: ya no hay texto que rotular. Comprobado con
capturas: los dos temas, con compañero por defecto, "Ninguno" y "Jarvis", y el ciclo
completo esconder → recargar (sigue escondida) → mostrar → abrir el panel (la burbuja se
esconde sola).

**Bug real en la burbuja, visto en producción y arreglado: se quedaba pegada a la
cabecera, no a la pantalla.** El dueño mandó una captura real: la burbuja salía tapando
el botón "Compartir", arriba del todo, en vez de en la esquina inferior. Causa: `.app-header`
lleva `animation: slideUpFade ... both`, y `both` deja puesto el `transform:
translateY(0)` del último fotograma PARA SIEMPRE, aunque la animación ya haya acabado —y
eso convierte a la cabecera en el "contenedor" de cualquier descendiente con `position:
fixed`, que deja de fijarse a la pantalla y pasa a fijarse a ELLA. Es el mismo bug que ya
se había arreglado en el panel del asistente (con un portal a `document.body`, comentado
en su día en el propio código) pero la burbuja se me había quedado fuera de ese portal al
añadirla. Arreglado envolviéndola en el mismo `createPortal(..., document.body)`. El
banco de pruebas que usé para las capturas de antes (`?boton=1`) no reproducía el bug
porque no monta la cabecera real con su animación — para esta lo hice con un banco
aparte que sí la incluye, medí la posición real de la burbuja con y sin portal, y hasta
entonces no se veía. Buena lección: probar el componente aislado no basta cuando el bug
depende de un antepasado que el aislado no tiene.

**El arrastre de la burbuja (pedido tal cual: "que pueda moverla donde quiera").**
`pointerdown`/`pointermove`/`pointerup` en vez de `onClick` — un solo gesto sirve para
abrir con un toque y mover con un arrastre, y hay que decidir cuál fue DESPUÉS de ver si
hubo más de 6px de movimiento (menos que eso es el pulso de la mano al pulsar, no una
intención de arrastrar). La posición se guarda en `gula_asistente_flotante_pos` (este
navegador) solo cuando SÍ hubo arrastre; un toque simple sigue abriendo el panel y no
toca la posición. Se reencaja dentro de la pantalla si la ventana cambia de tamaño (girar
el móvil), pero sin guardar ese reencaje — así el teclado del móvil, que también cambia
el alto de la ventana al abrirse, no pisa "donde la dejó" la próxima vez.

**El Grafo, de verdad, con líneas (`Grafo.jsx`).** La pestaña Grafo de Cerebro llevaba
tiempo siendo una lista de píldoras sueltas con un número de conexiones al lado, por
decisión consciente de entonces: "en un móvil un grafo con aristas de verdad no se lee".
El dueño pidió lo de OpenHuman, así que antes de construir nada se comprobó en su código
de verdad (clonado en modo lectura) si existe — y SÍ: `MemoryGraph.tsx`, un grafo de
fuerzas en SVG puro, sin ninguna librería, con una relajación de muelles+repulsión que
corre una vez y ya. Traído aquí con el mismo enfoque: `Grafo.jsx` recibe los `nodos` y
`enlaces` que ya calculaba `arbol.js` (no cambia ese fichero, los datos ya estaban
listos) y los coloca con la misma física, dentro de un `viewBox` que escala solo con el
ancho del panel — se lee igual a 320px que en escritorio, que es justo lo que preocupaba
en su día. Clic en un nodo abre un detalle DEBAJO del dibujo (nombre, tipo, conexiones),
no un tooltip flotando encima que en el móvil tapa lo que se acaba de tocar. Memoizado
por el contenido de los datos (no por su referencia, que cambia en cada render de
Cerebro): sin eso, el grafo se hubiera reordenado solo cada vez que algo ajeno
cambiara arriba.

**Avisos de lo que falta por configurar (`avisosConfig.js`) — primera pieza de "que el
asistente avise solo".** El repaso de la noche ya avisaba de lo que le falta a un
EVENTO; esto es lo mismo pero para el NEGOCIO: si no hay proxy puesto (el asistente no
puede contestar nada) o no hay ningún precio cargado (el Resumen calcula a 0€), sale un
aviso en Cerebro, con la MISMA tarjeta que ya usa el repaso (`.cer-aviso`, tono
"falta") — no una nueva. Sin avisos no se pinta nada, ni un "todo en orden": eso sería
ruido en el caso normal. A propósito NO avisa de "ratios de personal sin ajustar":
comprobado en `personal.js`, los de boda/comunión/corporativo son datos MEDIDOS de
verdad, no un hueco — avisar de eso habría sido decir que falta algo que ya está bien
puesto. "Equipo del calendario sin cargar" se queda fuera por ahora: vive solo en
Firestore + estado de React (`useCalendarioNube.js`), sin lectura local como
`leerPrecios()`, así que traerlo aquí pide enhebrar datos entre apps y no es tan barato
como esto. Con tests (`avisosConfig` en `asistente.test.mjs`): los dos avisos a la vez,
uno solo cuando falta uno, ninguno con las dos cosas puestas, y que un catálogo de
precios vacío cuenta igual que no tenerlo.

**Bug real, visto en producción: "eventos próximos" traía TODOS los guardados, pasados
incluidos.** El dueño mandó una captura: pidió los próximos y salió una lista empezando
en julio, con hoy ya pasado agosto. Causa raíz: el modelo no tiene ni idea de qué día es
—`SISTEMA`, en `cliente.js`, nunca se lo decía—, así que cuando `buscar_eventos` o
`ver_calendario` se llaman sin `desde`/`hasta` (porque el modelo no puede calcular una
fecha relativa sin saber la de hoy) devuelven TODO sin filtrar, del más antiguo al más
nuevo. Además, `buscar_eventos` lee el archivo de checklists GUARDADAS de esta app, no
la agenda real del equipo (`ver_calendario`, sobre `apuntes`) — la pregunta pedía la
agenda y el modelo cogió el archivo.

Arreglado en dos sitios:
- `cliente.js` calcula `Hoy es ${hoyISO()}` EN CADA PREGUNTA (no una vez al cargar el
  módulo: una charla puede seguir abierta al cruzar la medianoche) y se lo dice al
  modelo, con instrucciones de pasarlo como `desde`/`hasta` para "próximos", "esta
  semana", etc.
- Las descripciones de `buscar_eventos` y `ver_calendario` en `herramientas.js` ahora
  dejan claro cuál es cuál: una es el archivo de la checklist (no filtra si no se le
  pide), la otra es la agenda de verdad del equipo — y cada una menciona a la otra para
  que el modelo elija bien.

Con test en `asistente.test.mjs`: capturado el `sistema` que de verdad se manda al
Worker (mockeando `fetch`) y comprobado que lleva `Hoy es` con la fecha calculada de
verdad (`hoyISO()`), no un valor puesto a mano que se quedaría obsoleto el día siguiente.

**El asistente habla primero, si hay algo pendiente (`saludoPendientes`).** Segunda
pieza de "que el asistente esté integrado, sepa qué hace y avise solo" — pedido tal
cual: que hable primero en vez de obligar a ir a mirar Cerebro. `saludoPendientes`, en
`avisosConfig.js`, junta las dos fuentes que YA existían —`avisosConfig()` (el negocio) y
el repaso de la noche (cada evento)— en una frase, no un informe. Se pinta como una
burbuja del asistente ENCIMA del saludo de bienvenida de Charla, pero solo con el hilo
vacío (una charla nueva): repetirlo en cada respuesta sería spam. Es un mensaje de
mentira — no entra en `mensajes` (lo que se manda al modelo, así que no cuesta ni un
token) ni se guarda en el historial de conversaciones. Con test: sin nada pendiente no
dice nada (el caso normal no suena a aviso), cuenta bien singular/plural, y con las dos
fuentes a la vez las junta en una frase.

**El asistente sabe cuánto llevas cargado (`progreso_carga`).** Tercera pieza: "que
sepa en cada momento qué haces". Resultó que la pieza más razonable no era rastrear la
pantalla entera —frágil, y Modo carga ni se puede abrir con la burbuja encima, que la
tapa—, sino algo concreto y ya medido: cuánto llevas cargado del evento abierto. Los
números NO se recalculan en `herramientas.js` reconstruyendo la checklist desde lo
guardado (`catsDeEventoGuardado`): eso podría no coincidir con lo que se ve en pantalla
si hay categorías o items renombrados a mano (vive en este navegador, no en el evento).
En su lugar, `App.jsx` pasa los mismos números que ya calculaba para la ficha del
Resumen (`totalConceptos`/`itemsCargados`/`itemsPreparados`, más un `itemsVueltos`
nuevo que no existía) a través de `contexto.progresoCarga`, y la herramienta solo hace
el porcentaje. Sin nombre a propósito: solo tiene sentido para el evento delante ahora
mismo, nadie carga dos camiones a la vez. Con test: cuenta bien, y sin checklist abierta
(o con una a cero items) lo dice en vez de calcular un porcentaje sobre cero.

**El panel del asistente, más grande en escritorio.** El dueño lo vio pequeño de más en
un monitor de escritorio, apretado en una esquina. Era 440×660px fijos; ahora
`min(520px, 92vw)` × `min(760px, 88vh)` — en vw/vh y no en px sueltos, para que crezca de
verdad en una pantalla grande sin desbordar una portátil pequeña (a 768px de alto sigue
cabiendo entero, ~676px). Comprobado en capturas a 1280×900, 1920×1080 y una portátil de
1366×768, con Charla y Gasto (la pestaña con más contenido de las cinco): cabe entero en
las tres, sin recortes ni scroll de más.

**"Poner el contador a cero" ya no usa el `confirm()` del navegador.** El dueño lo vio y
no le gustó: letra de sistema, sin tema oscuro, sin ni un borde redondeado — desentonaba
con el resto del panel. Era el ÚNICO sitio de toda la app que todavía usaba el diálogo
nativo; todo lo demás que borra algo (`handleNuevoEvento`, borrar plantillas, borrar
envíos…) ya pasa por el `Dialogo` propio de `App.jsx` (`components/Dialogo.jsx`, con
`tipo: "confirm"`). Se trae el mismo componente a `Asistente.jsx`, con su propio estado
local — el panel vive en su propio portal, aparte del árbol de la checklist, así que no
comparte el `dialogo` de `App.jsx`. De paso, el mensaje ahora dice explícitamente que es
por aparato y que no se puede deshacer, cosas que el `confirm()` de una línea no dejaba
sitio para decir. Comprobado con capturas (los dos temas) y el ciclo completo: Cancelar
no toca el contador, Confirmar sí lo pone a cero.

**Bug real y serio: "crear checklists" decía "Hecho" y no creaba nada.** El dueño le
pidió crear 5 bodas de dentro de 19-26 días, aprobó la propuesta, el asistente contestó
"Hecho: Crear 5 checklists…" y no apareció ninguna en "Eventos guardados". Causa raíz:
`checklistsPorCrear` (`calendario/apuntes.js`) vuelve a filtrar por "próximo" —los 14
días de `DIAS_ANTICIPACION`, pensados para el arranque automático, que SÍ tiene que
decidir solo qué crear entre TODOS los apuntes— pero `crear_checklists` ya elige a mano,
por id, exactamente cuáles crear (el modelo pudo haber buscado con un `dias` más grande,
o por nombre con `cuales`, sin límite de fecha). Ese segundo filtro, oculto dentro de
`promoverApuntes`, descartaba en silencio cualquier apunte a más de 14 días — los 5
estaban a 19-26.

Arreglado enhebrando un `opciones` opcional desde `escrituraChecklists.js` hasta
`checklistsPorCrear`: `aplicarEnChecklists` ahora llama a `promover(elegidos, { dias:
Infinity })`, ya que quien llama aquí ya ha decidido qué crear y no necesita un segundo
filtro por fecha. El arranque automático (`App.jsx`) y `CalendarioEnChecklist` siguen
llamando sin opciones, así que conservan los 14 días por defecto — es el comportamiento
correcto ahí, comprobado con test (`checklistsPorCrear` con dias: Infinity SÍ crea una
boda de dentro de dos meses; sin él, no).

Segundo fallo, más pequeño pero relacionado: `resolver()` en `Asistente.jsx` decía
"Hecho: …" SIEMPRE tras aprobar una propuesta, sin mirar lo que de verdad devolvía
`contexto.onEscribir` — así que aunque `crear_checklists` hubiera devuelto un error o un
`{ nada: "..." }` (sin lanzar ninguna excepción), el panel decía "Hecho" igual. Ahora
mira el resultado: error → burbuja de error; `nada` → se dice tal cual; si no, "Hecho"
con el `aviso` pegado si lo trae (por ejemplo, que a lo creado le faltan pax/sitio/horas
del formulario, que antes se perdía sin más).

**El asistente ya no "se reinicia" al cerrar y volver a abrir.** El dueño lo vio y
preguntó si era así a propósito — no lo era. `BotonAsistente` desmonta `Asistente.jsx`
entero al cerrar el panel (por diseño, para no dejar suscripciones a la nube corriendo
de fondo), así que TODO su estado local se perdía, incluidos `hilo` y `mensajes` —
aunque ya se guardaban en `conversaciones.js` con cada vuelta, y el propio comentario de
cabecera de ese fichero dice que ese guardado es justo para esto ("Al cerrar el panel se
perdía todo... así que hay que volver a preguntarlo, y se paga otra vez"). El botón
"Conversación nueva" del Historial tampoco tendría sentido si cada apertura ya
empezara en blanco. `hilo`, `mensajes` y `charlaId` ahora se inicializan desde la última
charla guardada (`leerCharlas()[0]`) en vez de vacíos — reabrir retoma donde se dejó, y
"Conversación nueva" sigue siendo la manera explícita de empezar de cero. Comprobado con
capturas: abrir por primera vez ya retoma lo guardado, cerrar desmonta el panel de
verdad, reabrir sigue la misma charla, y "Conversación nueva" limpia sin tocar lo
guardado (al no mandar nada nuevo, no se sobrescribe nada).

**Al abrir el Historial se veía la charla de detrás asomando, como texto rayado.**
El dueño mandó una captura: al pulsar el icono de Historial, la lista de charlas
guardadas aparecía con el hilo de la conversación (o la tarjeta de "Pregúntame por tus
eventos" y el cuadro de escribir) superpuestos justo debajo, como dos capas de texto
montadas una sobre otra. Causa: el bloque `{verHistorial && (...)}` de
`Asistente.jsx` se añadió sin tocar la condición que pinta el cuerpo de cada pestaña
(`{!ajustes && (pestana === "tareas" ? ... : ...)}`) ni la de los "pendientes" y el
formulario de escribir (`{!ajustes && pestana === "charla" && ...}`) — todas ellas ya
sabían apagarse por `ajustes` (el comentario decía explícitamente "los ajustes
SUSTITUYEN a la pestaña, no se apilan encima"), pero nadie les enseñó a apagarse
también por `verHistorial`, así que las tres seguían pintándose debajo de la lista.
Arreglado añadiendo `!verHistorial` a esas tres condiciones, con el mismo criterio que
ya se usaba para `ajustes`. Comprobado con Playwright: con el historial abierto,
`.asis-hilo` y `.asis-vacio` no aparecen en la página (antes sí); al cerrarlo, el hilo
vuelve a verse normal.

**La burbuja flotante "casi no se notaba de lo que es".** A 56px de círculo con el
compañero dibujado a 38px, el dueño la vio y no distinguía la ilustración. El propio
`Companero.jsx` ya avisaba de esto en un comentario: por debajo de cierto tamaño el
busto "se queda en una mancha" — 38px estaba pegado a ese límite. Subida a 68px de
círculo con el compañero a 46px (Sparkles, para quien elige "ninguno", de 22 a 28);
`TAMANO_BURBUJA` en `BotonAsistente.jsx` y el `width`/`height` de `.asis-flotante-boton`
en `index.css` tienen que mantenerse iguales entre sí a propósito, porque ese número
también acota hasta dónde se puede arrastrar la burbuja sin salirse de la pantalla.
Comprobado con capturas: el busto (cara, gorro, hombros) ya se distingue con claridad
en la esquina, sin invadir ni tapar nada de alrededor.

**La burbuja, a 68px, TODAVÍA se veía pequeña.** El dueño insistió tras el arreglo
anterior. La causa esta vez no era solo el tamaño: el borde de 1px en gris
(`var(--border-color)`) apenas se distingue del fondo de la app en una esquina —
poco contraste, no poco tamaño—. Subida otra vez, a 84px de círculo con el compañero
a 54px, y el borde pasa de 1px gris a 2.5px en color de acento: un anillo que
destaca por sí solo, sin llenar el círculo entero de color (eso ya se había
descartado antes — ver el comentario de "Fondo NEUTRO" un poco más arriba en
`index.css` — porque tapa el traje del compañero). Comprobado con capturas en los
dos temas.

**Al aprobar una propuesta escribiendo en el chat en vez de pulsar el botón, salían
dos mensajes que parecían llevarse la contraria.** El dueño mandó una captura:
"Hecho: Crear 5 checklists... Creadas..." y, justo debajo, "Te he dejado en pantalla
la propuesta... Solo tienes que confirmarla ahí para que se generen" — como si el
propio asistente no supiera si ya estaba hecho o no. Causa: aprobar una propuesta
tiene DOS caminos que no se hablan entre sí — pulsar "Hacerlo" en la tarjeta de
`pendientes` (que llama a `resolver()`), o simplemente escribir "sí, créalos" en el
chat (que el modelo interpreta como una petición nueva y vuelve a llamar a
`crear_checklists`). Si se hacen las dos casi a la vez, `escribir()` en
`Asistente.jsx` apilaba una SEGUNDA tarjeta idéntica sin saber que la primera ya
estaba ahí — y el modelo, con la respuesta de esa segunda llamada, contestaba "te lo
he dejado en pantalla" justo cuando la primera ya se había aplicado y dicho "Hecho".
Arreglado en `escribir()`: si ya hay una propuesta pendiente con el mismo `que` y el
mismo `resumen`, no se apila otra — se le dice al modelo que YA estaba propuesta y
que no lo repita, para que no confunda al dueño. Comprobado con lint y test
(`npm run test:rapido`); no tiene prueba automática propia porque `escribir()` vive
dentro del componente `Asistente.jsx` y reproducirlo de verdad necesitaría simular
dos vueltas al modelo casi simultáneas, no solo funciones puras.

**La burbuja, a 84px, TODAVÍA se veía pequeña en escritorio — y el dueño pidió que
"pareciera activa".** Tercera vuelta sobre lo mismo. Dos peticiones juntas:

1. Más grande en escritorio en concreto (no en móvil, donde 84px ya iba sobrado de
   sitio). Solución con el mismo criterio que ya se usó para el panel: un
   `@media (min-width: 768px)` que sube el círculo a 108px. El truco es CÓMO se sube
   el dibujo de dentro sin tocar React: el `<svg>` de `Companero.jsx` trae su tamaño
   puesto por *atributo* (`width={size}`), y la propiedad CSS gana sobre el atributo,
   así que `.asis-flotante-boton svg { width: 68px; height: 68px; }` basta.
   `TAMANO_BURBUJA` en `BotonAsistente.jsx` se queda en 84 aposta: usarlo para acotar
   el arrastre en escritorio sale un pelín corto de lo que ahora se ve (nunca largo),
   así que como mucho se puede arrastrar un poco menos pegada al borde — nunca se sale
   de la pantalla.

2. Que se note que está activa incluso quieta: un pulso de 6s en bucle que cicla el
   borde entre los mismos tres colores que ya usa Jarvis para sus estados (fuego,
   acento, verde) — aquí no significan nada del asistente en concreto, es solo vida
   visual, así que se reutiliza la paleta que ya existe. A propósito NO anima
   `transform`: si lo hiciera, pisaría el `scale()` del `:hover`/`:active` y el hover
   dejaría de notarse a mitad del pulso. Apagado en `prefers-reduced-motion: reduce`,
   igual que el resto de animaciones del asistente.

   La prueba "Las animaciones en bucle no pueden mover la maqueta"
   (`calculos.test.mjs`) cazó esto al vuelo: `border-color` no estaba en su lista de
   propiedades seguras (solo `color`, no `border-color`), aunque cambiar solo el color
   de un borde —sin tocar su grosor— no dispara reflow, igual que `color` o `fill`.
   Añadida a la lista con el resto, no ignorada.

**"Recuérdame tal cosa tal día" — recordatorios con fecha, dichos al abrir (y en voz,
si toca).** Pedido tal cual: que el asistente sea más "interactivo", que diga cosas
para que no se te olviden, y que "recuérdame X el día Y" funcione de verdad. Antes de
tocar código se le preguntó al dueño CÓMO, porque las dos formas razonables de
hacerlo cambian el tamaño del trabajo en un orden de magnitud:

- ¿Avisa aunque la app esté cerrada (notificación push de verdad) o solo al abrirla
  ese día? — **Eligió: al abrirla.** No hay Service Worker con push en este repo
  (comprobado: `public/sw.js` no tiene nada de `PushManager`/`Notification`), así que
  push habría sido infraestructura nueva de cero (permiso del navegador, claves VAPID,
  un disparador en el servidor a esa hora exacta) y no funciona igual en todos los
  móviles. Al abrirla no necesita nada de eso.
- ¿Solo escrito, o también en voz? — **Eligió: también en voz.**

Con eso decidido, NO se monta un sistema nuevo de recordatorios: se estira `tareas.js`
—que ya guarda en la nube, ya se agrupa, ya se limpia solo— con un campo `fecha`
opcional ("AAAA-MM-DD"). Una tarea sin fecha sigue siendo una tarea normal; con fecha,
es un recordatorio. `paraHoy(lista, hoy)` filtra las que tienen fecha ya cumplida
(hoy o antes — una que se pasó por no abrir la app ese día sigue mereciendo decirse,
no callarse sola) y no están hechas, la más atrasada primero.

`saludoPendientes()` (`avisosConfig.js`) gana un tercer parámetro,
`recordatoriosHoy`, y los dice PRIMERO —antes que los avisos genéricos de negocio o de
evento—: es lo que alguien pidió que se le dijera A ÉL, perderlo entre avisos
genéricos habría sido justo lo que se pidió que no pasara. La herramienta
`apuntar_tarea` gana un parámetro `fecha` opcional, con su fecha calculada por el
propio modelo desde el "Hoy es..." que ya lleva el sistema (`cliente.js`) — el mismo
mecanismo que ya usan `buscar_eventos`/`ver_calendario` para "próximos" y demás
fechas relativas.

Lo de la voz salió gratis: `Humano.jsx` ya lee en voz alta `ultimaRespuesta` en
cuanto llega, si la voz está activa — nunca tocado. Lo único que hacía falta era que
`ultimaRespuesta`, con el hilo todavía vacío (antes de la primera pregunta de la
charla), fuera el saludo en vez de una cadena vacía. Un solo `? :` en
`Asistente.jsx`, cero cambios en `Humano.jsx`.

Comprobado con capturas y con `speechSynthesis.speak` interceptado en Playwright (sin
audio real, pero sí se ve el texto exacto que intentó decir): el saludo aparece en
Charla, el mismo texto llega a la voz en Humano, y en Tareas cada recordatorio lleva
su fecha en una etiqueta pequeña (reutilizado `.asis-recuerdo-puntos`, el mismo pill
que ya usan el contador de "veces" en Cerebro y Gasto — sin CSS nuevo).

**Jarvis, más parecido a la referencia del dueño ("un aro que gira y cambia de
color", ver `Jarvis.jsx`) — quieto se veía apagado, y los arcos de dentro nunca se
movían.** El dueño mandó una captura de un aro naranja tipo reactor y pidió que se
pareciera, "que cambia líneas etc". La estructura ya era casi la misma (dial de
marcas, aro de barras que gira, disco central que late) — lo que faltaba era esto:

1. **Color de "quieto" apagado.** `.jarvis-aro` sin estado explícito caía en
   `--pj-metal-oscuro` (gris), no en el ámbar de la referencia — quieto es como se ve
   la mayor parte del tiempo, así que era la diferencia que más se notaba. Añadido
   `.jarvis-aro.es-quieto { color: var(--pj-fuego); }`, el mismo tono que ya usa
   "pensando" (se distinguen por ritmo, no por color — ver `jarvis-latido`/
   `jarvis-girar` un poco más arriba en `index.css`).

2. **Los arcos de dentro no giraban.** Había solo UNO (`jarvis-arco`), estático:
   quieto se veía siempre exactamente igual, y la referencia no. Añadido un segundo
   arco (`jarvis-arco2`, otro radio) y animados los dos con `jarvis-girar` —el mismo
   keyframe que ya usa el aro de barras—, cada uno a su velocidad y en su sentido
   (9s uno, 13s el otro y al revés) para que nunca lleguen a superponerse del todo,
   que sería indistinguible de uno solo. Solo `transform`, mismo motivo de siempre
   (ver "Las animaciones en bucle no pueden mover la maqueta").

Comprobado con capturas en dos instantes seguidos: el arco visible cambia de
posición entre una y otra, que es justo lo que antes no pasaba nunca.

**En el móvil, el panel cambiaba de tamaño al cambiar de pestaña — y eso ya NO se
quiere.** Era a propósito, de antes de esta sesión: Gasto (cuatro párrafos y un
campo) a pantalla completa dejaba 426px en blanco debajo, así que en el móvil el
panel se ajustaba al contenido en todas las pestañas menos Charla. El dueño lo vio y
no le gustó — encogía y se estiraba al cambiar de pestaña, y no se parecía a cómo se
ve en escritorio (que SIEMPRE mide lo mismo, 520×760 aprox., sin importar la
pestaña). Pedido tal cual: el mismo tamaño en las cinco pestañas, también en el
móvil. Quitada la regla `@media (max-width: 767px) { .asis-panel:not(.es-charla)
{...} }` entera — se acepta el hueco en blanco de Gasto a cambio de que el panel no
cambie de tamaño solo. Comprobado con Playwright: las cinco pestañas miden
exactamente el alto de la pantalla (antes Gasto medía bastante menos).

**El destello de la burbuja flotante dejaba ver un cuadrado que parpadeaba y
desaparecía rápido.** Lo reportó el dueño viéndolo en el móvil. `asis-burbuja-viva`
(el pulso de `.asis-flotante-boton`, ver más arriba) llevaba el halo del `box-shadow`
de "sin blur ni spread" (`0 0 0 0`, en reposo) a "14px de blur, 3px de spread" (en el
punto de más color) y vuelta a empezar. Animar un `box-shadow` con `border-radius`
hasta un tamaño degenerado —blur y spread los dos en 0 a la vez— hace que algunos
motores pierdan el recorte circular durante un frame y se vea el cuadrado de la caja
de sombra sin recortar, justo en el instante en que el halo colapsa: coincide con "al
finalizar el destello", que es lo que describió. Arreglado dejando el blur (14px) y
el spread (3px) SIEMPRE fijos en las tres paradas del keyframe, y animando solo el
color hasta `transparent` para el reposo en vez de hasta un tamaño de 0 — el halo se
sigue viendo igual (invisible en reposo, con color en los otros dos tramos) pero el
`box-shadow` nunca llega a un tamaño degenerado. Comprobado por Playwright leyendo el
`box-shadow` calculado cada 150ms durante un ciclo entero (42 muestras): el blur y el
spread del halo se quedan en 14px/3px en las 42, solo cambia el color/alpha.

**La nota de ayuda del modal "Añadir varios items" salía partida en tres columnas en
vez de fluir como un párrafo.** Lo reportó el dueño con una captura del móvil.
`.agregar-nota` (y las hermanas `.agregar-ok`/`.agregar-error`, mismo grupo de
clases) es `display: flex`, pensada para un icono + un bloque de texto. Pero el JSX
metía el icono directamente seguido de texto suelto, un `<em>` y más texto suelto
como hijos DIRECTOS del div: en React eso son varios nodos de texto hermanos, y cada
nodo de texto que cuelga suelto de un contenedor flex se convierte en su propio
elemento flex — así que el texto de antes del `<em>`, el `<em>` y el texto de después
quedaban cada uno en su propia "columna" en vez de fluir en un único párrafo.
Arreglado envolviendo todo el texto (incluido el `<em>` de en medio) en un único
`<span>` en los tres casos (`agregar-nota`, `agregar-ok`, el `{error}` de
`agregar-error`) — un solo hijo de texto, un solo elemento flex, fluye como párrafo
normal. Comprobado con Playwright montando el modal en un banco de pruebas temporal
(borrado después de comprobar, no se sube): antes el `<span>` de texto medía menos de
la mitad del ancho de la nota; después ocupa el ancho completo disponible junto al
icono.

**La personalidad ("Directo", "Bromista"...) no se notaba al probarla en la pestaña
Humano sin haber preguntado nada.** El dueño la cambiaba, le daba a "Contesta en voz
alta" y sonaba siempre igual. No era un fallo de que la personalidad no llegara al
modelo —sí llegaba, correctamente, a cada pregunta real (`cliente.js` ya se la pasaba
al sistema)—: lo que se oye ahí SIN haber preguntado nada es el saludo automático
(avisos pendientes / recordatorios de hoy, `saludoPendientes` en avisosConfig.js), y
ese saludo está hecho a propósito SIN pasar por el modelo (mismo motivo de siempre:
gratis y sin conexión). Por eso sonaba idéntico con cualquier personalidad puesta —
nunca pasaba por el sistema que sí varía con ella. Arreglado con una envoltura por
personalidad, a mano y sin modelo (`ENVOLTURA_SALUDO` en avisosConfig.js): el
CONTENIDO del saludo no cambia nunca —son las mismas reglas duras de siempre—, pero
"Directo" lo deja tal cual, "Cercano" lo abre con un "Oye, antes de nada:", "Bromista"
le añade un cierre ligero, y "Parco" quita los puntos y los cambia por "·"
(telegráfico, como pide su propia definición). Comprobado con Playwright cambiando de
personalidad y leyendo el saludo en la pestaña Charla (que enseña el mismo texto que
Humano lee en voz alta): las cuatro suenan distintas.

**La voz sonaba "muy artificial".** El dueño lo pidió tal cual: más natural, más
humana. `voz.js` usaba `SpeechSynthesisUtterance` sin elegir ninguna voz, así que el
navegador cogía la que tuviera puesta por defecto — casi siempre la voz LOCAL del
sistema, la más robótica de las que suele haber instaladas. Dos arreglos, uno gratis y
uno de pago, con el gratis siempre activo y el de pago como mejora si hay conexión:

1. **Elegir la mejor voz del propio navegador** (`mejorVoz` en voz.js): entre las
   voces del idioma, prioriza las DE RED (`localService === false` — las de Google en
   Android/Chrome, servidas por internet igual que el resto de voz de Google, y que se
   nota de inmediato que suenan mejor) y si no hay, las que digan
   "Enhanced"/"Premium"/"Neural" en el nombre (así marca iOS/Edge las suyas). Cuesta
   cero, no necesita conexión ni proxy configurado, y es la que se usa siempre que la
   de la nube (abajo) no esté disponible o no dé tiempo.
2. **Voz de Gemini, si hay proxy y hay tiempo** (ruta nueva `/__voz` en
   worker/index.js, llamada desde `hablar()` en voz.js con un tope de 4 segundos):
   bastante más natural que cualquier voz del navegador. Reutiliza las MISMAS claves
   de Gemini que ya usa el chat (`clavesGemini`) — no hace falta pegar ningún secreto
   nuevo en Cloudflare si ya se tiene Gemini puesto para el chat. Gemini devuelve el
   audio en PCM crudo, sin envolver; se envuelve en un WAV mínimo en el propio
   navegador (`pcmAUrlDeAudio`) porque `<audio>` no reproduce PCM crudo tal cual.
   Documentado en worker/README.md (dos variables opcionales: `GEMINI_TTS_MODEL` y
   `GEMINI_TTS_VOZ`, ninguna obligatoria).

Es un EXTRA sobre la voz del navegador, nunca una base: si no hay proxy, si no hay
conexión, si el Worker tarda más del tope o si falla por lo que sea, se seguía con la
voz local (mejorada por el punto 1) sin que se note la espera ni salga ningún error en
pantalla — nadie se queda muda por esto. Al escribir el `useEffect` que dispara todo
esto apareció un fallo real, no de la función en sí sino del cableado: `yaLeido.current`
(la marca de "esto ya se ha dicho", para no repetir el saludo al volver a la pestaña) se
ponía ANTES de esperar el token de sesión; con StrictMode (que monta-desmonta-remonta a
propósito en desarrollo) el primer montaje marcaba la respuesta como "ya dicha" y se
cancelaba antes de llegar a hablar, y el remontado de verdad ya no decía nada al
encontrarla marcada — en producción (sin ese doble montaje) no se habría notado nunca,
pero en `npm run dev` el asistente se habría quedado mudo en la pestaña Humano.
Arreglado moviendo la marca a DESPUÉS de esperar el token, dentro del mismo guardián
`vivo` que ya cancelaba intentos obsoletos. Comprobado con Playwright en tres escenarios:
sin nube disponible (elige la voz de red, no la local por defecto), con el Worker
devolviendo audio (se reproduce el de la nube y NO se cae también a la local) y con el
Worker fallando (cae a la local sin ningún error de página sin capturar).

**Jarvis: la animación no se parecía a la del vídeo de referencia (OpenHuman), y
minimizar el reactor al tocarlo.** Dos pedidos seguidos, con vídeo de por medio en los
dos (grabaciones de pantalla, extraídos los fotogramas con ffmpeg —no había en la
imagen, se instaló solo para esto— porque una captura suelta no enseña el movimiento).

1. **La animación.** Comparando fotograma a fotograma el vídeo contra capturas de
   nuestro propio Jarvis (mismo tamaño, banco de pruebas temporal), la estructura ya
   era la misma —dial de marcas, aro de barras girando, dos arcos a su propio ritmo,
   núcleo con resplandor— pero el vídeo se ve mucho más vivo: arcos gruesos y bien
   visibles, aro de barras tupido como una turbina. El nuestro tenía los arcos casi a
   trazo fino (2px/1.5px) y solo 16 barras finas con hueco de sobra entre una y otra.
   Arreglado subiendo el grosor de los arcos (3px/2.5px, más opacidad) y las barras a
   24, más anchas (Jarvis.jsx, index.css) — nada de colores ni del resplandor tocado,
   pedido tal cual ("sin quitar lo de que cambie de color y el resplandor"). Sigue
   siendo SVG + CSS puro, cero librerías (confirmado al dueño, que preguntó por el
   rendimiento).
2. **Minimizar el reactor al tocarlo, en la pestaña Humano.** El segundo vídeo no
   llegaba a enseñar ningún clic de verdad (7.7s enteros de la misma rotación en
   reposo), así que se preguntó dónde quería el control antes de tocar nada — eligió
   Humano. Primera versión: tocar a Jarvis encogía solo la caja del muñeco
   (`.hum-escena`) y su `<svg>`, dejando todo lo demás del panel (el micro, "Cómo te
   habla"…) del mismo tamaño de siempre. Un TERCER vídeo ("aquí se ve mejor") enseñó
   que no era eso: en la referencia, minimizar hace desaparecer el panel ENTERO y deja
   solo un reactor pequeño flotando en la esquina con una aspa para cerrarlo — que es
   ni más ni menos que nuestra PROPIA burbuja flotante (BotonAsistente.jsx), ya hecha y
   ya probada. Rehecho antes de fusionar nada: tocar a Jarvis en Humano llama al mismo
   `onCerrar` de siempre (el que ya usa el aspa del panel), sin ningún tamaño
   intermedio que inventar ni animar. La única pieza nueva de verdad: la pestaña activa
   ahora se guarda (`gula_asistente_pestana`, Asistente.jsx) — antes el panel se
   desmontaba entero al cerrarse y volvía a abrir siempre en Charla, así que "minimizar
   y volver a abrir" habría aterrizado en el sitio equivocado sin esto. Solo Jarvis
   tiene este botón —los demás compañeros no—. Comprobado con Playwright: tocar el
   reactor en Humano cierra el panel y deja la burbuja (0 `.asis-panel`, 1
   `.asis-flotante-boton`), y volver a tocar la burbuja reabre directamente en Humano
   (`aria-selected="true"`), no en Charla.

**Y encima, la burbuja flotante (54px) seguía sin el anillo ni los arcos.** El dueño
preguntó directamente: "esa animación también tiene que tenerla la burbuja, ¿no?". El
umbral que decide si Jarvis se dibuja simplificado (`compacto` en `conteos()`,
Jarvis.jsx) estaba en `size < 80`, y la burbuja usa 54px —por debajo, así que caía del
lado compacto y perdía el anillo y los dos arcos justo donde el asistente se ve todo
el rato (la esquina de la pantalla). Bajado el umbral a `size < 50`: la cabecera
(30px, el único sitio que de verdad necesita la versión simplificada) se queda igual,
y la burbuja (54px) pasa a dibujarse con el mismo detalle que la pestaña Humano
(170px), sin inventar un tercer nivel de detalle. Comprobado con Playwright a
`deviceScaleFactor: 3` (como se ve en un móvil de verdad): el anillo y el arco
aparecen en la burbuja y se leen limpios, no emborronados; la cabecera sigue sin
ellos.

**Una de las preguntas de ejemplo del chat vacío sonaba de trámite.** El dueño vio
"¿A qué hora hay que salir del obrador?" y dijo que no le gustaba, sin especificar la
forma nueva. Cambiada a "¿A qué hora salimos del obrador?" — quita el "hay que", que
suena a obligación impuesta, por algo más directo, como lo preguntaría alguien del
equipo de verdad (Asistente.jsx, la lista de `asis-vacio`).

**En escritorio, la columna de configuración (izquierda) y la lista de conceptos
(derecha) se mueven con dos scrolls distintos, y no se notaba.** El dueño mandó una
captura: para ver el final de la configuración (equipamiento, bandejas, nevera...)
hacía falta poner el ratón encima de esa columna y bajar AHÍ, un gesto distinto del
que mueve la lista de la derecha (que es el scroll normal de la página). `.config-
sidebar` es `position: sticky` con su propio `overflow-y: auto` — a propósito, para
poder cambiar cualquier ajuste sin perder de vista dónde ibas en una lista de 135
conceptos —, pero sin ningún aviso visual de que seguía habiendo más por debajo (o
por encima), el panel parecía "cortado" en vez de "con más si sigues bajando".
Antes de tocar nada se comprobó que no había un TERCER scroll escondido en ningún
otro sitio de esta pantalla (`.main-layout`, `.checklist-main`, `.category-section`:
los tres en `overflow-y: visible` o `hidden`, ninguno con scroll propio) — pedido
explícito del dueño. Arreglado con el truco de "sombras de scroll" sin JS (dos capas
que tapan el borde y se mueven CON el contenido, `background-attachment: local`, más
dos sombras que se quedan fijas, `background-attachment: scroll`): la sombra solo
asoma cuando la capa que la tapa ya se ha desplazado fuera de la vista, que es justo
cuando de verdad queda algo por ver en esa dirección. Comprobado con Playwright
leyendo `scrollTop`/`scrollHeight` del panel en tres puntos (arriba del todo, a
mitad, abajo del todo) contra capturas: arriba del todo no sale sombra por arriba,
abajo del todo no sale por abajo, y a mitad salen las dos.

**La voz seguía sonando artificial en móvil, incluso después de lo de arriba.** El dueño
avisó de que, pese al arreglo de `mejorVoz`/voz de Gemini, en su móvil (y quizás en PC)
seguía sonando como la voz local de siempre. Sospecha directa: la voz de Gemini nunca
llegaba a usarse y todo caía en silencio a la ruta 1 (voz del navegador) sin que se viera
ningún aviso — exactamente el comportamiento "nadie se queda muda por esto" documentado
arriba, que aquí jugaba en contra porque escondía el fallo real. Comprobado: el modelo
por defecto de `vozDeGemini()` (worker/index.js) era `gemini-2.5-flash-preview-tts`, que
ya no existe — la llamada fallaba con un 404 normal (no de cuota), `vozDeGemini()` lo
lanzaba, el Worker contestaba 502 y `voz.js` caía a la local sin dejar rastro visible.
Verificado contra fuentes en vivo de Google (con `ai.google.dev`, `firebase.google.com` y
otros dominios de la documentación bloqueados por el proxy de este entorno, pero
`raw.githubusercontent.com`/`github.com` sí accesibles): la forma del JSON de la llamada
(`generationConfig.responseModalities`, `speechConfig.voiceConfig...`) seguía siendo
correcta contra el `.proto` oficial de `googleapis/googleapis`, y `generateContent` (el
endpoint que se usa) sigue totalmente soportado en agosto de 2026 pese a existir ya una
"Interactions API" más nueva — no hacía falta ningún cambio de arquitectura, solo el
nombre del modelo estaba caducado. Mismo motivo que ya obligó a separar `GEMINI_MODEL`
para el chat (Google retira nombres de modelo sin avisar): cambiado el valor por defecto
a `gemini-3.1-flash-tts-preview`, dejando `GEMINI_TTS_MODEL` (ya existía desde el punto 2
de arriba) como la vía para pisarlo el día que esto vuelva a pasar. Sin verificar contra
una clave real de Gemini desde este entorno —el mismo límite ya señalado al entregar lo
de arriba—, así que queda pendiente de que el dueño confirme en su móvil tras el
despliegue si ahora sí se nota la voz de la nube.

**Primer punto del plan de mejoras: B1, dependencias.** Traído `ANALISIS.md` y
`PLAN_MEJORAS.md` de la revisión a fondo (ver más abajo su propia entrada), y
arrancado el "orden recomendado" por B1 (la dependencia más pequeña e
independiente): `npm audit fix` quitó los 2 HIGH (`nanoid`, `postcss`, ambos
solo de build, ninguno llega al bundle final) y `npm update` subió las
versiones menores dentro de lo que ya permitía el rango de `package.json`
(vite 8.1.1→8.2.2, react/react-dom 19.2.7→19.2.8, lucide-react 1.26.0→1.34.0,
firebase 12.17.1→12.18.0, más `@types/react`, `@types/react-dom`,
`@vitejs/plugin-react` y `oxlint`) — sin tocar `package.json` a mano, todo
dentro del `^` que ya había. `typescript` (5.9.3→7.0.2, mayor) se deja fuera
a propósito: no es "menor" y no estaba pedido. `npm audit`: 0
vulnerabilidades. `test:rapido` (tipos, cálculos, asistente, build,
sincronización) en verde. El lint sube de 116 a 126 avisos, pero son avisos
NUEVOS que caza la versión más reciente de `oxlint` sobre código que ya
estaba ahí (dos `set-state-in-effect` en `Formulario.jsx`) — 0 errores, nada
que rompa, y no se tocan en este mismo PR para no mezclar "subir versiones"
con "cambiar comportamiento"; quedan anotados para una pasada de limpieza
aparte. El CI cazó algo que se me había escapado: `npm update` sube también
`rolldown` como dependencia indirecta (1.1.3→1.2.5), y la nueva versión
genera `worker/pegar.js` con una forma de código ligeramente distinta para
el mismo `worker/index.js` (hoistea el `await` a una variable antes de
esparcirlo, en vez de esparcir la promesa resuelta directamente) — mismo
comportamiento, solo el CI de "regenerado" (compara `worker/pegar.js` byte a
byte contra lo que saldría de compilar `worker/index.js` ahora mismo) lo
cazó, y por eso hacía falta el commit de regeneración aparte.

**A1 del plan: comparar los ratios propios con el sector.** Se preguntó si el
asistente puede comparar los números de la casa con los del sector para
saber si están dentro de lo normal — y, a raíz de eso, también si el
asistente puede aprender de los datos reales de los eventos en vez de
depender del sector, y qué "comida" se podría calibrar así (se acabó en la
paella: es la cantidad que sí tiene un ratio fijo y calculable, `1 paellera
cada 30 pax`). Nuevo `src/asistente/sector.js`: la tabla del sector como
dato puro (`SECTOR`, con nombre, unidad, banda `[min, max]` y fuente por
ratio) y `compararRatios(actuales)`, que devuelve tono `dentro` /
`por-encima` / `por-debajo` / `sin-dato` y el delta % — sin inventar nada:
un ratio sin `actual` que compararle sale marcado `sin-dato`, no se omite en
silencio. Nueva herramienta de solo lectura `comparar_con_sector` en
`herramientas.js` (sin dueño, no depende de ningún evento): junta los
ratios EN VIVO de sus ficheros de siempre (`leerRatios()` de personal.js
para camareros —así respeta cualquier ajuste guardado en Firestore, no el
valor de fábrica—, `RATIOS_BEBIDA` de bebida.js, `KG_HIELO_POR_PAX` de
calculos.js y `PERSONAS_POR_PAELLA` de paella.js, las dos últimas
exportadas para esto) y los pasa por `compararRatios`. Con filtro opcional
por nombre ("dime lo de la paella").

**Ojo con lo que devuelve, a propósito.** La banda del sector NO es para
pisar lo medido: la boda a 9 pax/camarero sigue midiendo 19 eventos reales
y sale "por-debajo" de la banda del sector (12-15) porque aquí se pone MÁS
gente que el sector, no menos — eso ya estaba documentado en personal.js
como decisión intencional, y la propia descripción de la herramienta se lo
dice al modelo para que no lo lea como un fallo a corregir. Los ratios que
de verdad se benefician de esto son los que nadie ha medido todavía
(paella, cumpleaños, producción): ahí el sector es la única referencia que
hay. Los números de `SECTOR` son de fuentes públicas recogidas el
2026-08-25, **sin validar contra el equipo** — se lo dice la propia
descripción de la herramienta al modelo, para que lo diga si alguien
pregunta por su fiabilidad. La banda de la paella en concreto es la más
floja de todas: sale de una ración genérica de arroz por persona, no de
paelleras reales, y así queda anotado en el propio `sector.js`.

**Lo que se dejó fuera de este PR, a propósito.** El punto 4 del diseño
(`aplicar_ratio`, escribir el ajuste en `indice/ratios`) y el 5 (aviso
nocturno determinista) estaban marcados "opcional" en `PLAN_MEJORAS.md`;
esto es solo la parte de LEER y comparar. Cocina y "margen" se quedan fuera
de la comparación en vivo (están en la tabla del sector como referencia,
pero cocina no tiene un ratio único con el que compararla — depende del
tramo de pax — y margen no es un ratio de cantidad, es una recomendación de
precio): forzar un número ahí habría sido inventarlo, justo lo que este
fichero existe para no hacer.

**El aviso de "hay una versión nueva" no decía QUÉ traía, y no se notaba que
el clic en Actualizar hacía algo.** Dos pedidos seguidos del dueño: que el
banner enseñe los cambios (bugs arreglados, cosas nuevas) antes de recargar,
y que el asistente también avise de la actualización, lea los cambios y
confirme cuando ya se ha aplicado — no solo el banner de arriba, que hay
quien abre directamente la Charla.

1. **De dónde sale el texto.** Nuevo `src/cambios.js`: una lista a mano, con
   revisión, no generada — mismo estilo que `precios.js` y `sector.js`.
   Frases para quien carga el camión ("la voz suena más natural"), no para
   quien programa ("fix(worker): ..."). La entrada más reciente va primero;
   `ultimoCambio()` la da suelta. `vite.config.js` la importa y publica sus
   `cambios` dentro de `version.json` en cada build — solo la última
   entrada, no el historial entero: es un aviso que se ve de pasada, no una
   página de notas.
2. **El banner (App.jsx).** El fetch que ya comparaba `__BUILD_ID__` ahora
   también lee `cambios` de `version.json` y los pinta en una lista dentro
   del aviso. El botón "Actualizar" tenía un fallo real de UX: llamaba a
   `window.location.reload()` sin más, así que en una conexión lenta no se
   notaba que el clic había hecho algo hasta que la pantalla cambiaba de
   golpe. Ahora pone el botón en "Actualizando…" (con icono `RefreshCw`
   girando, `.icono-gira` — genérico, reusa el mismo `@keyframes` que ya
   tenía `.asis-gira` del asistente) y espera **medio segundo antes de
   recargar de verdad**. Ese medio segundo no es capricho: la primera
   versión usaba un doble `requestAnimationFrame` (dos fotogramas, ~32ms)
   pensando que bastaba con pintar el cambio antes de navegar — y sí se
   pintaba, pero 32ms es tan imperceptible para una persona como no poner
   nada, así que no arreglaba lo que se pedía arreglar. `setTimeout(…, 500)`
   sí se nota.
3. **El asistente confirma la actualización de verdad, no solo avisa.**
   Nuevo `src/asistente/actualizacion.js`: `marcarActualizando(id, cambios)`
   se llama justo antes de recargar y deja dicho a qué build se está
   actualizando (en `localStorage`, `gula_actualizando_a`); `confirmaSiActualizado(buildActual)`
   se llama al arrancar y, SOLO si el build de esta carga es justo el que se
   esperaba, devuelve los cambios y borra la marca — así no se repite la
   confirmación en cada arranque siguiente, y si la recarga no llegó a
   aplicar la versión nueva (sin conexión, caché) no se inventa una
   confirmación que no ha pasado. `avisosConfig.js` → `saludoPendientes()`
   gana un quinto parámetro, `avisoActualizacion` (`{ cambios, aplicada }`):
   compone "Hay una actualización disponible: …" o "Me acabo de
   actualizar: …" según el momento, y va el PRIMERO de todo el saludo — es
   lo más reciente que le ha pasado a la app. Como el resto de este
   fichero, es determinista y sin nube: si `vozActiva` está puesta, se lee
   en voz alta igual que cualquier otro saludo, sin cablear nada nuevo para
   eso.
4. **Cableado.** `contextoDelAsistente()` (contexto.js) gana el campo
   `avisoActualizacion`, sin recorte (no lleva nada sensible, son las
   mismas frases del banner). App.jsx lo calcula: `actualizacionAplicada`
   se comprueba UNA vez al montar (`useState(() => confirmaSiActualizado(__BUILD_ID__))`);
   si no hay nada que confirmar, se mira si hay una versión nueva esperando
   y se compone el aviso "pendiente" en su lugar — nunca los dos a la vez,
   uno es consecuencia del otro.

**Cazado en pruebas, no a ojo:** intentar anular `window.location.reload`
desde un test (`window.location.reload = () => {}`) no lanza pero tampoco
hace nada — Chromium lo trata como "unforgeable" (protección del propio
navegador). La primera versión de la prueba se quedó callada ahí (el clic
disparaba una recarga de verdad, la página volvía al estado inicial, y la
prueba veía "Actualizar" en vez de "Actualizando…" sin explicar por qué).
Arreglado aprovechando el medio segundo de margen real: el test pulsa,
espera bien por debajo de esos 500ms y comprueba el estado intermedio, y
LUEGO espera a que la recarga de verdad llegue sola.

**Cada uno puede elegir su voz de Gemini, no una fija para todo el equipo.**
Tras el arreglo del modelo de voz, el dueño notó que sonaba con "Kore" (voz
femenina por defecto) y preguntó por una más parecida a Jarvis; buscada la
tabla de las ~30 voces de Gemini con su carácter (fuente de terceros — los
dominios oficiales de Google siguen bloqueados desde aquí), la más cercana
es "Charon" ("informativa y clara"). En vez de solo decir cuál poner a mano
en Cloudflare, se preguntó si el propio asistente podía dejar elegir, y
tiene más sentido: antes era UNA voz igual para todo el equipo
(`GEMINI_TTS_VOZ`), puesta por quien instala el Worker, no por quien habla
con el asistente cada día.

1. **`src/asistente/vozGemini.js`** (nuevo): un puñado CURADO de 8 voces (no
   las ~30 — un desplegable con "Sadaltager" y "Zubenelgenubi" sin
   explicación es ilegible para quien no sabe qué es eso), cada una con su
   tono en una frase. A mano, con revisión, no generado — mismo estilo que
   `precios.js`/`sector.js`/`cambios.js`. `vozGeminiValida()` sanea contra
   la lista; lo que no está en ella cae en `""` ("automática").
2. **El selector, en Ajustes** (Asistente.jsx): chips iguales a los de nivel
   y proveedor, con "Automática" (deja mandar al Worker, es el estado de
   siempre) más las 8 curadas. Se guarda en `localStorage`
   (`gula_asistente_voz_gemini`), por dispositivo — igual que la
   personalidad o el nivel de permiso, cada uno el suyo.
3. **De Ajustes al Worker**: la voz elegida viaja en `nube.voz` (Humano.jsx
   → `hablar()` → `pedirVozDeNube()`, voz.js) hasta el cuerpo del POST a
   `/__voz`. En el Worker, **se vuelve a validar contra la MISMA lista**
   (`worker/index.js` importa `CLAVES_VOZ_GEMINI` directamente de
   `src/asistente/vozGemini.js` — un único sitio con la lista, sin
   duplicarla; rolldown la deja inlineada en `pegar.js` igual que ya hace
   con `repaso.js`): no basta con que el cliente ya la valide, un cliente
   cualquiera podría mandar lo que quisiera, y colarle a Gemini un
   `voiceName` inventado tira la petición entera. La lógica de "qué voz
   manda" se sacó a `vozElegida(vozCliente, env)`, exportada aparte —mismo
   motivo que `clavesGemini()`: para poder probarla sin llamar a Gemini de
   verdad—: la del cliente si es válida, si no `GEMINI_TTS_VOZ`, si no
   "Kore", en ese orden.
4. **Verificado con capturas** (CLAUDE.md lo exige para cambios visuales):
   el arnés aislado de Asistente.jsx de siempre, en móvil y escritorio —
   los 9 chips (Automática + 8) caben en dos filas sin desbordar en
   ninguno de los dos anchos. Comprobado también por DOM directo que elegir
   una voz activa su chip, desactiva "Automática", cambia la nota
   explicativa y se guarda — el primer intento con `getByRole` de
   Playwright se hizo un lío con dos botones de nombre parecido
   ("Automático" del proveedor de chat vs "Automática" de la voz) y daba
   timeouts raros; no era un fallo de verdad, así que se verificó por
   consulta directa al DOM en vez de perseguir la causa exacta del lío de
   Playwright.

## Decidido NO hacer (y por qué)

- **Partir `App.jsx` (3.979 líneas) / `index.css` (5.806).** Mucho riesgo, ganancia que
  nadie ve. Ahí vive todo el estado de la checklist.
- **Optimizar React** (0 `useCallback`, `ModalModoCarga` sin `useMemo`): sigue sin
  medirse en el navegador. Lo que SÍ se midió (ver "Rendimiento: medido ANTES de tocar")
  dice que la aritmética del calendario no es el problema — así que ningún `useMemo`
  nuevo hasta tener el número de React pintando delante.
- **Partir el CSS**: 18 kB comprimidos, clases del tramo final compartidas con la
  checklist (`btn`, `form-input`, `link-roto`, `envio-*`…). Partirlo rompe el diseño.
- **Firebase**: ya carga con `import()` dinámico en los tres sitios. Nada que ganar.

## Rendimiento real (4G, CPU ×4, gzip como sirve GitHub Pages)

| App | Red | Primer pintado |
|---|---|---|
| Checklist | 167 kB | 0,76 s |
| Calendario | 150 kB | 0,66 s |
| Formulario | 101 kB | 0,65 s |

## Cómo probar lo que está tras el login

`pruebas/calendario.html` monta los mismos componentes con datos inventados, sin nube:
`?vacio=1`, `?pantalla=1`, `?solover=1`, `?promover=1`.

Lo de `App.jsx` se prueba **simulando el arranque** en `sincronizacion.test.mjs`, contra
un Firestore en memoria con las mismas reglas.

## Recomendación actual

**Parar de añadir y usarlo una semana.** Lo nuevo está probado contra datos inventados,
no contra un septiembre con tres bodas el mismo día.
