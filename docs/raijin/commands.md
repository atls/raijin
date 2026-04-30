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
- Purpose: Generate badge assets or badge-related output for the repository.
- When to use: Use when you need to refresh project badges after metadata or status changes.
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
- Purpose: Generate a changelog entry or changelog content from project changes.
- When to use: Use before releasing when you need an updated changelog for recent work.
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
- Purpose: Run the repository's general validation checks.
- When to use: Use to quickly verify that the workspace is in a healthy state.
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
- Purpose: Run lint checks as part of the checks suite.
- When to use: Use when you want to validate code style and lint rules for the project.
- Example: `yarn checks lint`
- Plugin: `@atls/yarn-plugin-checks`
- Source: `yarn/plugin-checks/sources/checks-lint.command.tsx`

<!-- sync:command-card:checks-release -->

#### `checks release`

- Status: `active`
- Purpose: Run release-related checks before publishing or tagging.
- When to use: Use to confirm release readiness and catch release-blocking issues early.
- Example: `yarn checks release`
- Plugin: `@atls/yarn-plugin-checks`
- Source: `yarn/plugin-checks/sources/checks-release.command.ts`

<!-- sync:command-card:checks-run -->

#### `checks run`

- Status: `active`
- Purpose: Run the full checks pipeline for the repository.
- When to use: Use when you need a broad pre-merge or pre-release verification pass.
- Example: `yarn checks run`
- Plugin: `@atls/yarn-plugin-checks`
- Source: `yarn/plugin-checks/sources/checks-run.command.ts`

<!-- sync:command-card:checks-test-integration -->

#### `checks test integration`

- Status: `active`
- Purpose: Run integration tests for the project.
- When to use: Use when you need to validate interactions between modules, services, or external dependencies.
- Example: `yarn checks test integration`
- Plugin: `@atls/yarn-plugin-checks`
- Source: `yarn/plugin-checks/sources/checks-test-integration.command.ts`

<!-- sync:command-card:checks-test-unit -->

#### `checks test unit`

- Status: `active`
- Purpose: Run unit tests for the project.
- When to use: Use when you want to verify isolated functions, components, or modules.
- Example: `yarn checks test unit`
- Plugin: `@atls/yarn-plugin-checks`
- Source: `yarn/plugin-checks/sources/checks-test-unit.command.ts`

<!-- sync:command-card:checks-typecheck -->

#### `checks typecheck`

- Status: `active`
- Purpose: Run TypeScript type checking.
- When to use: Use when you need to catch type errors without running the full test suite.
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
- Purpose: Create or assist with generating a commit message.
- When to use: Use when you want a commit message based on the current staged changes.
- Example: `yarn commit message`
- Plugin: `@atls/yarn-plugin-commit`
- Source: `yarn/plugin-commit/sources/commit-message.command.tsx`

<!-- sync:command-card:commit-message-lint -->

#### `commit message lint`

- Status: `active`
- Purpose: Validate commit message format and conventions.
- When to use: Use before committing or in CI to ensure commit messages follow project rules.
- Example: `yarn commit message lint`
- Plugin: `@atls/yarn-plugin-commit`
- Source: `yarn/plugin-commit/sources/commit-message-lint.command.ts`

<!-- sync:command-card:commit-staged -->

#### `commit staged`

- Status: `active`
- Purpose: Commit the currently staged changes.
- When to use: Use after staging files when you are ready to create a commit.
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
- Purpose: Set or update the ATLS project version.
- When to use: Use when preparing a version bump for the repository or package set.
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
- Purpose: Export workspace or package artifacts for downstream use.
- When to use: Use when you need to produce distributable output from a workspace.
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
- Purpose: List files changed in the repository or workspace.
- When to use: Use when you need to inspect the scope of recent changes.
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
- Purpose: Format source files according to project formatting rules.
- When to use: Use before committing to keep code style consistent.
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
- Purpose: Pack or bundle image assets for the project.
- When to use: Use when image assets need to be prepared for distribution or deployment.
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
- Purpose: Publish a package to JSR.
- When to use: Use when the package is ready to be released to the JSR registry.
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
- Purpose: Build the library package or library artifacts.
- When to use: Use when preparing a library for testing, packaging, or release.
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
- Purpose: Run the project's linting workflow.
- When to use: Use to detect code quality and style issues across the codebase.
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
- Purpose: Create a new release for the project.
- When to use: Use when all checks are complete and you are ready to publish a release.
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
- Purpose: Build the renderer application or renderer assets.
- When to use: Use when preparing the renderer for deployment or packaging.
- Example: `yarn renderer build`
- Plugin: `@atls/yarn-plugin-renderer`
- Source: `yarn/plugin-renderer/sources/commands/renderer-build.command.ts`

<!-- sync:command-card:renderer-dev -->

#### `renderer dev`

- Status: `active`
- Purpose: Start the renderer in development mode.
- When to use: Use during active development when you need a live-running renderer.
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
- Purpose: Build the service application or service artifacts.
- When to use: Use when preparing a service for deployment, testing, or packaging.
- Example: `yarn service build`
- Plugin: `@atls/yarn-plugin-service`
- Source: `yarn/plugin-service/sources/service-build.command.tsx`

<!-- sync:command-card:service-dev -->

#### `service dev`

- Status: `active`
- Purpose: Start the service in development mode with live iteration support.
- When to use: Use when you need to run the service locally while actively developing or debugging it.
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
- Purpose: Run the default test suite for the project.
- When to use: Use for a general verification pass before committing or after changes that may affect behavior.
- Example: `yarn test`
- Plugin: `@atls/yarn-plugin-test`
- Source: `yarn/plugin-test/sources/test.command.ts`

<!-- sync:command-card:test-integration -->

#### `test integration`

- Status: `active`
- Purpose: Run integration tests that verify interactions between components or external dependencies.
- When to use: Use when you need to validate end-to-end flows, API contracts, or multi-module behavior.
- Example: `yarn test integration`
- Plugin: `@atls/yarn-plugin-test`
- Source: `yarn/plugin-test/sources/test-integration.command.ts`

<!-- sync:command-card:test-unit -->

#### `test unit`

- Status: `active`
- Purpose: Run unit tests for isolated functions, modules, or classes.
- When to use: Use when you want fast feedback on small code changes or to verify logic in isolation.
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
- Purpose: Synchronize project raijin configuration and related generated files.
- When to use: Use after updating shared raijin settings or when generated tool configs may be out of date.
- Example: `yarn tools sync`
- Plugin: `@atls/yarn-plugin-tools`
- Source: `yarn/plugin-tools/sources/commands/sync/tools-sync.command.ts`

<!-- sync:command-card:tools-sync-tsconfig -->

#### `tools sync tsconfig`

- Status: `active`
- Purpose: Synchronize TypeScript configuration files such as tsconfig variants.
- When to use: Use when TypeScript project settings change and tsconfig files need to be regenerated or aligned.
- Example: `yarn tools sync tsconfig`
- Plugin: `@atls/yarn-plugin-tools`
- Source: `yarn/plugin-tools/sources/commands/sync/tools-sync-tsconfig.command.ts`

<!-- sync:command-card:tools-sync-typescript -->

#### `tools sync typescript`

- Status: `active`
- Purpose: Synchronize TypeScript-related raijin and generated setup.
- When to use: Use after changes to TypeScript infrastructure, templates, or shared compiler-related settings.
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
- Purpose: Run TypeScript type checking without producing build artifacts.
- When to use: Use to catch typing issues during development or in CI before build and release steps.
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
- Purpose: Generate UI icon assets or icon-related source files.
- When to use: Use when icon sources change or when you need to refresh generated icon outputs.
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
- Purpose: Run a command across workspaces that have changed.
- When to use: Use to target only affected workspaces for checks, builds, or other repeated operations.
- Example: `yarn workspaces changed foreach`
- Plugin: `@atls/yarn-plugin-workspaces`
- Source: `yarn/plugin-workspaces/sources/workspaces-changed-foreach.command.ts`

<!-- sync:command-card:workspaces-changed-list -->

#### `workspaces changed list`

- Status: `active`
- Purpose: List workspaces that have changed.
- When to use: Use when you need to inspect which packages are affected before running scoped workspace commands.
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
- Purpose: Generate a new project from schematics templates.
- When to use: Use when scaffolding a new project structure from predefined templates.
- Example: unavailable for inactive command
- Plugin: `@atls/yarn-plugin-schematics`
- Source: `yarn/plugin-schematics/sources/commands/generate-project.command.tsx`
- Routing: do not use (plugin is in bundle but not exported from plugin index)

</details>
