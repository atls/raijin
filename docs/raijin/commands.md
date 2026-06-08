# Raijin Commands

Command map extracted from `yarn/plugin-*` and `@atls/yarn-cli` bundle

<!-- sync:commands-active -->

## Active (safe to route)

### Domain `badges`

- Commands: `badges generate`

<details>
<summary>Domain details: `badges`</summary>

<!-- sync:command-card:badges-generate -->

#### `badges generate`

- Status: `active`
- Example: `yarn badges generate`
- Plugin: `@atls/yarn-plugin-badges`
- Source: `yarn/plugin-badges/sources/badges.command.ts`

</details>

### Domain `changelog`

- Commands: `changelog generate`

<details>
<summary>Domain details: `changelog`</summary>

<!-- sync:command-card:changelog-generate -->

#### `changelog generate`

- Status: `active`
- Example: `yarn changelog generate`
- Plugin: `@atls/yarn-plugin-changelog`
- Source: `yarn/plugin-changelog/sources/changelog-generate.command.ts`

</details>

### Domain `check`

- Commands: `check`

<details>
<summary>Domain details: `check`</summary>

<!-- sync:command-card:check -->

#### `check`

- Status: `active`
- Example: `yarn check`
- Plugin: `@atls/yarn-plugin-check`
- Source: `yarn/plugin-check/sources/check.command.ts`

</details>

### Domain `checks`

- Commands: `checks lint`, `checks release`, `checks run`, `checks test integration`, `checks test unit`, `checks typecheck`

<details>
<summary>Domain details: `checks`</summary>

> Important: `checks` targets GitHub Actions runners, requires `GITHUB_TOKEN`, and relies on check context (`context.repo`, `GITHUB_SHA`)

<!-- sync:command-card:checks-lint -->

#### `checks lint`

- Status: `active`
- Example: `yarn checks lint`
- Plugin: `@atls/yarn-plugin-checks`
- Source: `yarn/plugin-checks/sources/checks-lint.command.tsx`

<!-- sync:command-card:checks-release -->

#### `checks release`

- Status: `active`
- Example: `yarn checks release`
- Plugin: `@atls/yarn-plugin-checks`
- Source: `yarn/plugin-checks/sources/checks-release.command.ts`

<!-- sync:command-card:checks-run -->

#### `checks run`

- Status: `active`
- Example: `yarn checks run`
- Plugin: `@atls/yarn-plugin-checks`
- Source: `yarn/plugin-checks/sources/checks-run.command.ts`

<!-- sync:command-card:checks-test-integration -->

#### `checks test integration`

- Status: `active`
- Example: `yarn checks test integration`
- Plugin: `@atls/yarn-plugin-checks`
- Source: `yarn/plugin-checks/sources/checks-test-integration.command.ts`

<!-- sync:command-card:checks-test-unit -->

#### `checks test unit`

- Status: `active`
- Example: `yarn checks test unit`
- Plugin: `@atls/yarn-plugin-checks`
- Source: `yarn/plugin-checks/sources/checks-test-unit.command.ts`

<!-- sync:command-card:checks-typecheck -->

#### `checks typecheck`

- Status: `active`
- Example: `yarn checks typecheck`
- Plugin: `@atls/yarn-plugin-checks`
- Source: `yarn/plugin-checks/sources/checks-typecheck.command.tsx`

</details>

### Domain `commit`

- Commands: `commit message`, `commit message lint`, `commit staged`

<details>
<summary>Domain details: `commit`</summary>

<!-- sync:command-card:commit-message -->

#### `commit message`

- Status: `active`
- Example: `yarn commit message`
- Plugin: `@atls/yarn-plugin-commit`
- Source: `yarn/plugin-commit/sources/commit-message.command.tsx`

<!-- sync:command-card:commit-message-lint -->

#### `commit message lint`

- Status: `active`
- Example: `yarn commit message lint`
- Plugin: `@atls/yarn-plugin-commit`
- Source: `yarn/plugin-commit/sources/commit-message-lint.command.ts`

<!-- sync:command-card:commit-staged -->

#### `commit staged`

- Status: `active`
- Example: `yarn commit staged`
- Plugin: `@atls/yarn-plugin-commit`
- Source: `yarn/plugin-commit/sources/commit-staged.command.ts`

</details>

### Domain `essentials`

- Commands: `set version atls`

<details>
<summary>Domain details: `essentials`</summary>

<!-- sync:command-card:set-version-atls -->

#### `set version atls`

- Status: `active`
- Example: `yarn set version atls`
- Plugin: `@atls/yarn-plugin-essentials`
- Source: `yarn/plugin-essentials/sources/commands/set-version.command.ts`

</details>

### Domain `export`

- Commands: `export`

<details>
<summary>Domain details: `export`</summary>

<!-- sync:command-card:export -->

#### `export`

- Status: `active`
- Example: `yarn export`
- Plugin: `@atls/yarn-plugin-export`
- Source: `yarn/plugin-export/sources/commands/workspace-export.command.ts`

</details>

### Domain `files`

- Commands: `files changed list`

<details>
<summary>Domain details: `files`</summary>

<!-- sync:command-card:files-changed-list -->

#### `files changed list`

- Status: `active`
- Example: `yarn files changed list`
- Plugin: `@atls/yarn-plugin-files`
- Source: `yarn/plugin-files/sources/files-changed-list.command.ts`

</details>

### Domain `format`

- Commands: `format`

<details>
<summary>Domain details: `format`</summary>

<!-- sync:command-card:format -->

#### `format`

- Status: `active`
- Example: `yarn format`
- Plugin: `@atls/yarn-plugin-format`
- Source: `yarn/plugin-format/sources/format.command.tsx`

</details>

### Domain `image`

- Commands: `image pack`

<details>
<summary>Domain details: `image`</summary>

<!-- sync:command-card:image-pack -->

#### `image pack`

- Status: `active`
- Example: `yarn image pack`
- Plugin: `@atls/yarn-plugin-image`
- Source: `yarn/plugin-image/sources/image-pack.command.ts`

</details>

### Domain `jsr`

- Commands: `jsr publish`

<details>
<summary>Domain details: `jsr`</summary>

<!-- sync:command-card:jsr-publish -->

#### `jsr publish`

- Status: `active`
- Example: `yarn jsr publish`
- Plugin: `@atls/yarn-plugin-jsr`
- Source: `yarn/plugin-jsr/sources/jsr-publish.command.ts`

</details>

### Domain `library`

- Commands: `library build`

<details>
<summary>Domain details: `library`</summary>

<!-- sync:command-card:library-build -->

#### `library build`

- Status: `active`
- Example: `yarn library build`
- Plugin: `@atls/yarn-plugin-library`
- Source: `yarn/plugin-library/sources/library-build.command.tsx`

</details>

### Domain `lint`

- Commands: `lint`

<details>
<summary>Domain details: `lint`</summary>

<!-- sync:command-card:lint -->

#### `lint`

- Status: `active`
- Example: `yarn lint`
- Plugin: `@atls/yarn-plugin-lint`
- Source: `yarn/plugin-lint/sources/lint.command.tsx`

</details>

### Domain `release`

- Commands: `release create`

<details>
<summary>Domain details: `release`</summary>

<!-- sync:command-card:release-create -->

#### `release create`

- Status: `active`
- Example: `yarn release create`
- Plugin: `@atls/yarn-plugin-release`
- Source: `yarn/plugin-release/sources/release-create.command.ts`

</details>

### Domain `renderer`

- Commands: `renderer build`, `renderer dev`

<details>
<summary>Domain details: `renderer`</summary>

<!-- sync:command-card:renderer-build -->

#### `renderer build`

- Status: `active`
- Example: `yarn renderer build`
- Plugin: `@atls/yarn-plugin-renderer`
- Source: `yarn/plugin-renderer/sources/commands/renderer-build.command.ts`

<!-- sync:command-card:renderer-dev -->

#### `renderer dev`

- Status: `active`
- Example: `yarn renderer dev`
- Plugin: `@atls/yarn-plugin-renderer`
- Source: `yarn/plugin-renderer/sources/commands/renderer-dev.command.ts`

</details>

### Domain `service`

- Commands: `service build`, `service dev`

<details>
<summary>Domain details: `service`</summary>

<!-- sync:command-card:service-build -->

#### `service build`

- Status: `active`
- Example: `yarn service build`
- Plugin: `@atls/yarn-plugin-service`
- Source: `yarn/plugin-service/sources/service-build.command.tsx`

<!-- sync:command-card:service-dev -->

#### `service dev`

- Status: `active`
- Example: `yarn service dev`
- Plugin: `@atls/yarn-plugin-service`
- Source: `yarn/plugin-service/sources/service-dev.command.tsx`

</details>

### Domain `test`

- Commands: `test`, `test integration`, `test unit`

<details>
<summary>Domain details: `test`</summary>

<!-- sync:command-card:test -->

#### `test`

- Status: `active`
- Example: `yarn test`
- Plugin: `@atls/yarn-plugin-test`
- Source: `yarn/plugin-test/sources/test.command.ts`

<!-- sync:command-card:test-integration -->

#### `test integration`

- Status: `active`
- Example: `yarn test integration`
- Plugin: `@atls/yarn-plugin-test`
- Source: `yarn/plugin-test/sources/test-integration.command.ts`

<!-- sync:command-card:test-unit -->

#### `test unit`

- Status: `active`
- Example: `yarn test unit`
- Plugin: `@atls/yarn-plugin-test`
- Source: `yarn/plugin-test/sources/test-unit.command.ts`

</details>

### Domain `tools`

- Commands: `tools sync`, `tools sync tsconfig`, `tools sync typescript`

<details>
<summary>Domain details: `tools`</summary>

<!-- sync:command-card:tools-sync -->

#### `tools sync`

- Status: `active`
- Example: `yarn tools sync`
- Plugin: `@atls/yarn-plugin-tools`
- Source: `yarn/plugin-tools/sources/commands/sync/tools-sync.command.ts`

<!-- sync:command-card:tools-sync-tsconfig -->

#### `tools sync tsconfig`

- Status: `active`
- Example: `yarn tools sync tsconfig`
- Plugin: `@atls/yarn-plugin-tools`
- Source: `yarn/plugin-tools/sources/commands/sync/tools-sync-tsconfig.command.ts`

<!-- sync:command-card:tools-sync-typescript -->

#### `tools sync typescript`

- Status: `active`
- Example: `yarn tools sync typescript`
- Plugin: `@atls/yarn-plugin-tools`
- Source: `yarn/plugin-tools/sources/commands/sync/tools-sync-typescript.command.ts`

</details>

### Domain `typescript`

- Commands: `typecheck`

<details>
<summary>Domain details: `typescript`</summary>

<!-- sync:command-card:typecheck -->

#### `typecheck`

- Status: `active`
- Example: `yarn typecheck`
- Plugin: `@atls/yarn-plugin-typescript`
- Source: `yarn/plugin-typescript/sources/typecheck.command.tsx`

</details>

### Domain `ui`

- Commands: `ui icons generate`

<details>
<summary>Domain details: `ui`</summary>

<!-- sync:command-card:ui-icons-generate -->

#### `ui icons generate`

- Status: `active`
- Example: `yarn ui icons generate`
- Plugin: `@atls/yarn-plugin-ui`
- Source: `yarn/plugin-ui/sources/commands/ui-icons-generate.command.tsx`

</details>

### Domain `workspaces`

- Commands: `workspaces changed foreach`, `workspaces changed list`

<details>
<summary>Domain details: `workspaces`</summary>

<!-- sync:command-card:workspaces-changed-foreach -->

#### `workspaces changed foreach`

- Status: `active`
- Example: `yarn workspaces changed foreach`
- Plugin: `@atls/yarn-plugin-workspaces`
- Source: `yarn/plugin-workspaces/sources/workspaces-changed-foreach.command.ts`

<!-- sync:command-card:workspaces-changed-list -->

#### `workspaces changed list`

- Status: `active`
- Example: `yarn workspaces changed list`
- Plugin: `@atls/yarn-plugin-workspaces`
- Source: `yarn/plugin-workspaces/sources/workspaces-changed-list.command.ts`

</details>

<!-- sync:commands-inactive -->

## Inactive (do not route)

### Domain `schematics`

- Commands: `generate project`

<details>
<summary>Domain details: `schematics`</summary>

<!-- sync:command-card:generate-project -->

#### `generate project`

- Status: `inactive`
- Example: unavailable for inactive command
- Plugin: `@atls/yarn-plugin-schematics`
- Source: `yarn/plugin-schematics/sources/commands/generate-project.command.tsx`
- Routing: do not use (plugin is in bundle but not exported from plugin index)

</details>
