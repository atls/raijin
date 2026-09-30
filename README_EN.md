![raijin-github-cover](https://github.com/user-attachments/assets/ac98b900-ee3c-4ea8-a081-e83a1f5f3282)

# Atlantis Raijin

[![Raijin Docs RU](https://img.shields.io/badge/Raijin%20Docs-RU-0b5fff)](README.md)
[![Raijin Docs EN](https://img.shields.io/badge/Raijin%20Docs-EN-1f8a70)](README_EN.md)

<!-- sync:root-what -->

## What this is

Raijin brings development, verification and build commands together for Node.js and TypeScript projects on Yarn. They run locally, before commits and in CI with the scope that fits the job. Prettier, ESLint, TypeScript and the project still own their rules; Raijin does not replace their configuration.

<!-- sync:root-audience -->

## When it helps

When one check lives in a project script, another in a hook and a third in CI, they soon drift apart. Raijin helps keep that set consistent across projects or a monorepo. A project with only a few scripts may not need it.

<!-- sync:root-capabilities -->

## What you can do

- Check the project with `yarn check`; `--verify` does not change files
- Check staged files with `yarn commit staged` and the project's lint-staged configuration
- Build libraries, run services and Next.js, and pack images using the [command map](./docs/raijin/README.md)
- Create a project with `init` or connect an existing one with `update`

<!-- sync:root-quickstart -->

## Quickstart

Use a Node.js version within the range declared by the [Raijin package](./packages/raijin/package.json), and make Yarn/Corepack available. The installer selects a published package and its matching Yarn runtime, then verifies the pair before connecting it.

### New project

```bash
yarn dlx @atls/raijin init --type project
```

Run this in an empty directory; use `--type library` for a library.

### Existing project

```bash
yarn dlx @atls/raijin update
```

Run this from a Yarn project root whose `package.json` declares `"type": "module"`. The installer leaves an existing project with another module format unchanged. An independent nested Yarn project needs its own `yarn.lock`.

### Before the first commit

After setup, [configure pre-commit checks](./docs/raijin/quickstart.md#staged-checks). Raijin installs hooks through Husky; the project decides which checks they run.

### Check your changes

```bash
yarn check
```

Local `check` covers the whole Yarn project: formatting, lint, typechecking and tests. Before a commit, `yarn commit staged` uses the project's rules for staged files. In a pull request, `yarn check --verify --since <ref>` checks changed workspaces and their dependents without writing files. These are different scopes; a passing hook does not replace a full project check. The [check command](./packages/plugins/check/README.md) documents its exact behavior.

<!-- sync:root-consumer-howto -->

## How to connect a project

[Quickstart](./docs/raijin/quickstart.md) covers project setup, hooks and CI. For Next.js under Yarn PnP, check the [ES module setup](./docs/raijin/quickstart.md#7-use-nextjs-under-yarn-pnp).

<!-- sync:root-read-more -->

## Where to read next

- [Quickstart and CI](./docs/raijin/quickstart.md)
- [Command and package docs](./docs/raijin/README.md)
- [Русский README](./README.md)
