# Análisis profundo — estado del proyecto

> Fecha: 2026-08-25 · Commit `e5ca4d5` (punta de `main`).
> Todo lo de este documento se corrió y midió en un contenedor limpio
> (node 22.22.3 / npm 10.9.8): `npm install`, `npm run test:rapido`,
> `npm run lint`, `npm run build`, `npm run medir`, `npm audit` y un barrido
> de datos sensibles sobre todo el árbol. Lo que NO se volvió a correr lo dice
> cada sección (la batería de navegador son ~45 min y el emulador de reglas
> pide Java).

## Veredicto general

Proyecto muy por encima de la media para una app interna en producción:
seguridad pensada, pruebas que cazan fallos reales y una documentación que
explica el porqué. Lo que hay que hacer no es rescatar nada, es seguir:
mejoras de negocio (los números del camión), un par de parches de
correspondencia entre sistema y permisos, y el arreglo barato de las
dependencias. Por áreas:

| Área | Estado | Resumen en una línea |
|---|---|---|
| Datos sensibles (repo público) | ✅ | Barrido limpio: nada real en el árbol; la única clave es la de cliente Firebase (pública por diseño) |
| Rendimiento | ✅ | Medido; sin palanca sin medición (se respetan las decisiones documentadas) |
| Limpieza del código | 🟡 | 0 errores de lint, 116 warnings de la casa; 1 comentario obsoleto |
| Duplicación | ✅ | Tres pruebas recorren `src/` y fallan si algo vuelve a copiarse |
| Estructura y escalabilidad | 🟡 | Mapa de módulos limpio; `App.jsx` es deuda conocida y aceptada |
| Pruebas y CI | 🟡 | 1.073 comprobaciones node en verde hoy; `npm audit` da 2 HIGH (solo de build) |

## 1. Datos sensibles y privacidad — el repo es público

Barrido con patrones de: teléfonos españoles (móvil/fijo), `wa.me/<número>`,
correos, `€`/precios, tipos de clave (OpenAI `sk-`, Google `AIza…`, AWS
`AKIA…`, GitHub `ghp_…`, llaves privadas PEM), IPs, direcciones/códigos
postales, `.env` y URLs reales de `workers.dev`, sobre
`src/ worker/ pruebas/ checklist/ calendario/ formulario/ public/ .github/`.

**Lo que hay:**

- **Ningún teléfono real.** Las únicas coincidencias numéricas: paths de SVG
  (falsos positivos) y el fixture `600 11 22 33`, que es ficticio a propósito
  para probar `sinDatosPersonales()`.
- **Ningún correo real.** `ejemplo.com`, `equipo@gula.com` (placeholder de un
  input) y `robot@gula.local` (README) — todos inventados.
- **Ningún precio de compra en el código.** Los 53 precios vivían en
  `src/precios.js` y se subieron a Firestore `indice/precios` (migración
  cerrada y documentada). Lo que queda son textos de UI y comentarios que
  explican cuentas: el plus de furgoneta (25 € es el por defecto editable, y
  0,26 €/km es el kilometraje oficial público) y ejemplos de frases.
- **Ningún `.env`** (gitignoreado con el comentario "nunca al repositorio,
  que es público"), ninguna URL real del Worker (solo placeholders; la real
  vive en `indice/proxy`).
- **La única credencial en el bundle es la clave pública de cliente de
  Firebase** (`src/firebaseConfig.js`). Correcto por diseño: esa clave es
  pública en cualquier app web de Firebase; la puerta la ponen Auth +
  `firestore.rules`, y las reglas se prueban en dos sitios, uno de ellos el
  motor real de Google.
- Fixtures con nombres inventados (documentado: tres nombres reales que se
  colaron ya se cambiaron).

**Veredicto: verde.** Como ya pasó una vez con los nombres, el plan incluye
una prueba que repite el barrido en cada batería (PLAN_MEJORAS B7): el único
cierre que no depende de que alguien se acuerde.

## 2. Rendimiento — medido, no a ojo

**Cuentas puras (`npm run medir`, node 22):**

| Apuntes | Una pintada entera del mes |
|---|---|
| 250 | 2,2 ms (sanea 0,41 · porDia 0,39 · próximos 0,11 · choques 0,19 · rejilla 1,07) |
| 500 | 4,4 ms |

Confirma lo documentado: la aritmética no es el problema, lo es React
pintando — y eso todavía no se mide (el plan B8 lo pone en CI).

**Build (`npm run build`), tamaños reales de hoy:**

| Trozo | Sin comprimir | Gzip | Cuándo se descarga |
|---|---|---|---|
| `index.esm` (Firebase/Firestore) | 555 kB | 162 kB | Solo al usar la nube (`import()` dinámico, documentado) |
| `users` (lucide-react, 95 iconos) | 199 kB | 64 kB | Inicial |
| `checklist` (la app) | 128 kB | 39 kB | Inicial |
| `index.esm` (React + compartido) | 127 kB | 36 kB | Inicial |
| CSS principal | 132 kB | 24 kB | Inicial |
| `Asistente` | 101 kB | 33 kB | Perezoso, precargado en el rato muerto |

El trozo inicial de checklist (39 kB gzip) coincide con el medido en CONTEXTO
(167 kB de red y 0,76 s de primer pintado en 4G). El chunk grande de 555 kB
se comprobó que es el SDK de Firestore (transporte WebChannel/longpolling),
no app: carga perezosa y solo para quien toca la nube.

**Sin palanca sin medición:** los dos pesos iniciales (iconos y CSS) tienen
decisión documentada de NO tocar (95 iconos de verdad usados; clases
compartidas entre las tres apps). No se propone optimizarlos aquí por el
mismo motivo de siempre: sin el número delante, es adivinar.

## 3. Limpieza del código

- **Lint (oxlint, 118 ficheros): 0 errores, 116 warnings.** De la casa
  (`catch(e)` y compañía, documentado en CONTEXTO; la última cifra apuntada
  era ~108 — vigilar que no siga creciendo).
- **Tipos:** `tsc --checkJs` en verde sobre los 13 módulos puros (decisión
  gradual documentada; no es migración a TypeScript).
- **Comentario obsoleto:** la cabecera de `src/asistente/herramientas.js`
  dice "Todas son de SOLO LECTURA. Ninguna escribe nada" — falso desde que
  existen `apuntar_tarea`, `marcar_tarea`, el conector de calendario y
  `crear_checklists`. El propio fichero ya lo corrige abajo en cada sección;
  la cabecera no (PLAN_MEJORAS B4).
- **`App.jsx` (4.357 líneas) y `index.css` (7.805):** decisión documentada de
  no partirlos, y se ratifica: es riesgo a cambio de una ganancia que nadie
  ve. La vía si algún día hace falta ya existe (tres trozos perezosos con su
  carpeta).

## 4. Duplicación

Las tres pruebas que recorren `src/` y fallan si algo vuelve a copiarse están
vivas (en `calculos.test.mjs` y `app.test.mjs`) y la batería sale en verde —
es decir, el barrido anti-copias de hoy no encontró nada. Historial
documentado: `fecha`, `texto`, `almacen`, `tema`, `companeros`, `asistente/texto`.

## 5. Estructura y escalabilidad

- **Un sitio por preocupación** (mapa en CONTEXTO): `nube.js` es la única
  puerta a Firestore, `contexto.js` la única puerta al asistente,
  `permisos.js` decide sin React ni nube, `revision.js` son reglas puras que
  reutiliza el Worker. Es la razón por la que el asistente se monta con una
  línea y se prueba con node.
- **Tres PWAs con ámbitos hermanos** (no anidados: decision de navegador
  documentada).
- **Identidades intocables** (`categoría::label`, `fecha_slug`) documentadas
  como lo que se respeta antes que nada.
- **Límites de escala conocidos y con motivo documentado** — no son fallos,
  son el punto donde cada decisión deja de valer:
  - Todo el estado vive en `App.jsx`: cada función nueva crece el mismo
    fichero (aceptado).
  - Memoria sin embeddings: bien a escala actual; el aviso a vigilar es que
    las respuestas empeoren al crecer los recuerdos.
  - Gasto por aparato (documentado y explicado en pantalla): si el equipo
    quiere verlo global, se agrega en el Worker (PLAN_MEJORAS D2).
  - Enrutado por listas de palabras: transparente y suficiente; el aviso a
    vigilar es un enrutado mal visto en conversación.

## 6. Pruebas y CI

- **En verde hoy:** 388 (cálculos) + 464 (asistente) + 221 (sincronización)
  = **1.073 comprobaciones node**, más `tipos` y `build`. (CONTEXTO apunta
  711 de navegador, ~45 min, y 28 de reglas contra el motor real de Google:
  no se volvió a correr en este análisis.)
- **CI:** `test.yml` en cada push/PR (lint + test:rapido + que
  `worker/pegar.js` no se separe de su fuente + barrido de navegador por la
  noche), `deploy.yml` que no publica en rojo al fusionar en `main`, y
  `main` protegida con los dos checks.
- **Ámbar — dependencias:** `npm audit` da **2 HIGH**:
  - `nanoid ≤3.3.17` — generadores no seguros pueden buclar en infinito con
    tamaño inválido.
  - `postcss ≤8.5.22` — lectura de `.map` arbitraria por `sourceMappingURL`
    con `from` sin poner.
  Ambos son **solo de tiempo de build** (cadena de vite): no afectan a la app
  que corre en el móvil, sí al CI que hace `npm ci` + build. Arreglo barato:
  `npm audit fix` + la batería entera (PLAN_MEJORAS B1).
- **Menores disponibles:** vite 8.1.1→8.2.2, react/react-dom 19.2.7→19.2.8,
  lucide-react 1.26→1.34, firebase 12.17.1→12.18.0. TypeScript 5.9.3→7.0.2
  es major: no se toca.

## 7. Lo que NO se toca (decisiones ratificadas)

De CONTEXTO, con su motivo, que sigue en pie: no partir `App.jsx`/
`index.css`; ningún `useMemo`/`useCallback` sin medición delante; sin
librerías de animación; no Tinyflows (segundo motor de reglas); no partir el
CSS; no tipar `App.jsx` de golpe; no tocar las tres guardias ni las
identidades. Este documento no propone saltarse ninguna de ellas.
