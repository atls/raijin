![raijin-github-cover](https://github.com/user-attachments/assets/ac98b900-ee3c-4ea8-a081-e83a1f5f3282)

# Raijin

[![Raijin Docs RU](https://img.shields.io/badge/Raijin%20Docs-RU-0b5fff)](README.md)
[![Raijin Docs EN](https://img.shields.io/badge/Raijin%20Docs-EN-1f8a70)](README_EN.md)
[![npm version](https://img.shields.io/npm/v/%40atls%2Fraijin.svg)](https://www.npmjs.com/package/@atls/raijin)
[![BSD-3-Clause license](https://img.shields.io/github/license/atls/raijin)](LICENSE)

Raijin is a tool for organizing engineering work and building engineering culture. Its rules and conventions are built into the product and apply directly in projects. They help a team rely on the same principles and quality standards across its work.

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

| Task                 | Commands                                                                        | Details                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Project checks       | `check`, `format`, `lint`, `typecheck`, `test`, `test unit`, `test integration` | [check](./packages/plugins/check/README.md), [test](./packages/plugins/test/README.md), and related capabilities |
| Commit checks        | `commit staged`, `commit message`, `commit message lint`                        | [commit](./packages/plugins/commit/README.md)                                                                    |
| Scaffold             | `generate project`                                                              | [generate](./packages/plugins/generate/README.md)                                                                |
| Library              | `library build`                                                                 | [library](./packages/plugins/library/README.md)                                                                  |
| Service              | `service build`, `service dev`, `service start`                                 | [service](./packages/plugins/service/README.md)                                                                  |
| Next.js              | `renderer build`, `renderer dev`, `renderer start`                              | [renderer](./packages/plugins/renderer/README.md)                                                                |
| Image                | `image pack`                                                                    | [image](./packages/plugins/image/README.md)                                                                      |
| Verified pair update | `set version atls`                                                              | [essentials](./packages/plugins/essentials/README.md) and the [public installer](./packages/raijin/README.md)    |
