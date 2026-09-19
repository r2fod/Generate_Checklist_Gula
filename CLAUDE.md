# Gula Catering — CLAUDE.md
> Live production app. Read `CONTEXTO.md` first.

## CORE
- Lang: Spanish ONLY (code, comments, UI, commits).
- Output: Direct code. No intro/outro text.
- Privacy: Public repo. Fake test data only (no names/phones/€/buy prices).
- Sync: Update `CONTEXTO.md` same commit. Chat rules -> append here.

## DATA SCHEMA
- Item ID: `${categoría}::${labelOriginal}` (Renames require migration).
- Calendar ID: `${fecha}_${slug}`
- State: `estadoInicial.X ?? default`

## CODE & UX
- Minimal diffs. Responsive 320–1920px.
- UI: Native CSS animations only (NO libraries/Framer).
- Visual UI: Verify screenshots (`CONTEXTO.md`), not green tests.
- Tests: Required per feature/fix same commit. Real API fixture shapes only.
- SSRF Security: Check ALL redirect hops. Block `::ffff:a.b.c.d`.
- AI Branches: Human security review required before main merge.

## WORKFLOW
- File Lock: Do NOT edit source during test/deploy.
- Async Test: `nohup npm run test > test.log 2>&1 &` | Check: `pgrep -f "npm [r]un test"`
  (NO `setsid`: it does not exist on macOS — the battery dies with `command not found` and
  looks like it ran)
- Git: Auto commit+push on green test. Delete merged feature branches.

## ORCHESTRATION
- Phases as isolated modules. Auto-proceed unless blocked by errors.
- Gemini MCP for: very long docs/logs, many files at once (`gemini_team` + `file_paths`, read
  server-side), broad search (`gemini_search`), media (`gemini_analyze_media`). Pass the FULL
  task with enough context to nail it first try. Read-only calls need no permission.
- NEVER Gemini for: this repo's code, small lookups, anything needing exact-line context.
- NEVER ship Gemini output raw: verify against the real data first. Claude does all code, tests,
  synthesis and talking to the owner. Say in one line when Gemini was used.
- `openai-codex` MCP is billing-only (`get_costs`/`get_projects`), NOT a code tool. Disconnected.

## PROHIBITED
- Real user/financial data in commits.
- Key renames without migrations.
- Approving UI solely via auto tests.
