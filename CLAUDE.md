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
- Async Test: `setsid nohup npm run test > test.log 2>&1 &` | Check: `pgrep -f "npm [r]un test"`
- Git: Auto commit+push on green test. Delete merged feature branches.

## PROHIBITED
- Real user/financial data in commits.
- Key renames without migrations.
- Approving UI solely via auto tests.