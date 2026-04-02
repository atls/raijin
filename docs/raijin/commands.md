# Raijin Commands

Command map extracted from `yarn/plugin-*` and `@atls/yarn-cli` bundle

<!-- sync:commands-active -->
## Active (safe to route)

### Domain `badges`

<!-- sync:command-card:badges-generate -->
#### `badges generate`
- Status: `active`
- Plugin: `@atls/yarn-plugin-badges`
- Class: `BadgesCommand`
- Purpose: Generate badge assets or badge-related output for the repository.
- When to use: Use when you need to refresh project badges after metadata or status changes.
- Example: `yarn badges generate`
- Tags: `badges`
- Source: `yarn/plugin-badges/sources/badges.command.ts`

### Domain `changelog`

<!-- sync:command-card:changelog-generate -->
#### `changelog generate`
- Status: `active`
- Plugin: `@atls/yarn-plugin-changelog`
- Class: `ChangelogGenerateCommand`
- Purpose: Generate a changelog entry or changelog content from project changes.
- When to use: Use before releasing when you need an updated changelog for recent work.
- Example: `yarn changelog generate`
- Tags: `changelog`
- Source: `yarn/plugin-changelog/sources/changelog-generate.command.ts`

### Domain `check`

<!-- sync:command-card:check -->
#### `check`
- Status: `active`
- Plugin: `@atls/yarn-plugin-check`
- Class: `CheckCommand`
- Purpose: Run the repository's general validation checks.
- When to use: Use to quickly verify that the workspace is in a healthy state.
- Example: `yarn check`
- Tags: `check`
- Source: `yarn/plugin-check/sources/check.command.ts`

### Domain `checks`

<!-- sync:command-card:checks-lint -->
#### `checks lint`
- Status: `active`
- Plugin: `@atls/yarn-plugin-checks`
- Class: `ChecksLintCommand`
- Purpose: Run lint checks as part of the checks suite.
- When to use: Use when you want to validate code style and lint rules for the project.
- Example: `yarn checks lint`
- Tags: `checks`
- Source: `yarn/plugin-checks/sources/checks-lint.command.tsx`

<!-- sync:command-card:checks-release -->
#### `checks release`
- Status: `active`
- Plugin: `@atls/yarn-plugin-checks`
- Class: `ChecksReleaseCommand`
- Purpose: Run release-related checks before publishing or tagging.
- When to use: Use to confirm release readiness and catch release-blocking issues early.
- Example: `yarn checks release`
- Tags: `checks`
- Source: `yarn/plugin-checks/sources/checks-release.command.ts`

<!-- sync:command-card:checks-run -->
#### `checks run`
- Status: `active`
- Plugin: `@atls/yarn-plugin-checks`
- Class: `ChecksRunCommand`
- Purpose: Run the full checks pipeline for the repository.
- When to use: Use when you need a broad pre-merge or pre-release verification pass.
- Example: `yarn checks run`
- Tags: `checks`
- Source: `yarn/plugin-checks/sources/checks-run.command.ts`

<!-- sync:command-card:checks-test-integration -->
#### `checks test integration`
- Status: `active`
- Plugin: `@atls/yarn-plugin-checks`
- Class: `ChecksTestIntegrationCommand`
- Purpose: Run integration tests for the project.
- When to use: Use when you need to validate interactions between modules, services, or external dependencies.
- Example: `yarn checks test integration`
- Tags: `checks`
- Source: `yarn/plugin-checks/sources/checks-test-integration.command.ts`

<!-- sync:command-card:checks-test-unit -->
#### `checks test unit`
- Status: `active`
- Plugin: `@atls/yarn-plugin-checks`
- Class: `ChecksTestUnitCommand`
- Purpose: Run unit tests for the project.
- When to use: Use when you want to verify isolated functions, components, or modules.
- Example: `yarn checks test unit`
- Tags: `checks`
- Source: `yarn/plugin-checks/sources/checks-test-unit.command.ts`

<!-- sync:command-card:checks-typecheck -->
#### `checks typecheck`
- Status: `active`
- Plugin: `@atls/yarn-plugin-checks`
- Class: `ChecksTypeCheckCommand`
- Purpose: Run TypeScript type checking.
- When to use: Use when you need to catch type errors without running the full test suite.
- Example: `yarn checks typecheck`
- Tags: `checks`
- Source: `yarn/plugin-checks/sources/checks-typecheck.command.tsx`

### Domain `commit`

<!-- sync:command-card:commit-message -->
#### `commit message`
- Status: `active`
- Plugin: `@atls/yarn-plugin-commit`
- Class: `CommitMessageCommand`
- Purpose: Create or assist with generating a commit message.
- When to use: Use when you want a commit message based on the current staged changes.
- Example: `yarn commit message`
- Tags: `commit`
- Source: `yarn/plugin-commit/sources/commit-message.command.tsx`

<!-- sync:command-card:commit-message-lint -->
#### `commit message lint`
- Status: `active`
- Plugin: `@atls/yarn-plugin-commit`
- Class: `CommitMessageLintCommand`
- Purpose: Validate commit message format and conventions.
- When to use: Use before committing or in CI to ensure commit messages follow project rules.
- Example: `yarn commit message lint`
- Tags: `commit`
- Source: `yarn/plugin-commit/sources/commit-message-lint.command.ts`

<!-- sync:command-card:commit-staged -->
#### `commit staged`
- Status: `active`
- Plugin: `@atls/yarn-plugin-commit`
- Class: `CommitStagedCommand`
- Purpose: Commit the currently staged changes.
- When to use: Use after staging files when you are ready to create a commit.
- Example: `yarn commit staged`
- Tags: `commit`
- Source: `yarn/plugin-commit/sources/commit-staged.command.ts`

### Domain `essentials`

<!-- sync:command-card:set-version-atls -->
#### `set version atls`
- Status: `active`
- Plugin: `@atls/yarn-plugin-essentials`
- Class: `SetVersionCommand`
- Purpose: Set or update the ATLS project version.
- When to use: Use when preparing a version bump for the repository or package set.
- Example: `yarn set version atls`
- Tags: `essentials`
- Source: `yarn/plugin-essentials/sources/commands/set-version.command.ts`

### Domain `export`

<!-- sync:command-card:export -->
#### `export`
- Status: `active`
- Plugin: `@atls/yarn-plugin-export`
- Class: `WorkspaceExportCommand`
- Purpose: Export workspace or package artifacts for downstream use.
- When to use: Use when you need to produce distributable output from a workspace.
- Example: `yarn export`
- Tags: `export`
- Source: `yarn/plugin-export/sources/commands/workspace-export.command.ts`

### Domain `files`

<!-- sync:command-card:files-changed-list -->
#### `files changed list`
- Status: `active`
- Plugin: `@atls/yarn-plugin-files`
- Class: `FilesChangedListCommand`
- Purpose: List files changed in the repository or workspace.
- When to use: Use when you need to inspect the scope of recent changes.
- Example: `yarn files changed list`
- Tags: `files`
- Source: `yarn/plugin-files/sources/files-changed-list.command.ts`

### Domain `format`

<!-- sync:command-card:format -->
#### `format`
- Status: `active`
- Plugin: `@atls/yarn-plugin-format`
- Class: `FormatCommand`
- Purpose: Format source files according to project formatting rules.
- When to use: Use before committing to keep code style consistent.
- Example: `yarn format`
- Tags: `format`
- Source: `yarn/plugin-format/sources/format.command.tsx`

### Domain `image`

<!-- sync:command-card:image-pack -->
#### `image pack`
- Status: `active`
- Plugin: `@atls/yarn-plugin-image`
- Class: `ImagePackCommand`
- Purpose: Pack or bundle image assets for the project.
- When to use: Use when image assets need to be prepared for distribution or deployment.
- Example: `yarn image pack`
- Tags: `image`
- Source: `yarn/plugin-image/sources/image-pack.command.ts`

### Domain `jsr`

<!-- sync:command-card:jsr-publish -->
#### `jsr publish`
- Status: `active`
- Plugin: `@atls/yarn-plugin-jsr`
- Class: `JsrPublishCommand`
- Purpose: Publish a package to JSR.
- When to use: Use when the package is ready to be released to the JSR registry.
- Example: `yarn jsr publish`
- Tags: `jsr`
- Source: `yarn/plugin-jsr/sources/jsr-publish.command.ts`

### Domain `library`

<!-- sync:command-card:library-build -->
#### `library build`
- Status: `active`
- Plugin: `@atls/yarn-plugin-library`
- Class: `LibraryBuildCommand`
- Purpose: Build the library package or library artifacts.
- When to use: Use when preparing a library for testing, packaging, or release.
- Example: `yarn library build`
- Tags: `library`
- Source: `yarn/plugin-library/sources/library-build.command.tsx`

### Domain `lint`

<!-- sync:command-card:lint -->
#### `lint`
- Status: `active`
- Plugin: `@atls/yarn-plugin-lint`
- Class: `LintCommand`
- Purpose: Run the project's linting workflow.
- When to use: Use to detect code quality and style issues across the codebase.
- Example: `yarn lint`
- Tags: `lint`
- Source: `yarn/plugin-lint/sources/lint.command.tsx`

### Domain `release`

<!-- sync:command-card:release-create -->
#### `release create`
- Status: `active`
- Plugin: `@atls/yarn-plugin-release`
- Class: `ReleaseCreateCommand`
- Purpose: Create a new release for the project.
- When to use: Use when all checks are complete and you are ready to publish a release.
- Example: `yarn release create`
- Tags: `release`
- Source: `yarn/plugin-release/sources/release-create.command.ts`

### Domain `renderer`

<!-- sync:command-card:renderer-build -->
#### `renderer build`
- Status: `active`
- Plugin: `@atls/yarn-plugin-renderer`
- Class: `RendererBuildCommand`
- Purpose: Build the renderer application or renderer assets.
- When to use: Use when preparing the renderer for deployment or packaging.
- Example: `yarn renderer build`
- Tags: `renderer`
- Source: `yarn/plugin-renderer/sources/commands/renderer-build.command.ts`

<!-- sync:command-card:renderer-dev -->
#### `renderer dev`
- Status: `active`
- Plugin: `@atls/yarn-plugin-renderer`
- Class: `RendererDevCommand`
- Purpose: Start the renderer in development mode.
- When to use: Use during active development when you need a live-running renderer.
- Example: `yarn renderer dev`
- Tags: `renderer`
- Source: `yarn/plugin-renderer/sources/commands/renderer-dev.command.ts`

### Domain `service`

<!-- sync:command-card:service-build -->
#### `service build`
- Status: `active`
- Plugin: `@atls/yarn-plugin-service`
- Class: `ServiceBuildCommand`
- Purpose: Build the service application or service artifacts.
- When to use: Use when preparing a service for deployment, testing, or packaging.
- Example: `yarn service build`
- Tags: `service`
- Source: `yarn/plugin-service/sources/service-build.command.tsx`

<!-- sync:command-card:service-dev -->
#### `service dev`
- Status: `active`
- Plugin: `@atls/yarn-plugin-service`
- Class: `ServiceDevCommand`
- Purpose: Start the service in development mode with live iteration support.
- When to use: Use when you need to run the service locally while actively developing or debugging it.
- Example: `yarn service dev`
- Tags: `development`, `service`
- Source: `yarn/plugin-service/sources/service-dev.command.tsx`

### Domain `test`

<!-- sync:command-card:test -->
#### `test`
- Status: `active`
- Plugin: `@atls/yarn-plugin-test`
- Class: `TestCommand`
- Purpose: Run the default test suite for the project.
- When to use: Use for a general verification pass before committing or after changes that may affect behavior.
- Example: `yarn test`
- Tags: `quality`, `test`
- Source: `yarn/plugin-test/sources/test.command.ts`

<!-- sync:command-card:test-integration -->
#### `test integration`
- Status: `active`
- Plugin: `@atls/yarn-plugin-test`
- Class: `TestIntegrationCommand`
- Purpose: Run integration tests that verify interactions between components or external dependencies.
- When to use: Use when you need to validate end-to-end flows, API contracts, or multi-module behavior.
- Example: `yarn test integration`
- Tags: `integration`, `test`
- Source: `yarn/plugin-test/sources/test-integration.command.ts`

<!-- sync:command-card:test-unit -->
#### `test unit`
- Status: `active`
- Plugin: `@atls/yarn-plugin-test`
- Class: `TestUnitCommand`
- Purpose: Run unit tests for isolated functions, modules, or classes.
- When to use: Use when you want fast feedback on small code changes or to verify logic in isolation.
- Example: `yarn test unit`
- Tags: `test`, `unit`
- Source: `yarn/plugin-test/sources/test-unit.command.ts`

### Domain `tools`

<!-- sync:command-card:tools-sync -->
#### `tools sync`
- Status: `active`
- Plugin: `@atls/yarn-plugin-tools`
- Class: `ToolsSyncCommand`
- Purpose: Synchronize project raijin configuration and related generated files.
- When to use: Use after updating shared raijin settings or when generated tool configs may be out of date.
- Example: `yarn tools sync`
- Tags: `sync`, `tools`
- Source: `yarn/plugin-tools/sources/commands/sync/tools-sync.command.ts`

<!-- sync:command-card:tools-sync-tsconfig -->
#### `tools sync tsconfig`
- Status: `active`
- Plugin: `@atls/yarn-plugin-tools`
- Class: `ToolsSyncTSConfigCommand`
- Purpose: Synchronize TypeScript configuration files such as tsconfig variants.
- When to use: Use when TypeScript project settings change and tsconfig files need to be regenerated or aligned.
- Example: `yarn tools sync tsconfig`
- Tags: `sync`, `tools`, `tsconfig`, `typescript`
- Source: `yarn/plugin-tools/sources/commands/sync/tools-sync-tsconfig.command.ts`

<!-- sync:command-card:tools-sync-typescript -->
#### `tools sync typescript`
- Status: `active`
- Plugin: `@atls/yarn-plugin-tools`
- Class: `ToolsSyncTypeScriptCommand`
- Purpose: Synchronize TypeScript-related raijin and generated setup.
- When to use: Use after changes to TypeScript infrastructure, templates, or shared compiler-related settings.
- Example: `yarn tools sync typescript`
- Tags: `sync`, `tools`, `typescript`
- Source: `yarn/plugin-tools/sources/commands/sync/tools-sync-typescript.command.ts`

### Domain `typescript`

<!-- sync:command-card:typecheck -->
#### `typecheck`
- Status: `active`
- Plugin: `@atls/yarn-plugin-typescript`
- Class: `TypeCheckCommand`
- Purpose: Run TypeScript type checking without producing build artifacts.
- When to use: Use to catch typing issues during development or in CI before build and release steps.
- Example: `yarn typecheck`
- Tags: `quality`, `typescript`
- Source: `yarn/plugin-typescript/sources/typecheck.command.tsx`

### Domain `ui`

<!-- sync:command-card:ui-icons-generate -->
#### `ui icons generate`
- Status: `active`
- Plugin: `@atls/yarn-plugin-ui`
- Class: `UiIconsGenerateCommand`
- Purpose: Generate UI icon assets or icon-related source files.
- When to use: Use when icon sources change or when you need to refresh generated icon outputs.
- Example: `yarn ui icons generate`
- Tags: `generate`, `icons`, `ui`
- Source: `yarn/plugin-ui/sources/commands/ui-icons-generate.command.tsx`

### Domain `workspaces`

<!-- sync:command-card:workspaces-changed-foreach -->
#### `workspaces changed foreach`
- Status: `active`
- Plugin: `@atls/yarn-plugin-workspaces`
- Class: `WorkspacesChangedForeachCommand`
- Purpose: Run a command across workspaces that have changed.
- When to use: Use to target only affected workspaces for checks, builds, or other repeated operations.
- Example: `yarn workspaces changed foreach`
- Tags: `changed`, `foreach`, `workspaces`
- Source: `yarn/plugin-workspaces/sources/workspaces-changed-foreach.command.ts`

<!-- sync:command-card:workspaces-changed-list -->
#### `workspaces changed list`
- Status: `active`
- Plugin: `@atls/yarn-plugin-workspaces`
- Class: `WorkspacesChangedListCommand`
- Purpose: List workspaces that have changed.
- When to use: Use when you need to inspect which packages are affected before running scoped workspace commands.
- Example: `yarn workspaces changed list`
- Tags: `changed`, `list`, `workspaces`
- Source: `yarn/plugin-workspaces/sources/workspaces-changed-list.command.ts`

<!-- sync:commands-inactive -->
## Inactive (do not route)

### Domain `schematics`

<!-- sync:command-card:generate-project -->
#### `generate project`
- Status: `inactive`
- Plugin: `@atls/yarn-plugin-schematics`
- Class: `GenerateProjectCommand`
- Purpose: Generate a new project from schematics templates.
- When to use: Use when scaffolding a new project structure from predefined templates.
- Example: `yarn generate project`
- Tags: `schematics`
- Source: `yarn/plugin-schematics/sources/commands/generate-project.command.tsx`
- Routing: do not use (plugin is in bundle but not exported from plugin index)

