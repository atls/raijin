# Raijin quickstart

Use the published package and its matching checked Yarn runtime as one pair. This guide covers setup and day-to-day commands; each capability's package README owns its detailed behavior.

<!-- sync:preflight -->

## 1. Before you start

- Use Node.js `>=24.15.0 <25` and make Yarn/Corepack available for the initial `yarn dlx` invocation
- Start a new project in an empty directory; for an existing project, use the Yarn project root with a `package.json` declaring `"type": "module"`
- A new project uses Yarn PnP and ESM. Update keeps the existing `nodeLinker` and project configuration; it does not convert CommonJS projects

Public `init/update` selects a published Raijin package and its matching checked `yarn.js` release asset. If the package, matching release metadata or runtime asset is unavailable, the installer stops without activating an unverified runtime.

<!-- sync:new-project -->

## 2. Create a project

```bash
yarn dlx @atls/raijin init --type project
```

Use `--type library` for a library scaffold. The installer selects one published package and its matching release asset, verifies the runtime digest, installs the package, and creates the scaffold once. The project records that checked runtime at `.yarn/releases/yarn.js` through `yarnPath`.

If the directory is not yet a Git repository, run `git init` and then `yarn install` to activate the hooks. Scaffolding does not create the project's lint-staged rules; [configure them before the first commit](#staged-checks).

<!-- sync:existing-project -->

## 3. Connect or update an existing project

```bash
yarn dlx @atls/raijin update
```

Update does not run the scaffold or replace the project's TypeScript, ESLint, Prettier, or lint-staged configuration. It selects npm's published `latest` Raijin package and its matching checked runtime, and stops before writes if the existing manifest is not ESM. In a monorepo, run it at the Yarn project root that declares `@atls/raijin`; a separate nested Yarn project needs its own `yarn.lock`.

Preserve existing project-owned checks. Commit the updated manifest, lockfile, `.yarnrc.yml`, checked runtime and any intentional configuration changes together.

<!-- sync:bundle-upgrade -->

## 4. Upgrade the installed pair

```bash
yarn dlx @atls/raijin update
```

The same command selects the latest published Raijin package and its checked runtime together. It normalizes `packageManager` to the verified release revision's Yarn version. A package-only dependency bump does not update the checked runtime.

<!-- sync:staged-checks -->

<a id="staged-checks"></a>

## 5. Pre-commit checks

This step is required when setting up new or existing projects. A configured Git hook calls `yarn commit staged`. Raijin supplies no default lint-staged configuration: without one, staged-file checks fail.

Husky 9.1.7 owns the relative Git `core.hooksPath` at `.config/husky/_`; Raijin installs only its marked `pre-commit`, `commit-msg`, and `prepare-commit-msg` entries. An existing active hook that would be displaced causes a conflict instead of a silent overwrite. CI, image packaging, and `HUSKY=0` skip hook installation. Do not set `core.hooksPath` by hand for Raijin.

Check existing settings first. The `lint-staged` field in `package.json`, JSON/YAML `.lintstagedrc` files, and `lint-staged.config.*` remain valid native formats. Preserve the project's chosen format, commands, and exclusions; do not create a competing configuration.

If there is no configuration yet, this is an example for a single Raijin PnP/ESM project with TypeScript and Node-run `*.test.ts`/`*.spec.ts` tests. Adjust it to the checks that actually belong to your project:

```json
{
  "*.{yml,yaml,json,graphql,md}": "yarn format",
  "*.{js,mjs,cjs,jsx,ts,tsx}": ["yarn format", "yarn lint"],
  "*.{ts,tsx}": "yarn typecheck",
  "*.{test,spec}.{ts,tsx}": "yarn test unit"
}
```

Each independent Yarn project in the same Git repository defines its own configuration: lint-staged uses the nearest config and does not merge it with the root config. The root must not silently check or skip an independent client.

A TypeScript/Jest client uses its own compiler and `yarn run test` when its `test` script runs Jest; it does not need a Raijin dependency. To check an entire `tsconfig.json` without appending staged paths, use a lint-staged JS configuration callback such as `() => "yarn exec tsc --noEmit -p tsconfig.json"`. Configurations must cover all required checks; a missing client config must not leave its files unchecked.

After configuring checks, stage the configuration and an actual changed file, then run from the repository root:

```bash
yarn commit staged
```

Confirm that checks ran for every affected project, then make a normal commit. An empty staged set or no matching files does not prove that checks are configured. See the [commit capability](../../packages/plugins/commit/README.md) for transaction and conflict behavior.

<!-- sync:verification -->

## 6. Check the project

```bash
yarn check
yarn check --verify
yarn check packages/app
```

`yarn check` runs Format, Lint, TypeCheck, unit tests and integration tests for the active project; formatting may be written. `--verify` runs the same policy without formatting writes and fails on drift. A directory target limits Format, Lint and tests to that directory while TypeScript checks its applicable project configuration. A file target stays focused on that file. See [verification scopes](./verification.md) before using a targeted command as a substitute for a full project check.

<!-- sync:consumer-howto -->

## 7. Check a pull request in CI

```yaml
name: Verify
on: pull_request

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v7
        with:
          node-version-file: package.json
      - run: yarn install --immutable
      - run: yarn check --verify --since "$BASE_SHA"
        env:
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
```

This example belongs to a consumer repository. Git must contain the PR base commit and merge-base history; otherwise change selection fails rather than silently checking the wrong scope. Raijin's own GitHub workflows are generated from Terraform source in the infrastructure repository, so edit that source instead of the generated `.github/workflows` copy. Raijin supplies the check policy; Git owns comparison history, Yarn selects changed and dependent workspaces, and GitHub Actions runs the workflow.

<!-- sync:nextjs -->

## 8. Use Next.js under Yarn PnP

For the verified single-project Next.js 16.3.6 setup, add `"type": "module"` to the root `package.json` before connecting Raijin. This sets the ESM package scope required by the checked Yarn runtime; it does not require changing the stock Next application sources. In a monorepo, keep the root TypeScript project scoped to its own files and let the Next workspace retain its own `tsconfig.json`.

```sh
yarn renderer build
yarn renderer start
yarn renderer dev
```

Raijin forwards the selected workspace and supported Next CLI arguments; build and dev select Next's documented Webpack mode under PnP. Next still owns application config, environment files, output and server behavior. See the [renderer capability](../../packages/plugins/renderer/README.md).
