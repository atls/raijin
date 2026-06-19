# Raijin Quickstart

Minimal flow for creating or connecting a project to Raijin

<!-- sync:preflight -->

## 1. Prerequisites

- Node.js: `>= 24`
- Yarn: `>= 4`
- For a new project: an empty directory
- For an existing project: `package.json` in the project root

Expected result:

- `yarn --version` works

<!-- sync:new-project -->

## 2. New project

```bash
yarn init @atls/raijin
```

Expected result:

- `package.json` is created when it does not exist yet
- Raijin runtime is downloaded from the GitHub Release asset, verified by `sha256`, and stored as `.yarn/releases/raijin-yarn-<version>.mjs`
- `.yarnrc.yml` gets the final `yarnPath` directly without a temporary file
- Project scaffold is created through the existing Raijin schematics
- Bundle commands (`check`, `files changed list`, etc.) become available

<!-- sync:existing-project -->

## 3. Existing project

```bash
yarn dlx @atls/raijin init
```

Expected result:

- Existing project gets Raijin runtime, `@atls/code-runtime`, project schematics, and the first sync

<!-- sync:bundle-upgrade -->

## 4. Upgrade installed bundle

```bash
yarn set version atls
```

Expected result:

- Bundle is upgraded to the latest available version

<!-- sync:verification -->

## 5. Basic verification

```bash
yarn check
yarn files changed list
```

Expected result:

- `yarn check` runs a complete validation pass without routing errors
- `yarn files changed list` returns file list (or empty list if no changes)

<!-- sync:schematic-smoke -->

## 6. Local schematics smoke check

```bash
yarn schematic:test
```

Expected result:

- Temporary fixture is created through public `@atls/code-schematics` exports
- Check fails if helper or Markdown docs invoke an inactive command

<!-- sync:consumer-howto -->

## 7. How to use in an external project

- Use `yarn init @atls/raijin` or `yarn dlx @atls/raijin init` for the first setup
- After the first setup, keep the bundle current with `yarn set version atls`
- Commit `.yarn/releases` and `.yarnrc.yml` changes together with bundle updates
- Use the same commands in CI and locally to avoid behavior drift
