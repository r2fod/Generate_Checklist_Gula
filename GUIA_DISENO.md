# Guía de diseño y ahorro de contexto (`GUIA_DISENO.md`)
> Destilado propio (MIT/Apache-2.0, ideas, sin código copiado) de UI UX Pro Max, Ponytail y RTK, adaptado a Gula. Sustituye instalar los tres plugins.
> Manda `CLAUDE.md`: CSS nativo (sin librerías), 320–1920 px, tokens `--fs-*`/`--radius-*`, no quitar datos ni paneles.

## 1. Diseño de páginas (de UI UX Pro Max)
**Flujo para rediseñar una pantalla**
1. Leer el JSX + CSS actual y listar qué se ve hoy (datos, líneas, paneles). Eso **no se quita**: solo cambia la forma.
2. Fijar en 5 líneas: patrón (qué ordena la pantalla), estilo, color (tokens existentes), tipografía (`--fs-*`) y qué evitar.
3. Aplicar por orden de prioridad (abajo). Parar al primer nivel crítico que falle.
4. Captura real a 320 px y 1280 px, claro y oscuro (`animations: "disabled"`). Pase final con el checklist §1.3.

**1.1 Prioridades (de mayor a menor impacto)**
1. **Accesibilidad**: contraste texto 4,5:1 (grande 3:1; iconos y bordes de control 3:1) en claro **y** oscuro por separado · foco visible 2–4 px · iconos sin texto con `aria-label`, decorativos con `aria-hidden` · el color nunca es el único aviso (icono o texto) · encabezados sin saltar nivel · respetar `prefers-reduced-motion`.
2. **Táctil**: objetivo ≥44×44 px (mínimo absoluto web 24×24) · separación ≥8 px · campos móviles ≥44 px de alto · respuesta al pulsar <100 ms · `touch-action: manipulation` · nada que dependa solo de `:hover`.
3. **Rendimiento**: imágenes con `width/height` o `aspect-ratio` (CLS <0,1) · `loading="lazy"` bajo el pliegue · listas ≥50 elementos, virtualizar · esqueleto si algo tarda >1 s · debounce en scroll/resize/input.
4. **Estilo**: SVG propios, nunca emoji como icono · una sola familia de iconos y grosor · un solo botón principal por pantalla · colores por token, nunca hex suelto en componentes · escala de elevación coherente.
5. **Layout**: mobile-first · sin scroll horizontal · `min-height: 100dvh`, no `100vh` · espaciado en múltiplos de 4/8 px · cuerpo ≥16 px en móvil · línea de 35–60 caracteres en móvil y 60–75 en escritorio · barras fijas con `padding` que reserve su hueco y `env(safe-area-inset-*)` · escala z-index: 0/10/20/40/100/1000.
6. **Tipografía y color**: interlineado 1,5–1,75 · pesos: títulos 600–700, cuerpo 400, etiquetas 500 · números tabulares (`font-variant-numeric: tabular-nums`) en cantidades y tablas · nada <12 px · modo oscuro con tonos propios, no colores invertidos · errores/éxitos también a 4,5:1.
7. **Animación** (solo CSS nativo): animar solo `transform` y `opacity`, nunca `width/height/top/left` · 150–300 ms · salida ~60–70 % de la entrada · escalonado de listas 30–50 ms · máx. 1–2 elementos animados por vista · interrumpibles · todo bajo `@media (prefers-reduced-motion: reduce)` → sin movimiento.
8. **Formularios**: etiqueta visible (el `placeholder` no es etiqueta) · validar al salir del campo, no por tecla · error junto al campo con `aria-describedby` + `role="alert"` · tras fallo, enfocar el primer campo inválido y **conservar lo escrito** · botón deshabilitado solo mientras envía · permitir pegar · `autocomplete` y `type`/`inputmode` correctos · confirmar antes de acciones destructivas o salir con cambios sin guardar · modal: foco dentro, `Esc` cierra y devuelve el foco.
9. **Navegación**: ubicación actual resaltada · máx. 5 entradas en barra inferior, con icono y texto · volver atrás restaura scroll y estado · no mezclar pestañas, lateral y barra inferior en el mismo nivel.
10. **Gráficos/datos**: leyenda siempre visible · no depender solo del color (forma/patrón) · tabla o resumen de texto alternativo · ejes y etiquetas a 4,5:1 · donut/pastel solo hasta 5 categorías.

**1.2 Anti-patrones (rechazar en revisión)**
Scroll horizontal · anchos fijos en px · zoom deshabilitado · cambios de estado instantáneos (0 ms) sin transición · mezcla de plano y relieve al azar · emoji como icono · gris sobre gris · hex sueltos · placeholder como etiqueta · errores solo arriba del formulario · animar propiedades de layout · una sola duración para todo · navegación sobrecargada · color como único significado · gradientes morado/rosa "de IA" sin motivo.

**1.3 Checklist de entrega**
- [ ] 320 px, 375 px y 1280 px; vertical y horizontal; sin scroll horizontal.
- [ ] Claro y oscuro, contraste revisado por separado.
- [ ] Texto del sistema al máximo sin romper layout; `reduced-motion` probado.
- [ ] Objetivos ≥44 px, foco de teclado visible y no tapado por barras fijas.
- [ ] Todo lo que se veía antes sigue visible (datos, líneas, paneles).
- [ ] Solo tokens `--fs-*`/`--radius-*`/color; cero hex nuevos.
- [ ] Estados pulsado/deshabilitado/vacío/cargando/error definidos.
- [ ] Captura real revisada (no solo tests verdes).

## 2. Escribir poco código (de Ponytail)
**Antes de tocar**: leer la tarea y el código afectado y listar los puntos de impacto (llamadores, tests, fixtures, config, exports). La escalera va **después** de entender el problema. Se para en el primer peldaño que lo resuelve:
1. ¿Hace falta? Lo no pedido (opciones, flexibilidad, "por si acaso") se omite y se nombra en una línea.
2. ¿Ya existe en el repo (helper, componente, patrón)? Se reutiliza como lo hace el código de alrededor.
3. ¿Lo da la plataforma/estándar? Se usa, salvo que el proyecto tenga el suyo (un componente de la casa gana al nativo).
4. ¿Hay una dependencia ya instalada? Se usa. **Nunca** una nueva por pocas líneas.
5. ¿Cabe en una línea legible a primera vista? Una línea (si hay que descifrarla, no es corta).
6. Si no, el mínimo código que funcione.

**Reglas**
- Perezoso con la solución, **nunca con el cambio**: terminar todas las partes (llamadores, tests, fixtures).
- Borrar gana a añadir; mantener la estructura existente. El diff más corto gana, una vez sabido todo lo que debe tocar.
- Arreglo de bug: `grep` de todos los llamadores y arreglar la causa en el código compartido, una vez.
- Lo movido o fusionado conserva su validación y manejo de errores.
- A igualdad de tamaño, la opción correcta en casos límite.
- Lógica nueva no trivial (rama, bucle, parser, dinero, seguridad) deja al menos un test; lo trivial no.
- Comentario solo para el porqué, en una línea. Atajo con límite conocido: `// atajo: <límite>, <cuándo mejorarlo>`.
- Sin abstracciones, envoltorios, opciones ni configuración que nadie pidió.
- **Nunca recortar**: validación en fronteras de confianza (entrada de usuario, JSON importado, `worker/`), errores que evitan pérdida de datos, seguridad, accesibilidad, y lo que pidió el dueño.
- Cada respuesta termina con 1–2 líneas: qué se omitió o no se probó, y qué riesgo hay.

**Revisión** (equivale a `/ponytail-review`): leer el diff **y** el código que toca; por hallazgo → qué hace, qué sale mal, cómo arreglarlo, qué pasa si no. Buscar: bugs, seguridad, carga real, código de riesgo sin test, rutas lentas, qué recortar. **Auditoría** (`/ponytail-audit`): igual sobre todo el repo, empezando por mapa (entradas, flujo de datos, carga) y ordenado por importancia (arreglar ya / debería / opcional).
**No aplicar** en `src/nube.js`, `firestore.rules`, `worker/` ni migraciones: ahí manda `PLAYBOOK_AGENTES.md` (N3) y la corrección va antes que la brevedad.

**Disciplina al cambiar código** (de `ub-mode`, MIT; solo lo que Gula aún no tenía):
- **Primero funciona, luego bien, luego práctica.** Una unidad pequeña cada vez, comprobada antes de la siguiente.
- **Forma de los datos antes que la lógica** y una decisión en un solo sitio (ya es la regla de IDs y `estadoInicial.X ?? default`).
- **Frontera**: validar donde entra el dato (JSON importado, formularios, `worker/`), dentro confiar; la lógica de negocio en funciones puras.
- **Idempotente**: repetir una operación, o repetirla tras un fallo a medias, deja el mismo estado (migraciones, `nube.js`, "Traer" del calendario).
- **Atacar la premisa**: si dos arreglos con la misma idea fallan en la misma prueba, escribir la premisa en una frase y quitarla antes de intentar un tercero.
- **Construir la palanca**: si la tarea no es obvia, hacer una unidad a mano y luego un script que la repita igual (como `figma.mjs`, `lab-captura.mjs`).
- **Test de comportamiento**: llama al código como lo usa la persona y mira lo que ve; si pasaría aunque todas las funciones devolvieran vacío, se tira.
- **Proteger el contexto**: hilo principal pequeño; lo voluminoso (búsquedas, logs, lecturas largas) a un subagente y se queda solo el resumen.
- **Log**: al terminar, lista breve de lo hecho y por qué.
- **No adoptado**: "push a la rama principal al final" (aquí manda PR y la regla de fusión de `CLAUDE.md`) y las herramientas Crapper/Dryer/Mutator (no verificadas para este JS).

## 3. Menos tokens en la salida de comandos (de RTK)
RTK es un binario; aquí se replica la idea a mano. Principios: solo fallos, agrupar, recortar, avisar de qué se cortó, **nunca ocultar el error** y conservar el código de salida.

| En vez de | Usar |
|---|---|
| `npm run test` (suite entera a pantalla) | lanzar a `test.log` (ya es regla) y leer solo `grep -nE "FAIL\|✗\|Error\|passed\|failed" test.log \| head -40` |
| `git status` | `git status --short` |
| `git log` | `git log --oneline -20` |
| `git diff` | `git diff --stat` primero; `git diff -U1 -- <archivo>` después |
| `ls -R` / `find` | `ls <dir>` o `git ls-files <dir> \| head -50` |
| `grep -rn` amplio | `grep -rn --include='*.js' patrón src \| cut -c1-200 \| head -50` |
| `npm run lint` | `npm run lint 2>&1 \| tail -30`; si hay muchos, agrupar por regla |
| leer archivo grande entero | `Read` con `offset`/`limit`, o `grep -n` y luego el tramo |

Reglas: si recortas con `head`/`tail`, di cuántas líneas quedaron fuera; si el resumen no basta, relee crudo. Nunca filtrar cuando se depura un fallo sin causa clara.

## 4. Catálogo por sector
Para elegir estilo, paleta, tipografía y patrón de un tipo de negocio: `diseno/INDICE.md` (copia por sectores de la base de UI UX Pro Max). Leer solo el sector y el tipo que toque, nunca la carpeta entera. Gula → `comida-eventos` y `gestion-herramientas`.

## 5. Laboratorio y Figma (sin conectores)
**Laboratorio** (`diseno/lab/`, solo con `npm run dev`, fuera del build): una variante = un fragmento HTML en `diseno/lab/variantes/<nombre>.html` con CSS nativo y **solo tokens** de `src/index.css`; se añade su nombre a `variantes/indice.json`. `npm run lab:captura [nombre]` la captura a 320 y 1280 px, claro y oscuro, y avisa si hay scroll horizontal (salida en `diseno/lab/capturas/`, ignorada por git; si no encuentra chromium, `CHROMIUM_PATH=...`). Se revisa la captura a ojo; la elegida pasa a `src/`.
**Figma** (`scripts/figma.mjs`, sin conector): `FIGMA_TOKEN=... node scripts/figma.mjs "<enlace del frame>" [--imagen] [--prof=6]`. Token personal de Figma con permiso de solo lectura de archivos, **solo en variable de entorno**. Imprime el frame comprimido (tamaños, gap, padding, radios, colores, tipografías) y marca cada valor `=--token` (exacto), `≈--token` (a ≤12 de distancia) o `sin token` (preguntar, no inventar hex). `--imagen` baja el PNG a `diseno/lab/capturas/` para compararlo con la captura del laboratorio. Pasar frames de móvil **y** de escritorio: Figma no da el responsive.
Flujo: Figma → `figma.mjs` → variante en el laboratorio → `lab:captura` → comparar con la imagen de Figma → pasar a `src/`.
Pendiente: probado solo con datos inventados con la forma documentada de la API; falta un frame real (sustituir el de `src/__tests__/figma.test.mjs`).

## 6. Cómo se usa (IAs)
- Rediseño de pantalla → PB-B de `PLAYBOOK_AGENTES.md` + §1 de esta guía. Cambios de código en general → §2. Salida de comandos → §3.
- Cualquier IA (Claude, Gemini/Antigravity) la lee bajo pedido, como `PLAN_*.md`; no hace falta instalar plugins.
- Gemini MCP puede dar segunda opinión visual sobre capturas (su respuesta es entrada a verificar).
