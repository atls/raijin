![raijin-github-cover](https://user-images.githubusercontent.com/102182195/234980835-78ed0fdb-c692-4b0e-ac95-b46c8cbd17a4.png)

# Atlantis Raijin

[![Raijin Docs RU](https://img.shields.io/badge/Raijin%20Docs-RU-0b5fff)](README.md)
[![Raijin Docs EN](https://img.shields.io/badge/Raijin%20Docs-EN-1f8a70)](README_EN.md)

<!-- sync:root-what -->

## What this is

Raijin is an engineering operating model for a unified delivery contour, shipped as the custom `atls` Yarn bundle
It aligns teams on strict standards and strong contracts to increase delivery predictability and real engineering throughput

<!-- sync:root-audience -->

## Who it is for

- Teams maintaining multiple `Node.js`/`TypeScript` projects
- Developers who need one command contract locally and in `GitHub Actions`
- Open-source and internal repositories that need predictable checks and upgrades

<!-- sync:root-capabilities -->

## What Raijin can do

- Code validation: `check`, `lint`, `typecheck`, `test`, `checks *`
- Change scope tooling: `files changed *`, `workspaces changed *`
- Build and release flows: `service build`, `library build`, `release create`, `npm publish`
- Generators and utility commands for monorepo infrastructure

<!-- sync:root-quickstart -->

## Quickstart

### New project

```bash
yarn set version https://raw.githubusercontent.com/atls/raijin/master/yarn/cli/dist/yarn.mjs
yarn set version atls
```

Expected result:

- `.yarn/releases/yarn.mjs` is added or updated in the project
- Raijin commands are available via `yarn`

### Upgrade

```bash
yarn set version atls
```

Expected result:

- The latest bundle version is installed

### Verify

```bash
yarn check
yarn files changed list
```

Expected result:

- Commands run with expected routing and expected validation steps

<!-- sync:root-consumer-howto -->

## How to use in another project

1. Install the bundle using [Quickstart](./docs/raijin/quickstart.md)
2. Commit `.yarn/releases` and `.yarnrc.yml` changes to version control
3. Update with `yarn set version atls` when newer bundle versions are released

<!-- sync:root-read-more -->

## Where to read next

- RU (default): [README.md](README.md)
- EN: [README_EN.md](README_EN.md)
- Docs index RU: [docs/README.ru.md](docs/README.ru.md)
- Docs index EN: [docs/README.md](docs/README.md)
- Raijin section router: [docs/raijin/README.md](docs/raijin/README.md)
- Quickstart: [docs/raijin/quickstart.md](docs/raijin/quickstart.md)
- Commands map: [docs/raijin/commands.md](docs/raijin/commands.md)
- Packages map: [docs/raijin/packages.md](docs/raijin/packages.md)
