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
- Project scaffold is created through the embedded Raijin collection
- Bundle commands (`check`, `files changed list`, etc.) become available

Before the first commit, complete the required [check configuration](#staged-checks). Scaffolding does not create a lint-staged configuration.

<!-- sync:existing-project -->

## 3. Existing project

```bash
yarn dlx @atls/raijin init --type project
```

Use `--type library` for the library scaffold

Expected result:

- Existing project gets the public `@atls/raijin` package, Raijin runtime, project scaffold, first sync, and `packageManager` from the installed runtime manifest

Before committing the setup changes, complete the [check configuration](#staged-checks). Preserve any existing lint-staged configuration; do not replace it with the example.

<!-- sync:bundle-upgrade -->

## 4. Upgrade installed bundle

```bash
yarn set version atls
```

Expected result:

- Bundle is upgraded to the latest available version, and `packageManager` is normalized to the installed runtime manifest value

<!-- sync:staged-checks -->

<a id="staged-checks"></a>

## 5. Pre-commit checks

This step is required when setting up new or existing projects. The installed Git hook calls `yarn commit staged`. Raijin supplies no default configuration: without one, lint-staged blocks a commit with staged files.

Check existing settings first. The `lint-staged` field in `package.json`, JSON/YAML `.lintstagedrc` files, and `lint-staged.config.*` remain valid native formats. Preserve the project's chosen format, commands, and exclusions; do not create a competing configuration.

If there is no configuration yet, for a single Raijin PnP/ESM project with TypeScript and Node-run `*.test.ts`/`*.spec.ts` tests, create `.lintstagedrc.json` at its root:

```json
{
  "*.{yml,yaml,json,graphql,md}": "yarn format",
  "*.{js,mjs,cjs,jsx,ts,tsx}": ["yarn format", "yarn lint"],
  "*.{ts,tsx}": "yarn typecheck",
  "*.{test,spec}.{ts,tsx}": "yarn test unit"
}
```

Each independent Yarn project in the same Git repository defines its configuration in its own directory: lint-staged uses the nearest config and does not merge it with the root config. Root backend checks must not run checks for an independent client.

A TypeScript/Jest client uses its own compiler and `yarn run test` when its `test` script runs Jest; it does not need a Raijin dependency. To check an entire `tsconfig.json` without appending staged paths, use a lint-staged JS configuration callback such as `() => "yarn exec tsc --noEmit -p tsconfig.json"`. Configurations must cover all required checks; a missing client config must not leave its files unchecked.

After configuring checks, stage the configuration and intended changes, then run from the repository root:

```bash
yarn commit staged
```

Confirm that checks ran for every affected project, then make a normal commit. An empty staged set or no matching files does not prove that checks are configured. Fix missing commands or required configuration rather than bypassing the hook.

<!-- sync:verification -->

## 6. Basic verification

```bash
yarn check
yarn files changed list
```

Expected result:

- `yarn check` runs a complete validation pass without routing errors
- `yarn files changed list` returns file list (or empty list if no changes)

<!-- sync:project-generation-check -->

## 7. Local project generation check

```bash
yarn raijin:smoke:cli project-generation
```

Expected result:

- Temporary fixture is created through the collection embedded in public `@atls/raijin`
- Check fails if helper or Markdown docs invoke an inactive command

<!-- sync:consumer-howto -->

## 8. How to use in an external project

- Use `yarn init @atls/raijin --type project` or `yarn dlx @atls/raijin init --type project` for the first setup; use `library` for the library scaffold
- After the first setup, keep the bundle current with `yarn set version atls`
- Before the first commit, complete the [check configuration](#staged-checks) and commit it together with `.yarn/releases` and `.yarnrc.yml`
- Use the same commands in CI and locally to avoid behavior drift
