# Playbook de Agentes y Enrutado Automático (`PLAYBOOK_AGENTES.md`)
> Orquestación automática para **Antigravity** y **Claude Code**. Espejo global en `~/.gemini/GEMINI.md` y `~/.claude/CLAUDE.md`.

## 1. COORDINADOR (Sesión Principal)
- **Flujo**: Clasificar subtarea (N1/N2/N3) → delegar al modelo mínimo viable (`invoke_subagent` en Antigravity / `Task` en Claude) → verificar → **único que hace commit/merge/push**.
- **Cambio automático**: Tú eliges un modelo fijo en la UI (ej. `Gemini 4 Argon Medium` o `Opus`); el Coordinador cambia solo el modelo de cada subagente con el parámetro `Model`.
- **A subagentes (en paralelo si son independientes)**: búsquedas, lecturas `>150` líneas, cruces de JSON/calendario, cambios acotados con tests, revisión de `git diff`, baterías de tests.
- **Directo en Coordinador (sin subagente)**: ediciones de 1–5 líneas ya localizadas o decisiones que dependen del paso inmediatamente anterior.
- **Indicador obligatorio en pantalla (en cada mensaje al usuario)**:
  - Cabecera fija al responder: `🤖 [Coordinador · <Modelo actual>] → <Tarea en curso>`
  - Por cada subagente lanzado: `↳ ⚡ [Subagente <Rol> · <Modelo (Flash-Lite / Flash / Argon / Pro / Haiku / Sonnet)>] → <Qué está haciendo y resultado>`

## 2. MATRIZ DE MODELOS (Enrutado Automático por Coste)
- **N1 · Barato (`$`) — Solo lectura / Búsqueda / Verificación rápida**
  - **Modelos UI**: `Gemini 2.5/3 Flash-Lite`, `Gemini 4 Argon (Low)`, `Gemini Flash`, `Claude Haiku`.
  - **Parámetro automático**: Antigravity `Model: "flash_lite"` (`TypeName: "research"`) | Claude `subagent_type: "buscador"` (`model: "haiku"`).
  - **Uso**: `grep`/búsquedas, localizar `archivo:línea` en `src/App.jsx` (~5.200L) o `CONTEXTO.md` (~2.200L), cruzar calendario Drive↔App, resumir `test.log`, auditar datos reales en `git diff`.
- **N2 · Medio (`$$`) — Implementación acotada / UI / Tests / Revisión**
  - **Modelos UI**: `Gemini 4 Argon (Medium)`, `Gemini 2.5/3 Flash`, `Claude 4/3.7 Sonnet`.
  - **Parámetro automático**: Antigravity `Model: "flash"` o `"inherit"` (`TypeName: "self"`) | Claude `subagent_type: "implementador"` o `"revisor"` (`model: "sonnet"`).
  - **Uso**: desduplicar funciones (`src/checklist-generadores.js`), fórmulas en `src/calculos.js` + `calculos.test.mjs`, UI con tokens `--fs-*`/`--radius-*`, herramientas en `src/asistente/`, capturas Playwright (`animations: "disabled"`), correr `lint` + `tipos` + `test:rapido`.
- **N3 · Caro (`$$$`) — Arquitectura / Sincronización / Seguridad**
  - **Modelos UI**: `Gemini 4 Argon (High)`, `Gemini 2.5/3 Pro`, `Claude 4 Opus`.
  - **Parámetro automático**: Antigravity `Model: "pro"` | Claude sesión principal (`opus`) + 2ª opinión MCP `google-gemini`.
  - **Uso**: `src/nube.js`, concurrencia/estado en `src/App.jsx`, migración de IDs (`${categoría}::${labelOriginal}`, `${fecha}_${slug}`), seguridad (`firestore.rules`, SSRF en `worker/`, XSS/PDF), diseño de `PLAN_COCINA.md` y `PLAN_INVENTARIO.md`.

## 3. SUBAGENTES ESTÁNDAR
- **`buscador` (N1 · `flash_lite` / `haiku`)**: Solo lectura. Entrada: qué buscar. Salida: `archivo:línea` + resumen `<=5` líneas. Prohibido editar.
- **`implementador` (N2 · `flash` / `Argon Medium` / `sonnet`)**: Diffs mínimos + test unitario en el mismo cambio. Respeta 0 duplicación en `src/`, comentarios = POR QUÉ, 0 datos reales. Prohibido commit/push.
- **`revisor` (N2 · `flash` / `sonnet`)**: Solo lectura + tests. Ejecuta `npm run lint && npm run tipos && npm run test:rapido` (respetando File Lock: nadie edita mientras corre) y revisa `git diff`.
- **`arquitecto` (N3 · `pro` / `Argon High` / `opus`)**: Toca `src/nube.js`, las 3 guardias (`archivoListo`, apunte sin `id`, escritura única), `worker/` y `firestore.rules`.

## 4. PLAYBOOKS (Recetas de Ejecución)
- **PB-A · Cálculo o Refactor (`src/calculos.js`, `checklist-generadores.js`)**:
  1. `buscador (N1)` → localiza líneas en código y `src/__tests__/calculos.test.mjs`.
  2. `Coordinador` → confirma criterio de negocio con el dueño si cambia cantidades de carga.
  3. `implementador (N2)` → edita función compartida (0 duplicación) + actualiza/añade test.
  4. `revisor (N1/N2)` → `lint` + `tipos` + `test:rapido`.
  5. `Coordinador` → actualiza `CONTEXTO.md` y hace commit.
- **PB-B · Interfaz / CSS (`src/App.jsx`, `src/index.css`, `calendario/`, `asistente/`)**:
  1. `buscador (N1)` → localiza JSX y selector CSS.
  2. `implementador (N2)` → usa tokens `--fs-*`/`--radius-*`, CSS nativo, sin quitar datos/paneles.
  3. `implementador (N2)` → captura real 320px y escritorio, claro y oscuro, `animations: "disabled"`.
  4. `revisor (N1/N2)` → `lint` + `tipos` + `test:rapido`.
- **PB-C · Plan Grande (`PLAN_COCINA.md`, `PLAN_INVENTARIO.md`)**:
  1. `buscador (N1)` → extrae puntos de unión con `nube.js`, `precios.js`, `checklist-generadores.js`.
  2. `arquitecto (N3)` → define esquema Firestore, IDs y divide en PRs pequeños.
  3. `implementador (N2)` → implementa cada entrega con sus tests.
- **PB-D · Datos de Calendario (Drive ↔ App)**:
  1. `buscador (N1)` → cruza por `fecha` + título normalizado (`sinTildes`/`claveDeTexto`).
  2. `Coordinador` → entrega JSON al dueño en el chat. **Jamás en git**.
- **PB-E · Seguridad / `nube.js` / `worker/` / `firestore.rules`**:
  1. `arquitecto (N3)` → parchea (bloqueo `::ffff:a.b.c.d`, todos los saltos de redirect, guardias de Firestore).
  2. `implementador (N2)` → si toca `worker/`, corre `npm run worker:build` (`worker/pegar.js`) + test de regresión.
  3. `Coordinador` → **NO fusiona a `main` sin revisión humana del dueño**.
