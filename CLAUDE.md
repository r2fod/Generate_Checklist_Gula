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
- AI Branches: security-sensitive ones (auth, rules, SSRF, XSS) need human review before main merge; the rest follow the Merge rule below.

## WORKFLOW
- File Lock: don't edit source while the test battery or a deploy is running: both build from the working tree, so an edit changes what is being tested.
- Async Test: `setsid nohup npm run test > test.log 2>&1 &` | Check: `pgrep -f "npm [r]un test"`
- Git: Auto commit+push on green test. Delete merged feature branches.

## PROHIBITED
- Real user/financial data in commits.
- Key renames without migrations.
- Approving UI solely via auto tests.

## OWNER RULES (chat)
- Replies: Spanish, brief. Owner dictates by voice (expect typos).
- Merge: owner authorized merging feature PRs once lint + tipos + test:rapido + full `npm run test` are green ("que no rompa nada"). Security-sensitive PRs (auth, rules, SSRF, XSS: #232, #237) and PRs #222/#231/#233 wait for the owner.
- Out of scope: staff logistics (per person, schedules) and financial summary (budget/margin) live in the owner's other app, to be merged later. Don't plan or build them here. Kitchen (`PLAN_COCINA.md`) and inventory (`PLAN_INVENTARIO.md`) DO stay in this app.
- "In production" = "Publicar" job green (battery + gh-pages), not just merged.
- Calendar data from the Drive sheet: JSON to the owner, NEVER committed. Compare with the current calendar first (exact normalized title per date); "Traer" only adds. Method: `CONTEXTO.md` → "Estado de HOY". When the sheet confirms a "Posible X", the "Posible X" goes ("deberías quitar los posibles"): the owner authorized removing those directly from the calendar, with a backup first and only if nobody changed it meanwhile; any other deletion is still the owner's.
- Redesigns change the form, never what is shown: don't drop data, lines or panels (or move them out of sight) without asking ("has quitado lo de roturas y lo que había antes").
- Gemini via MCP (`google-gemini`) is connected in Claude Desktop: lean on it — second opinion on analysis/design, screenshot and image review, research. Each in its strength: Claude decides, writes the code and verifies; Gemini's answer is input to check, not truth.
- Same rules for any AI (`GEMINI.md` imports this file).
