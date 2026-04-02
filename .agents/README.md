# Raijin Agent Adapter

Thin adapter for routing in this repository. Facts live in `docs/raijin/index.v1.json`.

## Required read order

1. `docs/raijin/README.ru.md` (default)
2. `docs/raijin/quickstart.ru.md`
3. `docs/raijin/commands.ru.md`
4. `docs/raijin/packages.ru.md`
5. `docs/raijin/index.v1.json`
6. `docs/raijin/semantics.v1.json`

## Constraints

- Route only commands with `status = active`
- Treat `inactive` commands as unavailable
- Do not use unrelated frontend/mobile/backend instruction packs
