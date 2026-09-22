# Raijin Commands

Command map assembled from the `@atls/raijin-assembly` runtime

<!-- sync:commands-active -->

## Active (safe to route)

### Domain `check`

- Commands: `check`

<details>
<summary>Domain details: `check`</summary>

<!-- sync:command-card:check -->

#### `check`

- Status: `active`
- Description: run Format, Lint, TypeCheck, unit and integration verification
- Usage: `yarn check [--verify] [--since #0] ...`
- Example: `yarn check`
- Example: `yarn check --verify --since origin/main`
- Example: `yarn check packages/app`
- Example: `yarn check packages/app/src/index.ts`
- Plugin: `@atls/yarn-plugin-check`

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
- Usage: `yarn commit message lint [messageFile]`
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
- Description: install the verified Raijin package and checked runtime pair
- Usage: `yarn set version atls`
- Example: `yarn set version atls`
- Plugin: `@atls/yarn-plugin-essentials`

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

### Domain `generate`

- Commands: `generate project`

<details>
<summary>Domain details: `generate`</summary>

<!-- sync:command-card:generate-project -->

#### `generate project`

- Status: `active`
- Description: generate a Raijin project scaffold
- Usage: `yarn generate project [-t,--type #0]`
- Example: `yarn generate project`
- Plugin: `@atls/yarn-plugin-generate`

</details>

### Domain `image`

- Commands: `image pack`

<details>
<summary>Domain details: `image`</summary>

<!-- sync:command-card:image-pack -->

#### `image pack`

- Status: `active`
- Description: build and optionally publish a container image
- Usage: `yarn image pack [-r,--registry #0] [-t,--tag-policy #0] [--tags #0] [--tag-suffixes #0] [-p,--publish] [--platform #0] [--json]`
- Example: `yarn image pack`
- Contract: Run the command from the selected workspace. It must have a package name and a production `start` script; a declared `build` script is run by the buildpack.
- Contract: The original Yarn project root is the build context. `pack` applies the root `project.toml` filters. The command does not create a standalone export project or guarantee a minimal image.
- Contract: Install `pack` before invoking the command. Raijin does not download it or change its global configuration.
- Contract: `packConfiguration` defaults to `ghcr.io/atls/buildpack-yarn-workspace:24`.
- Contract: `packConfiguration.builderTag` selects the supported Node/buildpack channel.
- Contract: `packConfiguration.buildpackVersion` pins an immutable buildpack tag for rollback.
- Contract: `packConfiguration.buildpack` overrides the full buildpack reference.
- Contract: `--tags <alias,...>` adds additional image tags to the same `pack build` invocation.
- Contract: `--tag-policy explicit --tags <tag,...>` uses only the supplied tags without Git or an automatic `latest` tag.
- Contract: `--tag-suffixes stage,production` adds `<primary>-stage` and `<primary>-production` to a computed primary tag; use it with a revision-derived policy, not `explicit`.
- Contract: `--json` returns provider tags and the local image ID, or the registry digest when `--publish` is explicitly requested. Local builds do not publish images.
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

### Domain `renderer`

- Commands: `renderer build`, `renderer dev`, `renderer start`

<details>
<summary>Domain details: `renderer`</summary>

<!-- sync:command-card:renderer-build -->

#### `renderer build`

- Status: `active`
- Description: build a Next.js application
- Usage: `yarn renderer build ...`
- Example: `yarn renderer build`
- Plugin: `@atls/yarn-plugin-renderer`

<!-- sync:command-card:renderer-dev -->

#### `renderer dev`

- Status: `active`
- Description: run a Next.js development server
- Usage: `yarn renderer dev ...`
- Example: `yarn renderer dev`
- Plugin: `@atls/yarn-plugin-renderer`

<!-- sync:command-card:renderer-start -->

#### `renderer start`

- Status: `active`
- Description: start a built Next.js application
- Usage: `yarn renderer start ...`
- Example: `yarn renderer start`
- Plugin: `@atls/yarn-plugin-renderer`

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
- Example: `yarn test unit`
- Example: `yarn test integration`
- Example: `yarn test integration menu`
- Example: `yarn test unit -w`
- Plugin: `@atls/yarn-plugin-test`

<!-- sync:command-card:test-integration -->

#### `test integration`

- Status: `active`
- Description: run integration tests
- Usage: `yarn test integration [-t,--target #0] [-w,--watch] [--test-reporter #0] ...`
- Example: `yarn test unit`
- Example: `yarn test integration`
- Example: `yarn test integration menu`
- Example: `yarn test unit -w`
- Plugin: `@atls/yarn-plugin-test`

<!-- sync:command-card:test-unit -->

#### `test unit`

- Status: `active`
- Description: run unit tests
- Usage: `yarn test unit [-t,--target #0] [-w,--watch] [--test-reporter #0] ...`
- Example: `yarn test unit`
- Example: `yarn test integration`
- Example: `yarn test integration menu`
- Example: `yarn test unit -w`
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
