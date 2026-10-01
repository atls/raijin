![raijin-github-cover](https://github.com/user-attachments/assets/ac98b900-ee3c-4ea8-a081-e83a1f5f3282)

# Atlantis Raijin

[![Raijin Docs RU](https://img.shields.io/badge/Raijin%20Docs-RU-0b5fff)](README.md)
[![Raijin Docs EN](https://img.shields.io/badge/Raijin%20Docs-EN-1f8a70)](README_EN.md)

Raijin gives Node.js and TypeScript projects on Yarn a shared engineering workflow. Delivered as a versioned Yarn bundle, it gives teams a consistent way to check changes, prepare commits, and build their work across repositories, locally and in CI.

Each project owns its formatting, code-analysis, and testing rules. Raijin runs them through shared commands with clear check scopes, so a result can be reproduced without guessing which of several similar commands actually ran.

## Get started

You need Yarn and a Node.js version within the range declared by the [Raijin package](./packages/raijin/package.json). Create a new project in an empty directory:

```bash
yarn dlx @atls/raijin init --type project
```

Use `--type library` for a library. To connect or update an existing project, run this from its Yarn project root:

```bash
yarn dlx @atls/raijin update
```

An existing project must use ES modules; the installer does not change its module format or tool configuration. The [quickstart](./docs/raijin/quickstart.md) covers Git hooks and CI setup.

## Checks

- `yarn check` checks the whole project and may fix formatting
- `yarn commit staged` checks staged files using the project's rules
- `yarn check --verify --since <ref>` checks the affected scope in CI without changing files

Other commands build libraries and services, run Next.js, and pack images. The [command map](./docs/raijin/README.md) links to the details for each.

## Read more

- [Quickstart and CI setup](./docs/raijin/quickstart.md)
- [Command map](./docs/raijin/README.md)
- [Русский README](./README.md)
