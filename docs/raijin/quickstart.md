# Raijin quickstart

Raijin is installed as a pair: the package and checked Yarn. This guide covers the steps for a project; command details stay with their packages.

<!-- sync:preflight -->

## 1. Before you start

- For the first run, use Yarn/Corepack and a Node.js version within the `engines.node` range declared by `@atls/raijin`
- Create a new project in an empty directory; connect an existing one from the Yarn project root with `"type": "module"` in its `package.json`
- New projects use PnP and ES modules. Update preserves project settings and does not convert CommonJS to ESM

The installer verifies the published package against its matching `yarn.js`. If the pair does not match, it leaves the project's active runtime unchanged.

<!-- sync:new-project -->

## 2. Create a project

```bash
yarn dlx @atls/raijin init --type project
```

Use `--type library` for a library. After verifying the pair, the installer creates the scaffold and records Yarn at `.yarn/releases/yarn.js`.

If Git is not initialized yet, run `git init` and then `yarn install` to activate hooks. [Configure pre-commit checks](#staged-checks) yourself.

<!-- sync:existing-project -->

## 3. Connect or update an existing project

```bash
yarn dlx @atls/raijin update
```

This command connects the latest published Raijin package and Yarn pair or updates an installed pair. It does not recreate the project or replace its TypeScript, ESLint, Prettier or lint-staged settings. In a monorepo, run it from the Yarn project root; an independent nested project needs its own `yarn.lock`.

Commit changes to `package.json`, `yarn.lock`, `.yarnrc.yml` and `.yarn/releases/yarn.js` together with any needed project settings.

<!-- sync:staged-checks -->

<a id="staged-checks"></a>

## 4. Pre-commit checks

The pre-commit hook runs `yarn commit staged`. Raijin cannot decide which files your project needs to check or how. Without a lint-staged configuration, the command fails.

Hooks are installed through Husky. Raijin does not overwrite active hooks owned by another tool; a conflict stops setup. Hooks are not installed in CI or while packing an image. See the [installation details](../../packages/raijin/README.md#git-hooks).

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

<!-- sync:verification -->

## 5. Check the project

```bash
yarn check
yarn check --verify
yarn check packages/app
```

Without a target, `check` covers the whole Yarn project: formatting, lint, types and tests. `--verify` runs the same checks without changing files. A directory narrows formatting, lint and test discovery; TypeScript checks the applicable project from its `tsconfig.json`. A single file runs only formatting, lint and typechecking, not tests. The [check documentation](../../packages/plugins/check/README.md) covers the details.

<!-- sync:consumer-howto -->

## 6. Check a pull request in CI

CI reads the Node version from your project's `package.json`. After `init`, add `engines.node` using the range declared by the installed `@atls/raijin` package; the initializer does not copy this field.

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

This example belongs in your project's repository. `fetch-depth: 0` keeps the history needed to compare against the pull request base. Raijin selects changed workspaces and their dependents; GitHub Actions runs the check. Raijin's own workflows are generated from Terraform in the infrastructure repository, not edited in the generated `.github/workflows` copy.

<!-- sync:nextjs -->

## 7. Use Next.js under Yarn PnP

When Next.js and Raijin share one Yarn project, add `"type": "module"` to the root `package.json` before connecting Raijin. Node.js uses this field to interpret `.js` files; see the [Node.js guide to package types](https://nodejs.org/api/packages.html#type). You do not need to change the Next application sources. In a monorepo, keep a separate `tsconfig.json` for the application.

```sh
yarn renderer build
yarn renderer start
yarn renderer dev
```

Raijin runs Next from the selected application's directory and passes through command arguments. Build and dev use Next's documented [Webpack mode](https://nextjs.org/docs/app/api-reference/cli/next) under PnP. Next remains responsible for application configuration, environment variables, build output and server behavior. See the [renderer commands](../../packages/plugins/renderer/README.md).
