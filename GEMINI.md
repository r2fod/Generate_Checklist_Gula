# Gula Catering — GEMINI.md
> App en producción. Mismas reglas que `CLAUDE.md` (importado abajo) + orquestación en `PLAYBOOK_AGENTES.md`.

@./CLAUDE.md

## Lectura rápida al iniciar sesión (ahorro de tokens)
1. `PENDIENTES.md`: lista corta de qué falta y de quién depende (preguntar orden al dueño).
2. `CONTEXTO.md`: leer solo `L1-L155` (mapa/reglas) y "Estado de HOY" (`L465-L580`). `HISTORIAL.md` (>130 KB) NO se lee entero: buscar con subagente `research` (`Model: "flash_lite"`).
3. `PLAYBOOK_AGENTES.md`: enrutado automático de subagentes (`flash_lite` / `Argon Low` → búsquedas; `flash` / `Argon Medium` → código/tests; `pro` / `Argon High` → `nube.js`/seguridad).
4. `PLAN_MEJORAS.md`, `PLAN_COCINA.md`, `PLAN_INVENTARIO.md`: leer solo bajo pedido.
5. Commits: mensaje siempre en español, sin firmas de otra IA.
