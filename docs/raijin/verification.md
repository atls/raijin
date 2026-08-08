# Verification Ownership

Repository verification exposes stable aggregate capabilities while each check, test, fixture, and consumer scenario remains with the responsibility it verifies.

## Owner Map

| Surface                                                | Owner                                           | Contract                                                                                                                                                         | Consumers                                          |
| ------------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `yarn raijin:check`                                    | Repository aggregate                            | Sequences Raijin-owned drift, runtime, localization, deterministic routing, and disposable consumer capabilities without selecting individual tests or scenarios | Raijin CI and contributors                         |
| `yarn raijin:check:runtime`                            | Global CLI surface from #845                    | Proves the built and checked runtimes, registered routes, general help, command metadata, and plugin graph agree                                                 | Repository aggregate                               |
| `yarn raijin:smoke:deterministic`                      | Generated command documentation                 | Proves the checked prompt fixtures resolve against the generated command index                                                                                   | Repository aggregate                               |
| `yarn raijin:smoke:cli`                                | `@atls/yarn-cli` disposable consumer capability | Runs the package-owned consumer registry against the checked runtime and a matching package archive                                                              | Repository aggregate and focused capability proofs |
| `yarn test`, `yarn test unit`, `yarn test integration` | Project test execution in #839                  | Discovers and executes project tests with the supported Node.js test contract                                                                                    | Packages, checks, and contributors                 |
| `yarn checks run`                                      | Check orchestration in #804                     | Composes format, typecheck, lint, test, and release checks without becoming their implementation owner                                                           | Shared GitHub checks workflow                      |
| Complete command consumer matrix                       | Consumer smoke in #806                          | Reconciles and proves the final registered command surface across disposable and real consumers                                                                  | Architecture epic completion                       |

## Test Placement

- Unit and contract tests stay with the production responsibility they verify
- Package-level test roots are reserved for import, bootstrap, cross-module contract, and package smoke coverage
- Repository aggregate scripts do not enumerate test files; project test discovery remains owned by #839
- A focused capability proof selects its package or consumer scenario through the owning entrypoint rather than adding another root script

## Disposable Consumers

- Consumer assets live under `yarn/cli/scripts/runtime/consumer`, outside runtime source
- The shared runner owns temporary project creation, checked runtime installation, matching archive installation, environment isolation, and cleanup
- Each scenario owns only its fixture, preparation, commands, and assertions
- Fixture files remain scenario-local and use non-discoverable source names when their contents would otherwise be collected as repository tests or workspaces
- Shared consumer code is introduced only for semantics required by more than one scenario; generic `test-utils`, `fixtures`, and `helpers` collections are not owners

## Migration Boundary

Every verification change migrates one owner at a time and retains a focused proof for that contour. Project test semantics remain in #839, check orchestration remains in #804, and the complete command-wide consumer matrix remains in #806.
