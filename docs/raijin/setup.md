# Set up Raijin

[Русский](./setup.ru.md) · [English](./setup.md)

This guide covers project setup, pre-commit checks, and a CI example.

## 1. Before you start

- For the first run, use Yarn and a Node.js version within the `engines.node` range of the [published Raijin package](https://www.npmjs.com/package/@atls/raijin)
- Create a new project in an empty directory. Connect an existing one from the Yarn project root with `"type": "module"` in its `package.json`; the [Node.js guide](https://nodejs.org/api/packages.html#type) explains this field
- New projects use PnP and ES modules. Update does not convert an existing project to another module format

The installer verifies the published package against its matching `yarn.js`. If the pair does not match, it leaves the project's active runtime unchanged.

## 2. Create a project

```bash
yarn dlx @atls/raijin init --type project
```

Use `--type library` for a library. After verifying the pair, the installer creates the scaffold and records Yarn at `.yarn/releases/yarn.js`.

If Git is not initialized yet, run `git init` and then `yarn install` to activate hooks. [Configure pre-commit checks](#staged-checks) yourself.

## 3. Connect or update an existing project

```bash
yarn dlx @atls/raijin update
```

This command connects the latest published Raijin package and Yarn pair or updates an installed pair. It does not recreate the project or replace its TypeScript, ESLint, Prettier or lint-staged settings. In a monorepo, run it from the Yarn project root; an independent nested project needs its own `yarn.lock`.

Commit changes to `package.json`, `yarn.lock`, `.yarnrc.yml` and `.yarn/releases/yarn.js` together with any needed project settings.

<a id="staged-checks"></a>

## 4. Pre-commit checks

The pre-commit hook runs `yarn commit staged`. The project decides which files to check and how: without its lint-staged configuration, the command fails.

Raijin installs hooks through Husky without overwriting active hooks owned by another tool. A conflict stops setup; hooks are not installed in CI or while packing an image. See the [installation details](../../packages/raijin/README.md#git-hooks).

Keep an existing lint-staged configuration. For a new one, use the `lint-staged` field in `package.json`, `.lintstagedrc`, or `lint-staged.config.*`, following the project's existing convention.

Here is an example for a TypeScript project with tests run by Node. Adjust the commands and file patterns to match your project:

```json
{
  "*.{yml,yaml,json,graphql,md}": "yarn format",
  "*.{js,mjs,cjs,jsx,ts,tsx}": ["yarn format", "yarn lint"],
  "*.{ts,tsx}": "yarn typecheck",
  "*.{test,spec}.{ts,tsx}": "yarn test unit"
}
```

An independent Yarn project inside the same Git repository needs its own configuration: lint-staged uses the nearest one and does not merge it with the root. That project runs its own commands; it does not need Raijin just to run hooks.

Stage the configuration and a changed file, then run from the repository root:

```bash
yarn commit staged
```

Confirm that checks actually ran for every affected project. An empty index proves nothing about the setup. The [commit documentation](../../packages/plugins/commit/README.md) explains transaction and conflict behavior.

## 5. Check the project

```bash
yarn check
yarn check --verify
yarn check packages/app
```

Without a target, `check` covers the whole Yarn project: formatting, lint, types and tests. `--verify` runs the same checks without changing files. A directory narrows formatting, lint and test discovery; TypeScript checks the applicable project from its `tsconfig.json`. A single file runs only formatting, lint and typechecking, not tests. The [check documentation](../../packages/plugins/check/README.md) covers the details.

## 6. Check a pull request in CI

Your project owns its CI Node version. If you use the example below, add `engines.node` to its `package.json` after `init`, using the range declared by the installed `@atls/raijin` package; the initializer does not copy this field.

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

Add this workflow to your project's repository. `fetch-depth: 0` keeps the history needed to compare against the pull request base. The check does not modify files and covers changed workspaces together with their dependents.

## 7. Use Next.js under Yarn PnP

When Next.js and Raijin share one Yarn project, the root `package.json` needs `"type": "module"`. This is Node.js's rule for ES modules; see its [package guide](https://nodejs.org/api/packages.html#type). You do not need to change the Next.js application sources. In a monorepo, keep the application's own `tsconfig.json`.

```sh
yarn renderer build
yarn renderer start
yarn renderer dev
```

These commands delegate build and server execution to Next.js; under PnP, build and dev use its [Webpack mode](https://nextjs.org/docs/app/api-reference/cli/next). Next.js still owns application configuration. The [renderer guide](../../packages/plugins/renderer/README.md) lists command arguments.
