# Raijin Quickstart

Minimum bootstrap for stable work with custom `atls` Yarn bundle

<!-- sync:preflight -->
## 1. Preflight

- Node.js: `22.x`
- Inside `raijin`, run `source .env` and `export NODE_OPTIONS` before `yarn` commands

<!-- sync:bundle-install -->
## 2. Install bundle in a consumer project

- `yarn set version https://raw.githubusercontent.com/atls/raijin/master/yarn/cli/dist/yarn.mjs`

<!-- sync:bundle-upgrade -->
## 3. Upgrade installed bundle

- `yarn set version atls`

<!-- sync:verification -->
## 4. Basic verification

- `yarn check`
- `yarn files changed list`
- `yarn test unit`

