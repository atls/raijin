# Raijin Commands

Command map assembled from the `@atls/yarn-cli` runtime

<!-- sync:commands-active -->

## Active (safe to route)

### Domain `badges`

- Commands: `badges generate`

<details>
<summary>Domain details: `badges`</summary>

<!-- sync:command-card:badges-generate -->

#### `badges generate`

- Status: `active`
- Description: generate package badges in the project README
- Usage: `yarn badges generate`
- Example: `yarn badges generate`
- Plugin: `@atls/yarn-plugin-badges`

</details>

### Domain `check`

- Commands: `check`

<details>
<summary>Domain details: `check`</summary>

<!-- sync:command-card:check -->

#### `check`

- Status: `active`
- Description: run formatting, type checking, and linting
- Usage: `yarn check ...`
- Example: `yarn check`
- Example: `yarn check yarn/plugin-check/sources`
- Plugin: `@atls/yarn-plugin-check`

</details>

### Domain `checks`

- Commands: `checks lint`, `checks release`, `checks run`, `checks test integration`, `checks test unit`, `checks typecheck`

<details>
<summary>Domain details: `checks`</summary>

> Important: `checks` targets GitHub Actions runners, requires `GITHUB_TOKEN`, and relies on check context (`context.repo`, `GITHUB_SHA`)

<!-- sync:command-card:checks-lint -->

#### `checks lint`

- Status: `active`
- Description: report lint results to GitHub Checks
- Usage: `yarn checks lint [--changed]`
- Example: `yarn checks lint`
- Plugin: `@atls/yarn-plugin-checks`

<!-- sync:command-card:checks-release -->

#### `checks release`

- Status: `active`
- Description: run the release GitHub check for changed workspaces
- Usage: `yarn checks release [--no-private]`
- Example: `yarn checks release`
- Plugin: `@atls/yarn-plugin-checks`

<!-- sync:command-card:checks-run -->

#### `checks run`

- Status: `active`
- Description: run the standard GitHub check sequence
- Usage: `yarn checks run [--changed] [--no-release]`
- Example: `yarn checks run`
- Plugin: `@atls/yarn-plugin-checks`

<!-- sync:command-card:checks-test-integration -->

#### `checks test integration`

- Status: `active`
- Description: report integration test results to GitHub Checks
- Usage: `yarn checks test integration`
- Example: `yarn checks test integration`
- Plugin: `@atls/yarn-plugin-checks`

<!-- sync:command-card:checks-test-unit -->

#### `checks test unit`

- Status: `active`
- Description: report unit test results to GitHub Checks
- Usage: `yarn checks test unit`
- Example: `yarn checks test unit`
- Plugin: `@atls/yarn-plugin-checks`

<!-- sync:command-card:checks-typecheck -->

#### `checks typecheck`

- Status: `active`
- Description: report TypeScript diagnostics to GitHub Checks
- Usage: `yarn checks typecheck [--changed]`
- Example: `yarn checks typecheck`
- Plugin: `@atls/yarn-plugin-checks`

</details>

### Domain `commit`

- Commands: `commit message`, `commit message lint`, `commit staged`

<details>
<summary>Domain details: `commit`</summary>

<!-- sync:command-card:commit-message -->

#### `commit message`

- Status: `active`
- Description: create a conventional commit message interactively
- Usage: `yarn commit message ...`
- Example: `yarn commit message`
- Plugin: `@atls/yarn-plugin-commit`

<!-- sync:command-card:commit-message-lint -->

#### `commit message lint`

- Status: `active`
- Description: validate commit messages against project scopes
- Usage: `yarn commit message lint`
- Example: `yarn commit message lint`
- Plugin: `@atls/yarn-plugin-commit`

<!-- sync:command-card:commit-staged -->

#### `commit staged`

- Status: `active`
- Description: run project checks for staged files
- Usage: `yarn commit staged ...`
- Example: `yarn commit staged`
- Plugin: `@atls/yarn-plugin-commit`

</details>

### Domain `essentials`

- Commands: `set version atls`

<details>
<summary>Domain details: `essentials`</summary>

<!-- sync:command-card:set-version-atls -->

#### `set version atls`

- Status: `active`
- Description: lock the Yarn version used by the project
- Usage: `yarn set version atls`
- Example: `yarn set version atls`
- Plugin: `@atls/yarn-plugin-essentials`

</details>

### Domain `export`

- Commands: `export`

<details>
<summary>Domain details: `export`</summary>

<!-- sync:command-card:export -->

#### `export`

- Status: `active`
- Description: export a workspace and its production dependencies
- Usage: `yarn export <-d,--destination #0>`
- Example: `yarn export`
- Plugin: `@atls/yarn-plugin-export`

</details>

### Domain `files`

- Commands: `files changed list`

<details>
<summary>Domain details: `files`</summary>

<!-- sync:command-card:files-changed-list -->

#### `files changed list`

- Status: `active`
- Description: list files changed since the comparison base
- Usage: `yarn files changed list [--json]`
- Example: `yarn files changed list`
- Plugin: `@atls/yarn-plugin-files`

</details>

### Domain `format`

- Commands: `format`

<details>
<summary>Domain details: `format`</summary>

<!-- sync:command-card:format -->

#### `format`

- Status: `active`
- Description: format project files
- Usage: `yarn format ...`
- Example: `yarn format`
- Plugin: `@atls/yarn-plugin-format`

</details>

### Domain `image`

- Commands: `image pack`

<details>
<summary>Domain details: `image`</summary>

<!-- sync:command-card:image-pack -->

#### `image pack`

- Status: `active`
- Description: build and optionally publish a container image
- Usage: `yarn image pack [-r,--registry #0] [-t,--tag-policy #0] [-p,--publish] [--platform #0]`
- Example: `yarn image pack`
- Contract: `packConfiguration` defaults to `ghcr.io/atls/buildpack-yarn-workspace:24`.
- Contract: `packConfiguration.builderTag` selects the supported Node/buildpack channel.
- Contract: `packConfiguration.buildpackVersion` pins an immutable buildpack tag for rollback.
- Contract: `packConfiguration.buildpack` overrides the full buildpack reference.
- Plugin: `@atls/yarn-plugin-image`

</details>

### Domain `library`

- Commands: `library build`

<details>
<summary>Domain details: `library`</summary>

<!-- sync:command-card:library-build -->

#### `library build`

- Status: `active`
- Description: build a library workspace
- Usage: `yarn library build [-t,--target #0]`
- Example: `yarn library build`
- Plugin: `@atls/yarn-plugin-library`

</details>

### Domain `lint`

- Commands: `lint`

<details>
<summary>Domain details: `lint`</summary>

<!-- sync:command-card:lint -->

#### `lint`

- Status: `active`
- Description: lint project files
- Usage: `yarn lint [--fix] [--cache] ...`
- Example: `yarn lint`
- Plugin: `@atls/yarn-plugin-lint`

</details>

### Domain `raijin`

- Commands: `raijin sync`, `raijin sync tsconfig`, `raijin sync typescript`

<details>
<summary>Domain details: `raijin`</summary>

<!-- sync:command-card:raijin-sync -->

#### `raijin sync`

- Status: `active`
- Description: synchronize Raijin project support files
- Usage: `yarn raijin sync`
- Example: `yarn raijin sync`
- Plugin: `@atls/yarn-plugin-tools`

<!-- sync:command-card:raijin-sync-tsconfig -->

#### `raijin sync tsconfig`

- Status: `active`
- Description: synchronize Raijin TypeScript configuration
- Usage: `yarn raijin sync tsconfig`
- Example: `yarn raijin sync tsconfig`
- Plugin: `@atls/yarn-plugin-tools`

<!-- sync:command-card:raijin-sync-typescript -->

#### `raijin sync typescript`

- Status: `active`
- Description: synchronize the Raijin TypeScript dependency
- Usage: `yarn raijin sync typescript`
- Example: `yarn raijin sync typescript`
- Plugin: `@atls/yarn-plugin-tools`

</details>

### Domain `release`

- Commands: `release create`, `release version apply`, `release version defer`

<details>
<summary>Domain details: `release`</summary>

<!-- sync:command-card:release-create -->

#### `release create`

- Status: `active`
- Description: create and publish a project release
- Usage: `yarn release create`
- Example: `yarn release create`
- Plugin: `@atls/yarn-plugin-release`

<!-- sync:command-card:release-version-apply -->

#### `release version apply`

- Status: `active`
- Description: apply deferred workspace versions
- Usage: `yarn release version apply [--workspace #0] [--github-output #0] [--since #0]`
- Example: `yarn release version apply`
- Plugin: `@atls/yarn-plugin-release`

<!-- sync:command-card:release-version-defer -->

#### `release version defer`

- Status: `active`
- Description: defer version bumps for changed workspaces
- Usage: `yarn release version defer [--since #0] [--dry-run]`
- Example: `yarn release version defer`
- Plugin: `@atls/yarn-plugin-release`

</details>

### Domain `renderer`

- Commands: `renderer build`, `renderer dev`, `renderer start`

<details>
<summary>Domain details: `renderer`</summary>

<!-- sync:command-card:renderer-build -->

#### `renderer build`

- Status: `active`
- Description: build a renderer production artifact
- Usage: `yarn renderer build`
- Example: `yarn renderer build`
- Plugin: `@atls/yarn-plugin-renderer`

<!-- sync:command-card:renderer-dev -->

#### `renderer dev`

- Status: `active`
- Description: run a renderer in development mode
- Usage: `yarn renderer dev [--tunnel] [--https]`
- Example: `yarn renderer dev`
- Plugin: `@atls/yarn-plugin-renderer`

<!-- sync:command-card:renderer-start -->

#### `renderer start`

- Status: `active`
- Description: start a built renderer artifact
- Usage: `yarn renderer start`
- Example: `yarn renderer start`
- Plugin: `@atls/yarn-plugin-renderer`

</details>

### Domain `schematics`

- Commands: `generate project`

<details>
<summary>Domain details: `schematics`</summary>

<!-- sync:command-card:generate-project -->

#### `generate project`

- Status: `active`
- Description: generate a Raijin project scaffold
- Usage: `yarn generate project [-t,--type #0]`
- Example: `yarn generate project`
- Plugin: `@atls/yarn-plugin-schematics`

</details>

### Domain `service`

- Commands: `service build`, `service dev`, `service start`

<details>
<summary>Domain details: `service`</summary>

<!-- sync:command-card:service-build -->

#### `service build`

- Status: `active`
- Description: build a service production artifact
- Usage: `yarn service build [-w,--show-warnings]`
- Example: `yarn service build`
- Plugin: `@atls/yarn-plugin-service`

<!-- sync:command-card:service-dev -->

#### `service dev`

- Status: `active`
- Description: run a service in development mode
- Usage: `yarn service dev [-w,--show-warnings]`
- Example: `yarn service dev`
- Plugin: `@atls/yarn-plugin-service`

<!-- sync:command-card:service-start -->

#### `service start`

- Status: `active`
- Description: start a built service artifact
- Usage: `yarn service start`
- Example: `yarn service start`
- Plugin: `@atls/yarn-plugin-service`

</details>

### Domain `test`

- Commands: `test`, `test integration`, `test unit`

<details>
<summary>Domain details: `test`</summary>

<!-- sync:command-card:test -->

#### `test`

- Status: `active`
- Description: run all workspace tests
- Usage: `yarn test [-t,--target #0] [-w,--watch] [--test-reporter #0] ...`
- Example: `yarn test`
- Plugin: `@atls/yarn-plugin-test`

<!-- sync:command-card:test-integration -->

#### `test integration`

- Status: `active`
- Description: run integration tests
- Usage: `yarn test integration [-t,--target #0] [-w,--watch] [--test-reporter #0] ...`
- Example: `yarn test integration`
- Plugin: `@atls/yarn-plugin-test`

<!-- sync:command-card:test-unit -->

#### `test unit`

- Status: `active`
- Description: run unit tests
- Usage: `yarn test unit [-t,--target #0] [-w,--watch] [--test-reporter #0] ...`
- Example: `yarn test unit`
- Plugin: `@atls/yarn-plugin-test`

</details>

### Domain `typescript`

- Commands: `typecheck`

<details>
<summary>Domain details: `typescript`</summary>

<!-- sync:command-card:typecheck -->

#### `typecheck`

- Status: `active`
- Description: type-check project sources
- Usage: `yarn typecheck ...`
- Example: `yarn typecheck`
- Plugin: `@atls/yarn-plugin-typescript`

</details>

### Domain `ui`

- Commands: `ui icons generate`

<details>
<summary>Domain details: `ui`</summary>

<!-- sync:command-card:ui-icons-generate -->

#### `ui icons generate`

- Status: `active`
- Description: generate icon components from source assets
- Usage: `yarn ui icons generate [-n, --native]`
- Example: `yarn ui icons generate`
- Plugin: `@atls/yarn-plugin-ui`

</details>

### Domain `workspaces`

- Commands: `workspaces changed foreach`, `workspaces changed list`

<details>
<summary>Domain details: `workspaces`</summary>

<!-- sync:command-card:workspaces-changed-foreach -->

#### `workspaces changed foreach`

- Status: `active`
- Description: run a command in changed workspaces
- Usage: `yarn workspaces changed foreach [--exclude #0] [-v,--verbose] [-p,--parallel] [-W,--worktree] [-A,--all] [-R,--recursive] [--since #0] [-i,--interlaced] [--no-private] [-t,--topological] [--topological-dev] [-j,--jobs #0] <commandName> ...`
- Example: `yarn workspaces changed foreach`
- Plugin: `@atls/yarn-plugin-workspaces`

<!-- sync:command-card:workspaces-changed-list -->

#### `workspaces changed list`

- Status: `active`
- Description: list changed workspaces
- Usage: `yarn workspaces changed list [--json]`
- Example: `yarn workspaces changed list`
- Plugin: `@atls/yarn-plugin-workspaces`

</details>
