# Gula Catering — CLAUDE.md

## CORE RULES
<!-- Reglas principales de operación, idioma y respuestas -->
- Pre-req: MUST read `CONTEXTO.md` before operating. Live production app (real truck dispatch).
- Language: ALL code, comments, UI string literals, and git commits MUST be in SPANISH.
- Output Style: DIRECT CODE ONLY. Zero preambles, zero summaries.
- Privacy & Safety: PUBLIC REPO. NEVER leak real names, phones, €/pax, or buy prices. Use fake test data.
- Context Sync: MUST update `CONTEXTO.md` within the exact SAME commit as code changes.
- Standing Instructions: any new rule, workflow, or working style stated in conversation
  MUST be added to THIS file when given — never left living only in chat history.

## DATA INTEGRITY (CRITICAL)
<!-- Estructura de IDs clave: tocarlos destruye los checks de la app -->
- Item ID Schema: `${categoría}::${labelOriginal}` (Renaming/moving destroys user checks).
- Calendar ID Schema: `${fecha}_${slug}`.
- State Parser: Use `estadoInicial.X ?? default` (Partial state payload is valid).

## CODE & UI/UX
<!-- Criterios de desarrollo y verificación visual -->
- Principles: DRY, scalable design. Minimal diffs — no block rewriting for minor edits.
- UI: Fully responsive (320px–1920px). MUST include smooth CSS animations/transitions
  (no flat layout jumps). No Framer Motion or any animation library — plain CSS only,
  it's what the entire project already uses.
- Verification: Passing `build` or unit tests DOES NOT confirm UI state. MUST verify visual screenshots (`CONTEXTO.md`).
- Unit Tests: EVERY new feature, module or function MUST ship with its unit tests
  in the SAME commit (node battery: calculos/asistente/sincronización) — not only
  bug fixes. One test per behavior, with the porqué in its text. Untested code
  does not merge.
- Test Fixtures: when a test's input comes from an external API/spec (browser API,
  SDK response), the fixture MUST match what that API returns in the NORMAL case —
  not whatever value is convenient to write. Check the spec or a real run first.
  A green suite built on a fake shape (e.g. `expirationTime: 123` instead of the
  real-world `null`) hides a bug that breaks the feature for every real user.
- External-URL Fetches: any route that fetches a URL chosen by the caller (SSRF
  surface — e.g. a "analyze this website" tool) MUST validate the DESTINATION on
  EVERY redirect hop, not just the starting URL (`redirect: "follow"` alone is not
  a fix), and its private-network blocklist MUST also catch IPv4 addresses mapped
  into IPv6 (`::ffff:a.b.c.d`), not just bare IPv4/IPv6 prefixes.
- Arena/other-AI Branches: an all-green CI on a branch from another AI session
  (arena) is NOT a substitute for a security- and correctness-focused human-style
  review before merging to main — it verifies the tests that were written, not the
  ones that should have been. Any new route touching user-supplied URLs, external
  API response shapes, secrets, or auth MUST get that review first (see CONTEXTO.md
  "Doce trampas" for concrete examples this already caught).

## ORCHESTRATOR MODE
<!-- Manejo de tareas complejas y subagentes -->
- Treat phases as isolated modules. Clear internal context after phase verification. Auto-proceed unless blocked by errors.

## WORKFLOW & CLI
<!-- Comandos de terminal, gestión de procesos y Git -->
- File Lock: NEVER edit source files while `test` or `deploy` run (prevents deploying corrupt `dist/`).
- Async Run: Run test suite via `setsid nohup … &` logging to file.
  - DO NOT use `| tail`. DO NOT use short timeouts.
  - Process check command: `pgrep -f "npm [r]un test"`
- Git Operations: Commit + push IMMEDIATELY upon green test. Delete merged feature branches.

## STRICT PROHIBITIONS
<!-- Prohibiciones absolutas para evitar desastres en producción o filtraciones -->
- NEVER commit real client/staff personal data or financial metrics.
- NEVER rename/move item/category keys without explicitly handling migrations.
- NEVER approve visual UI changes based solely on automated test passes.
