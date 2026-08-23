# Generate_Checklist_Gula — contexto para retomar

App interna de **Gula Catering** para montar la checklist de material de cada evento.
React 19 + Vite + Firebase Firestore, publicada en GitHub Pages.

- Rama `main` · Firebase: `gula-checklist`
- **Reglas del dueño → `CLAUDE.md`** (se carga solo en cada sesión). Léelo primero.

## ⚠ Estado de la rama `arena/01a02ba9-…`: verificada por otra sesión, con 2 fallos reales arreglados

Esta rama va por delante de `main` y trae CI, desduplicación, rendimiento, reglas de
Firestore, diario de fallos y tipado. Una sesión distinta (con chromium y Java
disponibles, que es justo lo que le faltaba a quien la escribió) la ha comprobado
entera: **`npm run test` (711/711), `TZ=Pacific/Auckland npm run test:rapido` y
`npm run reglas:emulador` (28/28 contra el motor real) están en verde.**

Por el camino aparecieron dos fallos reales, los dos ya arreglados y con su prueba:

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

**c) Lo que solo puede hacer el dueño** (aquí la API contesta `403`): mover
`ci/test.yml` y `ci/deploy.yml` a `.github/workflows/`, proteger `main`, y **volver a
pegar `worker/pegar.js` en Cloudflare** (el bundle cambió). Detalle en "Pendiente".

**d) Lo que NO está hecho de lo que se pidió**: los coeficientes de niños y la
calibración del hielo (ver "Pendiente", punto 2). Nadie ha tocado esos números todavía.

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
- Una prueba por fallo arreglado, con el porqué en su texto.

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

### CI y publicación (`ci/*.yml`, todavía FUERA de su sitio)

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

**Los dos están en `ci/` y hay que moverlos a `.github/workflows/`.** GitHub rechaza el
push entero cuando una App sin permiso `workflows` toca esa carpeta (*"refusing to allow
a GitHub App to create or update workflow"*). Lo mueve el dueño:

```
git mv ci/test.yml .github/workflows/test.yml
git mv ci/deploy.yml .github/workflows/deploy.yml
```

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
| `Humano.jsx` / `Companero.jsx` | Ocho oficios: cuerpo entero y busto |
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
| **—** | **Logística: niños, hielo y contraste con el sector** | **SIN EMPEZAR.** Es el punto 2 del encargo y toca cantidades que salen en el camión |

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

**0. Del dueño, fuera de la app** (30 segundos cada una, aquí no hay permiso):
- **Mover `ci/test.yml` → `.github/workflows/test.yml`** (ver "CI"). Hasta entonces no
  corre nada solo.
- **Proteger `main`**: Settings → Branches, patrón `main`, pedir PR y exigir los checks
  *Lint y pruebas rápidas* y *worker/pegar.js regenerado*. La API contesta `403 Resource
  not accessible by integration`: es cosa de un administrador.
- **Volver a pegar `worker/pegar.js` en Cloudflare**: la desduplicación tocó
  `menus-especiales.js`, que va empaquetado dentro. Mismo comportamiento, pero lo que
  corre allí es el bundle viejo hasta que se pegue.
- **`deploy.yml`**: ya escrito (`ci/deploy.yml`, con la batería entera como puerta).
  Al moverlo, comprobar que Settings → Pages sigue apuntando a la rama `gh-pages`.

**2. Logística: los números que se cargan en el camión — SIN EMPEZAR**
- **Coeficientes de niños** en comida, refrescos y equipamiento (bodas, comuniones y
  eventos familiares). Hoy los niños ya cuentan para agua y refresco (`alcoholPax`
  separa a los adultos), pero comida y equipamiento van sobre el total sin distinguir.
- **Hielo**: ya sale en kg, bolsas y taxis (1 taxi = 12 bolsas de 2 kg = 24 kg) y ya
  aplica merma por derretimiento cuando no hay congelador (`MERMA_SIN_CONGELADOR`, 1,35
  en verano y 1,2 en invierno). Falta **contrastar esos dos números con un evento real**:
  salieron de una estimación, no de una medición.
- **Contrastar los ratios con lo que usa el sector**, para no cargar de más ni quedarse
  corto. Cada cambio, con su prueba y su porqué: son cantidades que alguien mete en un
  camión, no una constante cualquiera.

**3. Del dueño, en la app** (necesita su sesión):
- Apunte a **250 pax**; otro del **9 al 10 de octubre** (campo *Hasta*).
- Ratios de cumpleaños/producción: panel existe, falta medir un evento real.
- Verificar los **53 precios** en `indice/precios` desde otro dispositivo (el Despliegue B
  —quitar `PRECIOS_BASE`— ya está hecho; esto es la comprobación de que llegaron).

**4. Tinyflows — decidido NO hacer por ahora.** Automatizaciones definidas por el dueño
("cada lunes revisa la semana"). Necesitan editor de reglas + intérprete en el Worker →
segundo motor de reglas junto a `revision.js` y el subconsciente; separados, uno avisa
de cosas que el otro no. El repaso de la noche cubre el 80% del valor sin eso.

## Hecho (referencia, no acción)

**Migración de precios a Firestore — cerrada, los tres pasos.** `src/precios.js` tenía
53 precios de compra en el código (repo público → revelaban márgenes). Subidos desde
💶 Precios, comprobados los 53, `PRECIOS_BASE` fuera del código junto al botón de
migración (ya usado). Nube = única fuente: navegador que nunca se conectó se queda sin
precios hasta la primera vez. `handleGuardarPrecios` sube el catálogo entero en cada
corrección — con `setDoc`, subir solo la diferencia sobrescribiría el documento.

**Repaso de la noche — montado y probado en producción.** Mira 11 eventos, escribe en
`indice/avisos`; cron a las 05:00 UTC.

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
