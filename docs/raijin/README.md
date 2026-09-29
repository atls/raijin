# Raijin guides

Start with the checked package/runtime pair, then choose the command that fits your work. Raijin keeps one command contract across local development, hooks and CI while Yarn and the underlying tools retain their own behavior.

<!-- sync:router-scenarios -->

## Navigate by task

- Create or connect a project, configure hooks, or copy a consumer CI example: [quickstart](./quickstart.md)
- Choose between full-project, staged-file and changed-workspace checks: [verification scopes](./verification.md)
- Inspect exact syntax in the installed runtime: `yarn --help` and `yarn <command> --help`

<!-- sync:router-read-order -->

## Read order

1. [quickstart.md](./quickstart.md)
2. [verification.md](./verification.md)

<!-- sync:router-command-map -->

## Commands by task

| Task                 | Retained commands                                                               | Detailed owner                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Project checks       | `check`, `format`, `lint`, `typecheck`, `test`, `test unit`, `test integration` | [check](../../packages/plugins/check/README.md), [test](../../packages/plugins/test/README.md) and their linked capabilities |
| Commit checks        | `commit staged`, `commit message`, `commit message lint`                        | [commit](../../packages/plugins/commit/README.md)                                                                            |
| Scaffold             | `generate project`                                                              | [generate](../../packages/plugins/generate/README.md)                                                                        |
| Library              | `library build`                                                                 | [library](../../packages/plugins/library/README.md)                                                                          |
| Service              | `service build`, `service dev`, `service start`                                 | [service](../../packages/plugins/service/README.md)                                                                          |
| Next.js              | `renderer build`, `renderer dev`, `renderer start`                              | [renderer](../../packages/plugins/renderer/README.md)                                                                        |
| Image                | `image pack`                                                                    | [image](../../packages/plugins/image/README.md)                                                                              |
| Verified pair update | `set version atls`                                                              | [essentials](../../packages/plugins/essentials/README.md) and the [public installer](../../packages/raijin/README.md)        |

The public `raijin init/update` binary is the setup path after a matching v2 release is published; it is not an extra registered Yarn command. Native Yarn commands such as `workspaces list` and `npm publish` remain Yarn's, not Raijin's. In the Raijin source repository, `yarn raijin:check` verifies the assembly and checked runtime; consumers do not need that repository-only script.
