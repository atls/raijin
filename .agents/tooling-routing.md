# Tooling Routing Rules

1. Load `docs/tooling/index.v1.json`
2. Match user intent to command path tokens
3. Prefer `active` commands when multiple commands match
4. If only `inactive` commands match, report unavailability
5. For local `raijin` execution bootstrap with `source .env` and `export NODE_OPTIONS`
