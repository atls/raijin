# Agent Adapter

Thin adapter for coding agents. Source of truth is `docs/tooling`

## Required read order

1. `docs/tooling/quickstart.md`
2. `docs/tooling/index.v1.json`
3. `docs/tooling/commands.md`
4. `docs/tooling/packages.md`

## Routing constraints

- Prefer commands with `status = active`
- Treat `status = inactive` as unavailable
- Validate command and plugin existence against `docs/tooling/index.v1.json`
