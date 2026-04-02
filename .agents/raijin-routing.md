# Raijin Routing Rules

1. Load `docs/raijin/index.v1.json` and `docs/raijin/semantics.v1.json`
2. Match prompt to command path tokens and semantics tags
3. Prefer `active` command entries when several routes match
4. If the strongest match is `inactive`, return unavailable route
5. For local execution in `raijin`, run `source .env` and `export NODE_OPTIONS` first
