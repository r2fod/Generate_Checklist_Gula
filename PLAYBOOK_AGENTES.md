# Playbook de Agentes y Enrutado Automático (`PLAYBOOK_AGENTES.md`)
> Orquestación híbrida **Coordinador + ECC (Everything Claude Code) + Karpathy** para **Antigravity** y **Claude Code**.
> Espejo global en `~/.gemini/GEMINI.md`, plugin nativo `~/.gemini/config/plugins/ecc-coordinador-plugin/` y `~/.claude/` (`CLAUDE.md` + `agents/`).

## 1. COORDINADOR (Sesión Principal)
- **Flujo**: **Think Before Coding** → Clasificar subtarea (N1/N2/N3) → delegar al modelo mínimo viable (`invoke_subagent` en Antigravity / `Task` en Claude) → pasar **Verification Gate de 6 fases (ECC)** → **único que hace commit/merge/push**.
- **Cambio automático**: Tú eliges un modelo fijo en la UI (ej. `Gemini 4 Argon High` o `Opus`); el Coordinador cambia automáticamente el modelo de cada subagente con el parámetro `Model`.
- **A subagentes (en paralelo si son independientes)**: búsquedas, lecturas `>150` líneas, cruces de JSON/calendario, cambios acotados con TDD, auditoría de `git diff`, baterías de tests.
- **Directo en Coordinador (sin subagente)**: ediciones quirúrgicas de 1–5 líneas ya localizadas o decisiones que dependen del paso inmediatamente anterior.
- **Indicador obligatorio en pantalla (en cada mensaje al usuario)**:
  - Cabecera fija al responder: `🤖 [Coordinador · <Modelo actual>] → <Tarea en curso>`
  - Por cada subagente lanzado: `↳ ⚡ [Subagente <Rol> · <Modelo (Flash-Lite / Flash / Argon / Pro / Haiku / Sonnet / Opus)>] → <Qué está haciendo y resultado>`

## 2. LOS 4 PILARES OPERATIVOS (ECC + Karpathy)
1. **Think Before Coding (`planner`)**: No adivinar requisitos ambiguos; si una regla o autoratio baja drásticamente cantidades o cambia flujos de negocio, avisar o dar a elegir antes.
2. **Surgical & Immutable Code (`tdd-guide` + `karpathy`)**: Mínimo código necesario (`KISS`/`YAGNI`/`DRY`, `0` duplicación en `src/`). **Inmutabilidad estricta**: nunca mutar estado/arrays en sitio (`{ ...obj }`, `.map`, `.filter`). Tocar solo las líneas del encargo.
3. **Goal-Driven Verification Gate (`code-reviewer` + `build-error-resolver`)**: Ciclo **Red → Green → Refactor**. Ninguna tarea se cierra sin pasar las 6 fases:
   - `F1 Lint (0 errores)` → `F2 Tipos/Firmas` → `F3 Test unitario (npm run test:rapido)` → `F4 Build (vite build / worker:build)` → `F5 UI (320px/1280px, claro/oscuro, animations: "disabled")` → `F6 git diff limpio (0 datos sensibles)`.
4. **Continuous Learning / Instintos (`continuous-learning`)**: Toda corrección del dueño (tope de inventario, ratio de bebida, criterio de personal) se convierte en un **Instinto** blindado con: comentario del *por qué* en `src/` + test unitario en `src/__tests__/` + nota concisa en `CONTEXTO.md`.

## 3. MATRIZ DE MODELOS Y SUBAGENTES (N1 / N2 / N3)
- **N1 · Barato (`$`) — `buscador` (Solo lectura / Exploración / Guardián de Diff)**
  - **Modelos**: Antigravity `Model: "flash_lite"` (`TypeName: "research"`) | Claude `subagent_type: "buscador"` (`model: "haiku"`).
  - **Uso**: `grep`/búsquedas, localizar `archivo:línea` en ficheros `>200L` (`src/App.jsx`, `CONTEXTO.md`, `HISTORIAL.md`), cruzar calendario Drive↔App, resumir `test.log`, auditar que no haya secretos ni datos reales en `git diff`.
- **N2 · Medio (`$$`) — `implementador` (TDD Quirúrgico) y `revisor` (Verification Gate)**
  - **Modelos**: Antigravity `Model: "flash"` o `"inherit"` (`TypeName: "self"`) | Claude `subagent_type: "implementador"` / `"revisor"` (`model: "sonnet"`).
  - **Skills Antigravity asociadas**: `ecc-tdd-surgical`, `ecc-verification-loop`.
  - **Uso**: desduplicar funciones (`src/checklist-generadores.js`), fórmulas en `src/calculos.js` + `calculos.test.mjs`, UI con tokens `--fs-*`/`--radius-*`, herramientas en `src/asistente/`, capturas Playwright, correr `lint` + `tipos` + `test:rapido` (respetando **File Lock**: nadie edita mientras corre).
- **N3 · Caro (`$$$`) — `arquitecto` (Arquitectura / Sincronización / Seguridad OWASP)**
  - **Modelos**: Antigravity `Model: "pro"` (`TypeName: "self"`) | Claude `subagent_type: "arquitecto"` (`model: "opus"`) + 2ª opinión MCP `google-gemini`.
  - **Skills Antigravity asociadas**: `ecc-security-architect`, `ecc-instinct-learning`.
  - **Uso**: `src/nube.js` (las 3 guardias: `archivoListo`, `id` determinista, escritura única en lote), migración de claves (`${categoría}::${labelOriginal}`), seguridad (`firestore.rules`, SSRF + `::ffff:` + redirects en `worker/`, DOM XSS, Prototype Pollution en JSON importado), diseño de `PLAN_COCINA.md` y `PLAN_INVENTARIO.md`.

## 4. PLAYBOOKS (Recetas de Ejecución)
- **PB-A · Cálculo o Refactor (`src/calculos.js`, `checklist-generadores.js`)**:
  1. `buscador (N1)` → localiza líneas en código y `src/__tests__/calculos.test.mjs`.
  2. `Coordinador` → confirma criterio de negocio con el dueño si cambia cantidades de carga.
  3. `implementador (N2 · ecc-tdd-surgical)` → edita función compartida (0 duplicación, inmutable) + añade/actualiza test unitario.
  4. `revisor (N2 · ecc-verification-loop)` → ejecuta las 6 fases del Verification Gate.
  5. `Coordinador` → registra instinto en `CONTEXTO.md` y hace commit/PR/merge.
- **PB-B · Interfaz / CSS (`src/App.jsx`, `src/index.css`, `calendario/`, `asistente/`)**:
  1. `buscador (N1)` → localiza JSX y selector CSS.
  2. `implementador (N2)` → usa tokens `--fs-*`/`--radius-*`, CSS nativo, sin quitar datos/paneles.
  3. `implementador (N2)` → captura real 320px y escritorio, claro y oscuro (`animations: "disabled"`).
  4. `revisor (N2)` → `lint` + `tipos` + `test:rapido`.
- **PB-C · Plan Grande (`PLAN_COCINA.md`, `PLAN_INVENTARIO.md`)**:
  1. `buscador (N1)` → extrae puntos de unión con `nube.js`, `precios.js`, `checklist-generadores.js`.
  2. `arquitecto (N3 · ecc-security-architect)` → define esquema Firestore, IDs y divide en PRs pequeños.
  3. `implementador (N2)` → implementa cada entrega con TDD.
- **PB-D · Datos de Calendario (Drive ↔ App)**:
  1. `buscador (N1)` → cruza por `fecha` + título normalizado (`sinTildes`/`claveDeTexto`).
  2. `Coordinador` → entrega JSON al dueño en el chat. **Jamás en git**.
- **PB-E · Seguridad / `nube.js` / `worker/` / `firestore.rules`**:
  1. `arquitecto (N3 · ecc-security-architect)` → audita y parchea SSRF (`::ffff:`, redirects), XSS, `__proto__` y guardias de Firestore.
  2. `implementador (N2)` → si toca `worker/`, corre `npm run worker:build` (`worker/pegar.js`) + test de regresión.
  3. `Coordinador` → **NO fusiona a `main` sin revisión humana del dueño**.
