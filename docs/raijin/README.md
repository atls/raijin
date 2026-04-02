# Raijin Docs

Router for working with custom `atls` Yarn bundle in a clean thread

<!-- sync:router-read-order -->

## Read order

1. `docs/raijin/quickstart.md`
2. `docs/raijin/commands.md`
3. `docs/raijin/packages.md`
4. `docs/raijin/index.v1.json`
5. `docs/raijin/semantics.v1.json`

<!-- sync:router-quick-rules -->

## Routing rules

- Models route only commands with `status = active`
- `inactive` commands are treated as unavailable and not recommended
- Facts source: `index.v1.json`; semantics source: `semantics.v1.json`

<!-- sync:router-generation -->

## Generation and checks

- `yarn raijin:generate`
- `yarn raijin:generate:semantics` (on-demand, requires `OPENAI_API_KEY`)
- `yarn raijin:check`

<!-- sync:router-coverage -->

## Coverage snapshot

- Commands: 36 (active: 35, inactive: 1)
- Workspace packages: 72
- Last generated: 2026-04-02T02:33:11.721Z
