# Raijin Quickstart

Minimal install-and-verify flow for the custom `atls` Yarn bundle

<!-- sync:preflight -->

## 1. Prerequisites

- Node.js: `22.x`
- Yarn: `4.x`
- A working project with `package.json`
- Internet access to download bundle artifacts

Expected result:

- `yarn --version` works and the project can switch Yarn versions

<!-- sync:new-project -->

## 2. New project: install the bundle

```bash
yarn set version https://raw.githubusercontent.com/atls/raijin/master/yarn/cli/dist/yarn.mjs
yarn set version atls
```

Expected result:

- `.yarn/releases/` contains the current Raijin `yarn.mjs`
- Bundle commands (`check`, `files changed list`, `test unit`, etc.) become available

<!-- sync:bundle-upgrade -->

## 3. Upgrade installed bundle

```bash
yarn set version atls
```

Expected result:

- Bundle is upgraded to the latest available version

<!-- sync:verification -->

## 4. Basic verification

```bash
yarn check
yarn files changed list
yarn test unit
```

Expected result:

- `yarn check` runs a complete validation pass without routing errors
- `yarn files changed list` returns file list (or empty list if no changes)
- `yarn test unit` runs unit tests for the current project

<!-- sync:consumer-howto -->

## 5. How to use in an external project

- Install once, then keep it current with `yarn set version atls`
- Commit `.yarn/releases` and `.yarnrc.yml` changes together with bundle updates
- Use the same commands in CI and locally to avoid behavior drift

<!-- sync:inside-raijin -->

## 6. Extra: working inside `raijin`

```bash
source .env
export NODE_OPTIONS
```

Expected result:

- Internal repository commands run in a consistent environment
