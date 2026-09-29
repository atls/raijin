# Choose a Raijin verification scope

Raijin has three different check surfaces. Use the one that matches the moment; a passing staged or changed-workspace check does not prove the whole project passes.

## Full project while developing

```sh
yarn check
yarn check --verify
```

`yarn check` runs Format, Lint, TypeCheck, unit tests and integration tests for the active Yarn project, in that order. It may write formatting changes. A failing stage makes the command fail, but later stages still run so their diagnostics remain visible.

`--verify` runs the same policy without writing formatted files; formatting drift is a failure. To focus on a directory, use `yarn check packages/app`. Format, Lint and test discovery stay within that directory, while TypeScript uses its applicable project configuration and may include more files. A single-file target checks that file rather than pretending to validate the package.

## Staged files before a commit

```sh
yarn commit staged
```

The installed pre-commit hook calls this command. Native lint-staged discovers the nearest project-owned configuration, selects files from the Git index, runs its declared tasks and restages their results. Raijin supplies no universal default configuration. An independent nested Yarn project needs its own configuration; a successful command with no staged matches is not evidence that every project is covered.

The same hook installation also supplies interactive `yarn commit message` preparation and `yarn commit message lint` validation. Husky owns Git hook execution; Raijin owns only its marked entries. See [hook setup](./quickstart.md#staged-checks) and the [commit capability](../../packages/plugins/commit/README.md).

## Changed and affected workspaces in a pull request

```sh
yarn check --verify --since origin/main
```

Replace `origin/main` with the actual PR base ref. It must exist locally with enough Git history to find a merge base. Yarn's Git change detection selects changed workspaces and recursive dependents. A relevant root or lockfile change runs one full-project pass; a comparison with no selected workspaces reports `No workspaces changed`. This mode never writes formatting changes. It is not a staged-file hook, a full-project assertion for an unrelated change, or a GitHub Check Run created by Raijin. See the [consumer CI example](./quickstart.md#7-check-a-pull-request-in-ci).

## Who owns what

Raijin owns the order of checks, command entrypoints and observable exit result. Prettier, ESLint, TypeScript and Node execute their own formatting, lint, compilation and test rules. Git owns refs and merge-base history; Yarn owns the project, lockfile, PnP and workspace change selection; lint-staged and Husky own staged-file transaction and hook execution; GitHub Actions owns CI execution.

Raijin's own GitHub workflow files are generated from Terraform source in the infrastructure repository. The `.github/workflows` copy is not the place to change those workflows. Consumers own their own CI configuration and may use the [quickstart example](./quickstart.md#7-check-a-pull-request-in-ci).

For the implementation details of each command, start with [check](../../packages/plugins/check/README.md), [format](../../packages/plugins/format/README.md), [lint](../../packages/plugins/lint/README.md), [typecheck](../../packages/plugins/typescript/README.md), [test](../../packages/plugins/test/README.md) and [commit](../../packages/plugins/commit/README.md).
