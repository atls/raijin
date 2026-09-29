![raijin-github-cover](https://github.com/user-attachments/assets/ac98b900-ee3c-4ea8-a081-e83a1f5f3282)

# Atlantis Raijin

[![Raijin Docs RU](https://img.shields.io/badge/Raijin%20Docs-RU-0b5fff)](README.md)
[![Raijin Docs EN](https://img.shields.io/badge/Raijin%20Docs-EN-1f8a70)](README_EN.md)

<!-- sync:root-what -->

## What this is

Raijin is a Yarn command layer for Node.js/TypeScript projects and monorepos. The `@atls/raijin` package and its checked Yarn runtime give development, Git hooks, and CI the same commands. Raijin connects existing tools; it does not replace Yarn, TypeScript, ESLint, Next.js, or their project configuration.

<!-- sync:root-audience -->

## Who it is for

- Teams with multiple Node.js/TypeScript projects or Yarn monorepos that repeat the same checks across `package.json` files
- Projects that need the same checks locally, before a commit, and on a pull request

If a single project is well served by a few ordinary scripts, it may not need Raijin.

<!-- sync:root-capabilities -->

## What Raijin can do

- `yarn check` covers the whole project and may repair formatting; `yarn check --verify --since <ref>` checks changed workspaces and their dependents without writing files
- `yarn commit staged` checks staged files using the project's own lint-staged configuration
- `library build`, `service build/dev/start`, `renderer build/dev/start`, and `image pack` cover their respective workloads; each command owner documents the details
- `generate project` creates a scaffold, while public `init/update` installs a checked package/runtime pair after that pair is published

<!-- sync:root-quickstart -->

## Quickstart

Use Node.js `>=24.15.0 <25` and an available Yarn/Corepack launcher. The installer selects a published Raijin package and its matching checked `yarn.js`; if the release asset is missing, it does not activate a new runtime.

### New project

```bash
yarn dlx @atls/raijin init --type project
```

Run this in an empty directory; use `--type library` for a library. The installer verifies the package and `.yarn/releases/yarn.js` pair before creating the scaffold.

### Existing project

```bash
yarn dlx @atls/raijin update
```

Run this from a Yarn project root whose `package.json` declares `"type": "module"`. The installer rejects another module scope before changing files. A member workspace is not a separate Yarn project; an independent nested project needs its own `yarn.lock`.

### Before the first commit

After setup, [configure staged checks](./docs/raijin/quickstart.md#staged-checks): Raijin installs hooks through Husky but does not invent a lint-staged configuration for your project.

### Verify an installed project locally

```bash
yarn check
```

`check` runs formatting, lint, typecheck, unit tests, and integration tests. Use `yarn check --verify` when files must not change. The [three verification scopes](./docs/raijin/verification.md)—whole project, staged files, and changed workspaces in a PR—are not interchangeable.

<!-- sync:root-consumer-howto -->

## How to use in another project

Start with [Quickstart](./docs/raijin/quickstart.md) for setup, project-owned staged checks, and a CI example. For Next.js under Yarn PnP, check the ESM package scope and the [renderer commands](./packages/plugins/renderer/README.md).

<!-- sync:root-read-more -->

## Where to read next

- [Quickstart and CI](./docs/raijin/quickstart.md)
- [Choosing a verification scope](./docs/raijin/verification.md)
- [Command and package docs](./docs/raijin/README.md)
- [Русский README](./README.md)
