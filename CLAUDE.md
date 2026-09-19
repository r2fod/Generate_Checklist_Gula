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

## ORCHESTRATOR MODE
<!-- Manejo de tareas complejas y subagentes -->
- Treat phases as isolated modules. Clear internal context after phase verification. Auto-proceed unless blocked by errors.
- Delegation (both subscriptions active — the point is fit, NOT saving quota; when it fits, use
  full power, no cutting corners):
  - USE Gemini MCP when its strength genuinely fits: very long docs/logs, several files at once
    with no need to edit them (`gemini_team` with `file_paths` reads server-side), broad search
    (`gemini_search`), image/audio/video (`gemini_analyze_media`), image generation
    (`gemini_generate_image`). Pass the FULL task with all the context it needs to nail it first try.
  - NEVER Gemini for: this repo's code (CLAUDE edits it with its own tools, verified on the spot),
    small tasks where reading it myself is simplest, or anything needing exact-line code context.
  - Read-only Gemini calls → no permission needed. Real effect (write/publish/execute) → normal
    permission rules.
  - NEVER ship Gemini output raw: contrast it against the real data when verifiable, correct what
    doesn't hold up. CLAUDE does all code, tests, synthesis, and talking to the owner, with full
    reasoning — and says in one line when Gemini was used.
  - `openai-codex` MCP is NOT a code tool (only `get_costs`/`get_projects`, billing/admin) and is
    now disconnected — never route code through it. Decided with the owner 2026-09-08/19.

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
