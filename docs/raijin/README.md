# Raijin guides

The quickstart covers setup. This page lists Raijin commands and links to their detailed behavior.

## Start here

- Create or connect a project: [quickstart](./quickstart.md)
- Choose a local check, hook or CI check: [root README](../../README_EN.md)
- Check an installed command's arguments: `yarn <command> --help`

## Commands by task

| Task                 | Commands                                                                        | Where to read more                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Project checks       | `check`, `format`, `lint`, `typecheck`, `test`, `test unit`, `test integration` | [check](../../packages/plugins/check/README.md), [test](../../packages/plugins/test/README.md) and their linked capabilities |
| Commit checks        | `commit staged`, `commit message`, `commit message lint`                        | [commit](../../packages/plugins/commit/README.md)                                                                            |
| Scaffold             | `generate project`                                                              | [generate](../../packages/plugins/generate/README.md)                                                                        |
| Library              | `library build`                                                                 | [library](../../packages/plugins/library/README.md)                                                                          |
| Service              | `service build`, `service dev`, `service start`                                 | [service](../../packages/plugins/service/README.md)                                                                          |
| Next.js              | `renderer build`, `renderer dev`, `renderer start`                              | [renderer](../../packages/plugins/renderer/README.md)                                                                        |
| Image                | `image pack`                                                                    | [image](../../packages/plugins/image/README.md)                                                                              |
| Verified pair update | `set version atls`                                                              | [essentials](../../packages/plugins/essentials/README.md) and the [public installer](../../packages/raijin/README.md)        |

Public `init` and `update` connect the package and Yarn pair but are not commands registered in the installed Yarn runtime. Native commands such as `workspaces list` and `npm publish` remain Yarn's.
