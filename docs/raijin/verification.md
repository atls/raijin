# Verification Ownership

Repository verification exposes stable aggregate capabilities while each check, test, fixture, and consumer scenario remains with its implementation owner.

## Durable Rules

- The repository aggregate invokes stable capabilities and does not select test files or consumer scenarios
- Test discovery and selection stay with the package or capability that implements the test contract
- Unit and contract tests stay with the production responsibility they verify
- Disposable consumer assets stay outside runtime source and keep fixtures local to their scenario
- Shared runner code represents semantics required by multiple scenarios, never a generic `test-utils`, `fixtures`, or `helpers` collection
- The generated command inventory remains in `commands.md` and `index.v1.json`; this document does not duplicate it

## Ownership Transitions

This table records current implementation ownership. A tracking issue names a migration, not the current owner.

| Responsibility                    | Current owner                                            | State     | Transition condition                                                                                                            |
| --------------------------------- | -------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Repository verification aggregate | Root `raijin:check` capability                           | Current   | It remains an aggregate and delegates only to stable owner capabilities                                                         |
| CLI surface and checked runtime   | `scripts/raijin/cli-surface` and `@atls/raijin-assembly` | Current   | #845 established this boundary; later changes remain with the same capability                                                   |
| Disposable consumer scenarios     | `@atls/raijin-assembly` runtime consumer scripts         | Current   | #806 may extend their coverage only after the final command inventory is available                                              |
| Project test execution            | `packages/plugins/test` with direct Node.js execution    | Current   | #839 established one result for the general, unit, integration, and checks consumers                                            |
| Check orchestration               | `yarn/plugin-checks`                                     | Migrating | #804 replaces it only after local orchestration and GitHub reporting are separated and recursive command composition is removed |
| Complete command consumer matrix  | Not implemented                                          | Planned   | #806 becomes current only after the final registered inventory has a package-owned entrypoint and consumer proof                |

## Update Contract

- A pull request that changes implementation ownership updates the corresponding row in the same delivery unit
- A planned or migrating responsibility becomes current only after its transition condition and focused proof are complete
- Every migration changes one owner at a time; adjacent test semantics, check orchestration, or consumer coverage remain with their tracking issue
