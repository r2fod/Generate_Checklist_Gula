# Generate_Checklist_Gula — contexto para retomar

App interna de **Gula Catering** para montar la checklist de material de cada evento.
React 19 + Vite + Firebase Firestore, publicada en GitHub Pages.

- Rama `main` · Firebase: `gula-checklist`

## Empieza por aquí

Si acabas de llegar, en este orden:

1. **Estas reglas del dueño**, que están justo debajo. Saltárselas cuesta trabajo tirado.
2. **"Conceptos que hay que respetar"** — la identidad de un item y la de un apunte. Son
   la diferencia entre una mejora y borrarle el trabajo a alguien que está cargando un
   camión.
3. **"Proceso"** — cómo lanzar las pruebas sin romperte tú solo el deploy.
4. **"Pendiente"** — lo que hay empezado, sobre todo la migración de precios, que está
   aprobada y a medias y es destructiva si se hace de golpe.

Y el mapa rápido de dónde vive cada cosa:

```
src/App.jsx                 la checklist entera (~4.000 líneas). Todo el estado vive aquí
src/calendario/             la app del calendario
src/formulario/             la app de la oficina (sin login)
src/asistente/              el asistente: cerebro, herramientas, permisos, muñeco
src/nube.js                 TODO lo que habla con Firestore, en un solo sitio
src/precios.js              los 53 precios (pendientes de mudarse a Firestore)
src/checklist-generadores.js  qué material lleva cada tipo de evento
src/revision.js → asistente/revision.js  las reglas de "esto no cuadra"
worker/                     el proxy de las claves + el repaso de la noche
src/__tests__/              las cuatro baterías
pruebas/calendario.html     banco de pruebas sin nube, para lo que hay tras el login
```

**Lo que más se toca y menos se entiende de primeras:** `src/nube.js`. Todo pasa por ahí
y los comentarios explican por qué cada colección está donde está — sobre todo por qué el
calendario tiene dos documentos y no uno con un flag.

## Reglas del dueño (no negociables)

1. **Todo en español**, código y comentarios.
2. **Sin romper nada.** Está en producción y se usa cargando camiones.
3. **Que no se quiten los checks hechos de los eventos.**
4. **Responsive, sobre todo móvil** (320/360/390/412/480/768/1024/1280/1920).
5. **El repositorio es público.** Nada que identifique a una persona en el código: ni
   clientes, ni personal, ni teléfonos, ni €/pax. Eso vive en Firestore. En pruebas,
   nombres inventados.
6. Respuestas **breves**.

## Cómo se revisa lo visual

Las pruebas comprueban desbordamiento y texto cortado, **no si algo se ve bien**. Dos
cosas que pasaron las pruebas y estaban rotas: el muñeco invisible fuera de su caja, y
los ajustes apilados encima de cada pestaña.

Cuando toques la interfaz, **haz capturas y míralas**. Con playwright-core y el chromium
que ya está instalado:

```js
await p.locator(".asis-panel").screenshot({ path: "x.png", animations: "disabled" });
```

`animations: "disabled"` no es opcional: el compañero respira en bucle, así que sin eso
Playwright espera 30 s a que el elemento "esté quieto" y revienta por timeout.

Y para cazar lo que sí es automatizable —que nada se salga del panel ni se monte encima
de la cabecera— se recorre `.asis-panel *` comparando cada caja con la del panel.

## Cómo se escribe aquí

Mira cualquier fichero de `src/asistente/` antes de escribir: el estilo es muy marcado y
desentona enseguida.

- **Los comentarios explican POR QUÉ, no qué.** `// suma los pax` sobra; `// se lee la
  nube antes de escribir: partir de lo que hay en pantalla pisaría lo que otro acaba de
  guardar` es el estilo. Casi todos cuentan **un fallo que ya pasó**, y por eso valen:
  son la única forma de que no se repita.
- Cada fichero abre con una cabecera `// ─── TÍTULO ───` que explica por qué existe.
- **Nada de duplicar.** Si algo se escribe dos veces, se extrae (así salieron
  `promoverApuntes`, `ajusteCompartido`, `companeros.js` y `texto.js`).
- **Los avisos dicen qué hacer**, no solo qué pasó. El motivo del proveedor se devuelve
  tal cual en vez de "algo ha fallado": eso ahorra abrir los logs de Cloudflare.
- **Una prueba por cada fallo arreglado**, y con el porqué en el texto de la prueba.

## Comandos

```
npm run lint          # oxlint (los ~137 warnings de catch (e) son de la casa; ERRORES tiene que haber 0)
npm run test          # calculos → asistente → build → sincronizacion → app (navegador)
npm run worker:build  # empaqueta el Worker en worker/pegar.js (ver más abajo)
npm run deploy        # predeploy = test, no publica en rojo
```

Estado: **335 (cálculos) + 386 (asistente) + 201 (sincronización) + 711 (navegador), 0 fallos.**

La batería entera tarda **~45 minutos**, casi todo el barrido responsive
(9 anchos × 2 temas × 10 pantallas = 180 cargas de página). No es que esté colgada.

### Proceso (costó dos deploys rotos y una pérdida de trabajo)

- **No editar archivos mientras corre `test` o `deploy`**: `deploy` publica lo que haya
  en `dist/` AL TERMINAR, así que reconstruir por medio publica código sin probar.
- **Una sola cosa a la vez**: los dos usan el puerto 4178.
- **Commit y push de cada pieza en cuanto está verde.** El contenedor se recicla y lo no
  subido se pierde (ya pasó).
- Matar procesos por PID; `pkill -f` se mata a sí mismo. Y `pgrep -f "npm run test"`
  **casa con su propio comando**: un bucle de espera escrito así no termina nunca. Usar
  `pgrep -f "npm [r]un test"`, que el corchete rompe la auto-coincidencia.
- Lanzar la batería con `setsid nohup … &` y leerla de un fichero. Con `| tail` no se ve
  nada hasta el final, y un `timeout` corto la mata sin dejar rastro (pasó: exit 143).
- **El build NO caza los errores de ejecución.** Un `useCallback` cuyo array de
  dependencias nombra un `useState` declarado más abajo compila perfecto y revienta la
  app entera al pintar, con la página en blanco (pasó, y el síntoma fue un locator del
  barrido esperando 30 s a un botón que nunca aparecía).

## Arquitectura

Tres apps, cada una en SU carpeta (los ámbitos de PWA no pueden anidarse):
`checklist/` (login) · `formulario/` (sin login, entra por código) · `calendario/`
(login salvo enlace compartido).

### Firestore

```
indice/evt_<slug>-<hash>  archivo de checklists (un doc por evento)
indice/eventosGuardados   doc antiguo: SOLO se lee, foto congelada de la migración
indice/calendario         apuntes originales intactos + los dos códigos del calendario
indice/precios            precios corregidos (solo lo cambiado)
indice/ratios             pax por camarero por tipo (solo lo cambiado)
calendario/<codigo>       el calendario real     — enlace "?cal="
calendario/<ver>          copia de solo lectura  — enlace "?ver=" (OTRO documento)
publico/<codigo>          próximos eventos que ve la oficina
envios/<id>               lo que manda la oficina
```

`firestore.rules` **se pega a mano en la consola**: no hay `firebase.json` y no se
despliega solo. Hoy consola y repo coinciden.

### Conceptos que hay que respetar

- Identidad de un item = `${categoría}::${labelOriginal}`. Cambiar un label
  **destruye los checks del usuario**.
- Identidad de un apunte = `${fecha}_${slug}`.
- El estado se lee con `estadoInicial.X ?? por-defecto`: un estado **parcial** es válido.
- Abrir un evento = escribir `gula_checklist_estado` y recargar la página.

### La cadena de datos

```
CALENDARIO          →  CHECKLIST (archivo)  →  FORMULARIO      →  CHECKLIST
nombre, tipo, día,     creada sola a 14 días   menú, barra,       material
hora, sitio, pax       marcada "sinConfigurar" equipamiento…
```

**La lista de eventos que ve la oficina sale del ARCHIVO DE CHECKLISTS, no del
calendario.** Por eso la checklist se crea pronto: si no existe, la oficina la escribe a
mano y llega duplicada.

## Lo hecho

- Calendario en colección propia con **dos enlaces**. El de mirar es otro documento y no
  se lee de vuelta, así que no puede tocar el real. Los códigos viven en `indice/`, que
  pide sesión: del enlace de ver no se pasa al de editar.
- **Checklists creadas solas** a 14 días al abrir la app, marcadas `sinConfigurar`, con
  aviso en pantalla y etiqueta en el archivo. Se apaga al aplicar el envío del formulario.
- Enlaces rotos que se curan: al borrar una checklist su apunte vuelve a contar como
  pendiente. Lo pasado no se resucita.
- Precios y ratios en Firestore, subiendo **solo lo cambiado**. El aviso "ratio sin
  comprobar" se apaga cuando alguien pone el suyo.
- Responsive medido a 9 anchos con el helper `revisaCaja()` de la batería.
- Logo 67 → 11 kB (WebP 450px q80).
- **El asistente entero** (ver su sección): cerebro con memoria y árbol, subconsciente,
  objetivos, tareas, conversaciones guardadas, enrutado entre proveedores, contador de
  tokens con tope, permisos por nivel, ocho compañeros animados con 7 gestos, voz,
  conectores, diario de gasto por vuelta y cuatro personalidades.
- **Sin markdown en las respuestas.** Se le pide en el sistema Y se limpia en
  `sinMarcas()`: pedirlo no basta, un modelo se olvida cada tantas respuestas y el que
  se olvida no avisa.
- **El repaso de la noche**: el Worker mira los eventos aunque nadie abra la app.
- **Limpieza del repositorio**: se colaron tres nombres reales de personas en las
  pruebas y se cambiaron por inventados. Si añades fixtures, **inventa los nombres**.

## EL ASISTENTE (la pieza más nueva y la más grande)

Un asistente propio inspirado en **OpenHuman**, analizado y **reimplementado**, no
clonado (OpenHuman es Rust + Tauri, una app de escritorio: no cabe en una web estática).
Vive en `src/asistente/` y se monta con una línea en cada app:

```jsx
<BotonAsistente contexto={contextoDelAsistente({ … })} />
```

Está en **checklist y calendario**. En el formulario NO, a propósito: el dueño descartó
que rellenara formularios.

### La regla de oro

**El contexto es lo único que existe para él.** Lo que no se le pase, no lo ve. Por eso
se arma en un solo sitio (`contexto.js`) y no en cada app.

### Las piezas

| Fichero | Qué es |
|---|---|
| `cliente.js` | El bucle de herramientas y el mensaje de sistema. Máx. 6 vueltas |
| `herramientas.js` | 18 propias + las de los conectores. Cada una declara `datos` y `escribe` |
| `conectores/` | WhatsApp, correo, calendario, checklists. El hueco por donde crece |
| `permisos.js` | 3 niveles + la lista `NUNCA` |
| `memoria.js` / `arbol.js` | El cerebro: recuerdos con fuente, y árbol por tema/fuente/día |
| `subconsciente.js` | Lo que repasa al abrir. Determinista, 0 tokens, funciona sin red |
| `objetivos.js` / `tareas.js` | Lo que importa y lo que queda por hacer |
| `enrutado.js` | Elige proveedor según la pregunta |
| `gasto.js` | Tokens y euros por proveedor, mes y día. Tope de gasto |
| `personalidad.js` | Cuatro tonos. Solo cambian CÓMO habla |
| `texto.js` | `sinMarcas()`: le quita el markdown a las respuestas |
| `revision.js` | Las reglas de "esto no cuadra". **Puro: lo reusa el Worker** |
| `Humano.jsx` / `Companero.jsx` | Los ocho oficios, cuerpo entero y busto |
| `companeros.js` | La LISTA de compañeros y `companeroValido()`, aparte para que node pueda leerla |

### Los compañeros

Ocho OFICIOS con cuerpo: cocinera, cocinero, camarero, camarera, logística,
parrillero, sumiller y repostera. **Comparten el mismo cuerpo** y cambian tres cosas —lo
de la cabeza, lo de las manos y el detalle del pecho—, porque ocho torsos distintos se
descuadran en cuanto se toca uno.

Empezaron siendo objetos con cara (un gorro, una cazuela, una paella) y no funcionaban:
un objeto solo puede inclinarse, así que los siete gestos se quedaban en un balanceo.

Se dibujan **dos veces**: cuerpo entero en `Humano.jsx` (pestaña Humano) y busto en
`Companero.jsx` (cabecera, 30px — a ese tamaño una persona entera es una mancha). La
lista vive en `companeros.js` y una prueba compara los dos ficheros: añadir uno en un
solo sitio hacía que al elegirlo desapareciera en la otra pantalla.

Los colores son tokens `--pj-*` con su versión en oscuro (la chaquetilla blanca sobre
fondo oscuro deslumbra). **Van opacos, mezclados con el fondo, no la misma tinta a media
opacidad**: con transparencia, cada pieza solapada sumaba color y dejaba costura —se veía
el cuello a través de la chaquetilla—.

### Siete cosas que costaron caro y no hay que repetir

1. **La barrera de datos.** Cada herramienta declara `datos: true/false`. A un proveedor
   que entrena con lo que recibe (OpenAI) **solo se le ofrecen las de calcular**, nunca
   las que devuelven nombres. Y si aun así pidiera una, el cliente la rechaza. Una
   herramienta desconocida se trata como sensible por defecto.

2. **El mensaje de sistema no puede contradecir al nivel de permiso.** Tenía una línea
   suelta —"No puedes cambiar nada todavía: solo consultar"— de cuando de verdad no
   escribía. En Confianza el modelo recibía las dos órdenes a la vez y obedecía la
   equivocada: decía que solo podía consultar. Hay una prueba que lo vigila.

3. **Las dos apps tienen que encender los mismos conectores.** El calendario los tenía y
   la checklist no, así que el MISMO asistente contestaba distinto según por dónde lo
   abrieras. Hay una prueba que compara los dos ficheros.

4. **El muñeco se dibuja en dos ficheros** (busto en la cabecera, cuerpo entero en
   Humano). Añadir uno solo en uno hace que al elegirlo desaparezca en la otra pantalla.
   Por eso la lista vive en `companeros.js` y hay una prueba de paridad. Esa prueba lee
   las CLAVES del objeto `OFICIOS`, no el texto de la línea: mirando el formato exacto
   avisaba de un fallo inexistente en cuanto uno se escribía más corto.

5. **Un flex en columna centrado cuyo contenido no cabe empuja los primeros hijos por
   encima del borde de arriba**, y ahí no se llega ni con scroll. `.hum` estaba centrado
   y, al crecer esa pantalla, el muñeco se fue 218px fuera y quedó detrás de los
   ajustes: existía, medía 191px y era invisible. Centrar en vertical algo que puede
   crecer es una bomba de relojería.

6. **Animar `max-height` obliga a `overflow: hidden`.** Los ajustes lo hacían y, siendo
   hijos flex de un panel que los encogía, lo de abajo quedaba cortado sin forma de
   llegar: había un botón que no se podía ni pulsar. Se animan con opacidad y
   desplazamiento, y llevan su propio scroll.

7. **Los ajustes SUSTITUYEN a la pestaña, no se apilan encima.** Apilados se comían
   media pantalla de móvil en las cinco pestañas a la vez.

### El proxy (Cloudflare Worker)

Las claves de API **no pueden ir en el bundle**: el repositorio es público. Viven como
secretos de un Worker que además comprueba que quien pregunta tiene sesión del equipo.

- `worker/index.js` — **la fuente**, la que se lee y se edita.
- `worker/pegar.js` — **lo que se pega en Cloudflare**. Es la fuente con `revision.js`
  empaquetada dentro (`npm run worker:build`). Hay que regenerarlo y volver a pegarlo
  cada vez que se toque el Worker o la revisión.
- **La URL del Worker NO está en el repositorio**, a propósito: vive en `indice/proxy`,
  y el primero que la configura la deja puesta para todo el equipo.

### El repaso de la noche

Un cron del Worker que pasa `revisarProximos()` sobre los eventos de los próximos 30 días
y deja el resultado en `indice/avisos`; la app lo enseña en *Cerebro*. **No usa el
modelo**: son las reglas de siempre, así que cuesta 0 tokens y no depende de ningún
proveedor. El cron entra con una cuenta "robot" de Firebase (secretos del Worker), así
que las reglas de Firestore siguen pidiendo sesión y no hay que tocarlas.

`/__repaso` lo lanza a mano, **pero pide la sesión en una cabecera**: no se puede abrir
en una pestaña del navegador —eso se documentó mal una vez y no funcionaba—. Hay un
botón "Repasar los eventos ahora" en los ajustes del asistente, que es el único sitio
con el token.

### Lo que el asistente NO puede hacer, en ningún nivel

`marcar_cargado`, `marcar_preparado`, `marcar_vuelto`, `apuntar_roturas`,
`renombrar_item`, `renombrar_categoria`, `borrar_evento`, `borrar_archivo`.

No es un permiso que alguien pueda dar en un desplegable: la identidad de un item es
`categoría::etiqueta`, así que tocarlo destruye lo que otra persona lleva marcado en el
camión, sin forma de recuperarlo y sin que nadie sepa por qué.

### Tres guardias que NO se pueden tocar (las cazaron las pruebas)

1. **Esperar a `archivoListo`** antes de crear checklists. Mientras el archivo baja de la
   nube un evento no consta, y se crearía una encima pisando la buena con sus checks.
2. **Un apunte sin `id` no genera enlace**: `undefined` casa con todos los que tampoco lo
   tengan y marca media lista con el nombre equivocado.
3. **Marcar los apuntes en UNA sola escritura**: tres seguidas parten de la misma foto y
   solo sobrevive la última.

## Pendiente

### 1. Mover los precios a Firestore — EN DOS DESPLIEGUES, no en uno

Está **aprobado por el dueño** y a medias. `src/precios.js` tiene 53 precios de compra
sacados de su hoja de cálculo: el coste unitario de cada bebida y cada consumible. Es
información comercial en un repositorio público —revela sus márgenes y su poder de
compra—, así que se saca. (No los copies aquí al documentar el cambio: este fichero
también es público.)

**El detalle que lo convierte en destructivo si se hace de golpe:** Firestore guarda hoy
**solo las diferencias** (`soloLosCambiados()`), no el catálogo. Borrar `PRECIOS_BASE`
sin más no es mudarlo, es **borrarlo**: el Resumen pasaría a calcular con casi nada para
todo el equipo y no habría de dónde recuperarlo.

El plan acordado:

1. **Despliegue A** — añadir en la pantalla de 💶 Precios una acción "subir todos los
   precios a la nube" (los 53, no solo lo cambiado). El dueño la pulsa una vez.
2. **Comprobar** que `indice/precios` tiene los 53, abriendo desde otro dispositivo.
3. **Despliegue B** — quitar `PRECIOS_BASE` del repositorio.

**Lo que hay que aceptar y decírselo:** un navegador nuevo **sin conexión** se quedará sin
precios hasta conectarse una vez. Hoy funciona siempre porque van dentro de la app.

**Lo que NO se mueve, y no es negociable:**

| Qué | ¿A la nube? | Por qué |
|---|---|---|
| Ratios de personal y factores de bebida | No | Poco sensibles, y sin ellos la app no calcula nada en el primer arranque |
| Nombres de items y categorías | **Nunca** | Son la identidad `categoría::etiqueta`: moverlos **borra los checks de todos** |
| Nombres de proveedores de alquiler | **Nunca** | Van dentro del nombre del item, así que caen en lo anterior |

### 2. Del dueño, en la app (necesita su sesión)

- Un apunte a **250 pax**; otro del **9 al 10 de octubre** con el campo *Hasta*.
- **Ratios de cumpleaños y producción**: el panel existe, falta medir un evento real.
- **Montar el repaso de la noche**: cuenta de robot en Firebase y tres variables en
  Cloudflare (ver `worker/README.md`). El cron ya está creado.

### 3. Tinyflows — decidido NO hacer por ahora

Automatizaciones que el dueño defina desde la app ("cada lunes revisa la semana").
Necesitan un editor de reglas y un intérprete en el Worker, y eso deja **un segundo motor
de reglas** viviendo al lado de `revision.js` y del subconsciente: en cuanto se separan,
uno avisa de cosas que el otro no. El repaso de la noche cubre el 80 % del valor sin eso.

## Decidido NO hacer (y por qué)

- **Partir `App.jsx` (3.979 líneas) e `index.css` (5.806).** Mucho riesgo, ganancia que no
  ve nadie. Ahí vive el estado entero de la checklist.
- **Optimizar React** (0 `useCallback`, `ModalModoCarga` sin `useMemo`): **nada medido**.
  Solo con un caso real de lentitud delante.
- **Partir el CSS**: son 18 kB comprimidos, y las clases del tramo final están compartidas
  con la checklist (`btn`, `form-input`, `link-roto`, `envio-*`…). Partirlo rompe el diseño.
- **Firebase**: ya carga con `import()` dinámico en los tres sitios. No hay nada que ganar.

## Rendimiento real (4G, CPU ×4, con gzip como sirve GitHub Pages)

| App | Red | Primer pintado |
|---|---|---|
| Checklist | 167 kB | 0,76 s |
| Calendario | 150 kB | 0,66 s |
| Formulario | 101 kB | 0,65 s |

## Cómo probar lo que está detrás del login

`pruebas/calendario.html` monta los mismos componentes con datos inventados y sin nube:
`?vacio=1`, `?pantalla=1`, `?solover=1`, `?promover=1`.

Lo que vive dentro de `App.jsx` se prueba **simulando el arranque** en
`sincronizacion.test.mjs`, contra un Firestore en memoria con las mismas reglas.

## Recomendación actual

**Parar de añadir y usarlo una semana.** Lo nuevo está probado contra datos inventados,
no contra un septiembre con tres bodas el mismo día.
