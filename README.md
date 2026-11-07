![Raijin](.github/assets/raijin-banner.png)

# Raijin

[![Raijin Docs RU](https://img.shields.io/badge/Raijin%20Docs-RU-0b5fff)](README.ru.md)
[![Raijin Docs EN](https://img.shields.io/badge/Raijin%20Docs-EN-1f8a70)](README.md)
[![npm version](https://img.shields.io/npm/v/%40atls%2Fraijin.svg)](https://www.npmjs.com/package/@atls/raijin)
[![BSD-3-Clause license](https://img.shields.io/github/license/atls/raijin)](LICENSE)

Raijin turns shared engineering conventions into a workflow your team can actually run. Formatting, linting, type checking, tests and builds follow the same contracts across projects, with Yarn as the common entry point.

Use it across a team or on your own. The shared tooling gives engineers and AI agents the same commands and checks to work against, so every new project starts with a familiar way of working. Extend the rules and tooling to fit your team as those contracts evolve.

## Start

If you're starting from scratch:

```sh
yarn dlx @atls/raijin init --type project
```

If you're integrating Raijin into an existing project:

```sh
yarn dlx @atls/raijin update
```

For prerequisites, Git hooks, and a CI example, see [Set up Raijin](./docs/raijin/setup.md).

## Commands

| Task                 | Commands                                                                                                           | Details                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Project checks       | `yarn check`, `yarn format`, `yarn lint`, `yarn typecheck`, `yarn test`, `yarn test unit`, `yarn test integration` | [check](./packages/plugins/check/README.md), [test](./packages/plugins/test/README.md), and related capabilities |
| Commit checks        | `yarn commit staged`, `yarn commit message`, `yarn commit message lint`                                            | [commit](./packages/plugins/commit/README.md)                                                                    |
| Scaffold             | `yarn generate project`                                                                                            | [generate](./packages/plugins/generate/README.md)                                                                |
| Library              | `yarn library build`                                                                                               | [library](./packages/plugins/library/README.md)                                                                  |
| Service              | `yarn service build`, `yarn service build --standalone`, `yarn service dev`, `yarn service start`                  | [service](./packages/plugins/service/README.md)                                                                  |
| Next.js              | `yarn renderer build`, `yarn renderer dev`, `yarn renderer start`                                                  | [renderer](./packages/plugins/renderer/README.md)                                                                |
| Package versions     | `yarn release version infer`, `yarn release version infer --dry-run`                                               | [release](./packages/plugins/release/README.md)                                                                  |
| Verified pair update | `yarn set version atls`                                                                                            | [essentials](./packages/plugins/essentials/README.md) and the [public installer](./packages/raijin/README.md)    |
