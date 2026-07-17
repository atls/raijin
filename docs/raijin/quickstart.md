# Raijin Quickstart

Minimal flow for creating or connecting a project to Raijin

<!-- sync:preflight -->

## 1. Prerequisites

- Node.js: `>= 24`
- Yarn: `>= 4`
- Raijin supports only Yarn PnP and ESM; `node-modules` and CommonJS are outside the quickstart contract
- For a new project: an empty directory
- For an existing project: `package.json` in the project root

Expected result:

- `yarn --version` works

<!-- sync:new-project -->

## 2. New project

```bash
yarn init @atls/raijin --type project
```

Use `--type library` for the library scaffold

Expected result:

- `package.json` is created when it does not exist yet, and `packageManager` is normalized to the installed runtime manifest value
- Raijin runtime is downloaded from the GitHub Release asset, verified by `sha256`, and stored as `.yarn/releases/yarn.mjs`
- `.yarnrc.yml` gets `nodeLinker: pnp` and the final `yarnPath` directly without a temporary file
- Project scaffold is created through the existing Raijin schematics
- Bundle commands (`check`, `files changed list`, etc.) become available

<!-- sync:existing-project -->

## 3. Existing project

```bash
yarn dlx @atls/raijin init --type project
```

Use `--type library` for the library scaffold

Expected result:

- Existing project gets the public `@atls/raijin` package, Raijin runtime, project schematics, the first sync, and `packageManager` from the installed runtime manifest

<!-- sync:bundle-upgrade -->

## 4. Upgrade installed bundle

```bash
yarn set version atls
```

Expected result:

- Bundle is upgraded to the latest available version, and `packageManager` is normalized to the installed runtime manifest value

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

- Temporary fixture is created through the `@atls/raijin` project-generation owner API
- Check fails if helper or Markdown docs invoke an inactive command

<!-- sync:consumer-howto -->

## 7. How to use in an external project

- Use `yarn init @atls/raijin --type project` or `yarn dlx @atls/raijin init --type project` for the first setup; use `library` for the library scaffold
- After the first setup, keep the bundle current with `yarn set version atls`
- Commit `.yarn/releases` and `.yarnrc.yml` changes together with bundle updates
- Use the same commands in CI and locally to avoid behavior drift
