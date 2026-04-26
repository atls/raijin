# Raijin Packages

Grouped cards for workspace packages

<!-- sync:packages-groups -->

## Group `yarn`

Custom Yarn CLI, plugin, and bundle infrastructure packages

Compact list:

- `@atls/yarn-cli` — Private Yarn CLI implementation for repository automation and release workflows.
- `@atls/yarn-cli-tools` — Supporting tools and helpers used by the internal Yarn CLI.
- `@atls/yarn-pack-utils` — Utilities for packaging, packing, and publish preparation in Yarn workflows.
- `@atls/yarn-plugin-badges` — Yarn plugin for generating and managing repository badges.
- `@atls/yarn-plugin-changelog` — Yarn plugin for changelog generation and release notes workflows.
- `@atls/yarn-plugin-check` — Yarn plugin for repository checks and validation commands.
- `@atls/yarn-plugin-checks` — Extended checks plugin for multiple validation routines in Yarn.
- `@atls/yarn-plugin-cli-publish` — Yarn plugin for CLI-driven publishing and release automation.
- `@atls/yarn-plugin-commit` — Yarn plugin for commit-related automation and conventions.
- `@atls/yarn-plugin-essentials` — Core Yarn plugin with essential shared functionality.
- `@atls/yarn-plugin-export` — Yarn plugin for exporting project artifacts or metadata.
- `@atls/yarn-plugin-files` — Yarn plugin for file handling and file-based workflows.
- `@atls/yarn-plugin-format` — Yarn plugin for formatting code and project files.
- `@atls/yarn-plugin-image` — Yarn plugin for image-related processing and assets.
- `@atls/yarn-plugin-jsr` — Yarn plugin for JSR publishing or integration workflows.
- `@atls/yarn-plugin-library` — Yarn plugin for library-oriented project workflows.
- `@atls/yarn-plugin-lint` — Yarn plugin for linting and code quality checks.
- `@atls/yarn-plugin-pnp-patch` — Yarn plugin for patching Plug'n'Play behavior and related loaders.
- `@atls/yarn-plugin-release` — Yarn plugin for release automation and publishing workflows.
- `@atls/yarn-plugin-renderer` — Yarn plugin for rendering output such as templates or reports.
- `@atls/yarn-plugin-schematics` — Yarn plugin for schematics and project scaffolding.
- `@atls/yarn-plugin-service` — Yarn plugin for service-oriented raijin and orchestration.
- `@atls/yarn-plugin-test` — Yarn plugin for testing workflows and test automation.
- `@atls/yarn-plugin-tools` — Yarn plugin for shared developer tools and utilities.
- `@atls/yarn-plugin-typescript` — Yarn plugin for TypeScript-specific build and integration support.
- `@atls/yarn-plugin-ui` — Yarn plugin for UI-related workflows and interface raijin.
- `@atls/yarn-plugin-workspaces` — Yarn plugin for workspace management and monorepo coordination.
- `@atls/yarn-run-utils` — Utility package for running commands and process helpers in Yarn workflows.
- `@atls/yarn-test-utils` — Utility package for testing helpers and test setup in Yarn projects.
- `@atls/yarn-workspace-utils` — Utility package for workspace and monorepo helper functions.

<details>
<summary>Group details: `yarn`</summary>

<!-- sync:package-card:atls-yarn-cli -->

#### `@atls/yarn-cli`

- Location: `yarn/cli`
- Group: `yarn`
- Visibility: `private`
- Purpose: Private Yarn CLI implementation for repository automation and release workflows.
- When to use: Use when extending internal CLI commands for build, fix, version, or release tasks.
- Example: `Add a command that bumps package versions and updates changelogs.`
- Tags: `yarn`
- Scripts: `build`, `build:bundle`, `build:clean`, `build:dist`, `build:fix`, `build:schemaic`, `build:version`, `fix`, `postpack`, `prepack`
- Dependencies: deps 54, devDeps 0, peerDeps 0

<!-- sync:package-card:atls-yarn-cli-tools -->

#### `@atls/yarn-cli-tools`

- Location: `yarn/cli-tools`
- Group: `yarn`
- Visibility: `private`
- Purpose: Supporting tools and helpers used by the internal Yarn CLI.
- When to use: Use when implementing shared utilities for CLI commands and automation.
- Example: `Create a helper for parsing CLI flags and workspace paths.`
- Tags: `yarn`
- Scripts: none
- Dependencies: deps 53, devDeps 0, peerDeps 0

<!-- sync:package-card:atls-yarn-pack-utils -->

#### `@atls/yarn-pack-utils`

- Location: `yarn/pack-utils`
- Group: `yarn`
- Visibility: `private`
- Purpose: Utilities for packaging, packing, and publish preparation in Yarn workflows.
- When to use: Use when you need reusable logic for package archives or publish checks.
- Example: `Build a utility that verifies files included in a package tarball.`
- Tags: `yarn`
- Scripts: none
- Dependencies: deps 1, devDeps 7, peerDeps 0

<!-- sync:package-card:atls-yarn-plugin-badges -->

#### `@atls/yarn-plugin-badges`

- Location: `yarn/plugin-badges`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for generating and managing repository badges.
- When to use: Use when automating badge creation or badge metadata updates.
- Example: `Generate README badges for build status and package version.`
- Tags: `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 1, devDeps 5, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-changelog -->

#### `@atls/yarn-plugin-changelog`

- Location: `yarn/plugin-changelog`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for changelog generation and release notes workflows.
- When to use: Use when automating changelog updates during releases.
- Example: `Create release notes from merged commits.`
- Tags: `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 2, devDeps 3, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-check -->

#### `@atls/yarn-plugin-check`

- Location: `yarn/plugin-check`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for repository checks and validation commands.
- When to use: Use when adding commands that validate workspace health or policy compliance.
- Example: `Run a check that ensures package manifests are consistent.`
- Tags: `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 0, devDeps 3, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-checks -->

#### `@atls/yarn-plugin-checks`

- Location: `yarn/plugin-checks`
- Group: `yarn`
- Visibility: `private`
- Purpose: Extended checks plugin for multiple validation routines in Yarn.
- When to use: Use when you need a bundle of validation commands for CI or local verification.
- Example: `Execute a suite of workspace integrity checks.`
- Tags: `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 15, devDeps 10, peerDeps 3

<!-- sync:package-card:atls-yarn-plugin-cli-publish -->

#### `@atls/yarn-plugin-cli-publish`

- Location: `yarn/plugin-cli-publish`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for CLI-driven publishing and release automation.
- When to use: Use when publishing packages should be controlled from internal CLI commands.
- Example: `Publish a package to the registry with a single command.`
- Tags: `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 0, devDeps 5, peerDeps 3

<!-- sync:package-card:atls-yarn-plugin-commit -->

#### `@atls/yarn-plugin-commit`

- Location: `yarn/plugin-commit`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for commit-related automation and conventions.
- When to use: Use when you need commit workflow helpers inside the Yarn plugin ecosystem.
- Example: `Build the commit plugin before packaging it for distribution.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 10, devDeps 6, peerDeps 3

<!-- sync:package-card:atls-yarn-plugin-essentials -->

#### `@atls/yarn-plugin-essentials`

- Location: `yarn/plugin-essentials`
- Group: `yarn`
- Visibility: `private`
- Purpose: Core Yarn plugin with essential shared functionality.
- When to use: Use for common capabilities reused by other Yarn plugins.
- Example: `Include essentials as a dependency for multiple plugin features.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 2, devDeps 4, peerDeps 3

<!-- sync:package-card:atls-yarn-plugin-export -->

#### `@atls/yarn-plugin-export`

- Location: `yarn/plugin-export`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for exporting project artifacts or metadata.
- When to use: Use when a plugin needs to export generated files or structured output.
- Example: `Export workspace configuration into a consumable format.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 2, devDeps 5, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-files -->

#### `@atls/yarn-plugin-files`

- Location: `yarn/plugin-files`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for file handling and file-based workflows.
- When to use: Use when a plugin needs to read, write, copy, or transform files.
- Example: `Generate files during build and package them afterward.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 3, devDeps 3, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-format -->

#### `@atls/yarn-plugin-format`

- Location: `yarn/plugin-format`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for formatting code and project files.
- When to use: Use when you need formatting rules or formatting automation in the workspace.
- Example: `Run formatting checks before publishing the plugin.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 8, devDeps 6, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-image -->

#### `@atls/yarn-plugin-image`

- Location: `yarn/plugin-image`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for image-related processing and assets.
- When to use: Use when a plugin works with image assets, optimization, or generation.
- Example: `Process image assets as part of the build pipeline.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 6, devDeps 5, peerDeps 3

<!-- sync:package-card:atls-yarn-plugin-jsr -->

#### `@atls/yarn-plugin-jsr`

- Location: `yarn/plugin-jsr`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for JSR publishing or integration workflows.
- When to use: Use when you need to prepare packages for JSR-compatible distribution.
- Example: `Build and package a plugin for JSR release.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 2, devDeps 4, peerDeps 3

<!-- sync:package-card:atls-yarn-plugin-library -->

#### `@atls/yarn-plugin-library`

- Location: `yarn/plugin-library`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for library-oriented project workflows.
- When to use: Use when the workspace provides reusable library raijin or conventions.
- Example: `Use the library plugin to standardize package structure.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 11, devDeps 6, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-lint -->

#### `@atls/yarn-plugin-lint`

- Location: `yarn/plugin-lint`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for linting and code quality checks.
- When to use: Use when you need lint rules, lint commands, or quality gates.
- Example: `Run lint before building and publishing the plugin.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 9, devDeps 7, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-pnp-patch -->

#### `@atls/yarn-plugin-pnp-patch`

- Location: `yarn/plugin-pnp-patch`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for patching Plug'n'Play behavior and related loaders.
- When to use: Use when you need custom PnP fixes, loader builds, or Yarn download support.
- Example: `Build the source and loader variants before packaging the PnP patch plugin.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `build:loader`, `build:source`, `postpack`, `prepack`, `yarn:download`
- Dependencies: deps 5, devDeps 6, peerDeps 0

<!-- sync:package-card:atls-yarn-plugin-release -->

#### `@atls/yarn-plugin-release`

- Location: `yarn/plugin-release`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for release automation and publishing workflows.
- When to use: Use when you need versioning, changelog, or release orchestration.
- Example: `Prepare a release plugin to automate publishing steps.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 3, devDeps 3, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-renderer -->

#### `@atls/yarn-plugin-renderer`

- Location: `yarn/plugin-renderer`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for rendering output such as templates or reports.
- When to use: Use when a plugin needs to render structured content into final output.
- Example: `Render documentation assets during the build.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 3, devDeps 8, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-schematics -->

#### `@atls/yarn-plugin-schematics`

- Location: `yarn/plugin-schematics`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for schematics and project scaffolding.
- When to use: Use when you need generators for new files, modules, or project setups.
- Example: `Generate a new workspace scaffold with the schematics plugin.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 9, devDeps 9, peerDeps 5

<!-- sync:package-card:atls-yarn-plugin-service -->

#### `@atls/yarn-plugin-service`

- Location: `yarn/plugin-service`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for service-oriented raijin and orchestration.
- When to use: Use when a plugin coordinates service lifecycle or service utilities.
- Example: `Start service helpers as part of a workspace command.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 11, devDeps 7, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-test -->

#### `@atls/yarn-plugin-test`

- Location: `yarn/plugin-test`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for testing workflows and test automation.
- When to use: Use when you need test commands, test setup, or test orchestration.
- Example: `Run plugin tests before packaging and release.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 11, devDeps 8, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-tools -->

#### `@atls/yarn-plugin-tools`

- Location: `yarn/plugin-tools`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for shared developer tools and utilities.
- When to use: Use when a plugin bundles reusable raijin for other workspaces.
- Example: `Reuse tools helpers across multiple Yarn plugins.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 6, devDeps 5, peerDeps 0

<!-- sync:package-card:atls-yarn-plugin-typescript -->

#### `@atls/yarn-plugin-typescript`

- Location: `yarn/plugin-typescript`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for TypeScript-specific build and integration support.
- When to use: Use when you need TypeScript compilation, typing, or TS-aware raijin.
- Example: `Compile TypeScript sources before publishing the plugin.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 11, devDeps 7, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-ui -->

#### `@atls/yarn-plugin-ui`

- Location: `yarn/plugin-ui`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for UI-related workflows and interface raijin.
- When to use: Use when a plugin supports UI generation, components, or interface assets.
- Example: `Build UI assets as part of the plugin release process.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 8, devDeps 7, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-workspaces -->

#### `@atls/yarn-plugin-workspaces`

- Location: `yarn/plugin-workspaces`
- Group: `yarn`
- Visibility: `private`
- Purpose: Yarn plugin for workspace management and monorepo coordination.
- When to use: Use when you need workspace discovery, orchestration, or monorepo helpers.
- Example: `Use workspace utilities to coordinate builds across packages.`
- Tags: `plugin`, `yarn`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 3, devDeps 4, peerDeps 2

<!-- sync:package-card:atls-yarn-run-utils -->

#### `@atls/yarn-run-utils`

- Location: `yarn/run-utils`
- Group: `yarn`
- Visibility: `private`
- Purpose: Utility package for running commands and process helpers in Yarn workflows.
- When to use: Use when scripts or plugins need shared execution helpers.
- Example: `Use run utilities to execute a build command consistently.`
- Tags: `utils`, `yarn`
- Scripts: none
- Dependencies: deps 1, devDeps 0, peerDeps 0

<!-- sync:package-card:atls-yarn-test-utils -->

#### `@atls/yarn-test-utils`

- Location: `yarn/test-utils`
- Group: `yarn`
- Visibility: `private`
- Purpose: Utility package for testing helpers and test setup in Yarn projects.
- When to use: Use when tests need shared fixtures, mocks, or setup helpers.
- Example: `Import test utilities to simplify plugin unit tests.`
- Tags: `utils`, `yarn`
- Scripts: none
- Dependencies: deps 3, devDeps 0, peerDeps 0

<!-- sync:package-card:atls-yarn-workspace-utils -->

#### `@atls/yarn-workspace-utils`

- Location: `yarn/workspace-utils`
- Group: `yarn`
- Visibility: `private`
- Purpose: Utility package for workspace and monorepo helper functions.
- When to use: Use when packages need shared logic for workspace paths, metadata, or orchestration.
- Example: `Use workspace utilities to resolve package locations.`
- Tags: `utils`, `yarn`
- Scripts: none
- Dependencies: deps 0, devDeps 1, peerDeps 0

</details>

## Group `code`

Core code libraries for build, checks, and utilities

Compact list:

- `@atls/code-changelog` — Provides utilities for generating and managing changelogs.
- `@atls/code-commit` — Handles commit-related code workflows and conventions.
- `@atls/code-configuration` — Manages code configuration loading, validation, and defaults.
- `@atls/code-format` — Supports code formatting operations and formatting rules.
- `@atls/code-github` — GitHub-related code utilities and integrations used across packages.
- `@atls/code-icons` — Shared icon assets and icon-related code for the platform.
- `@atls/code-jsr` — Code for JSR publishing and JSR-compatible package workflows.
- `@atls/code-lint` — Linting utilities, rules, and shared validation logic.
- `@atls/code-pack` — Packaging helpers for building and preparing distributable artifacts.
- `@atls/code-schematics` — Schematics and generators for scaffolding projects and libraries.
- `@atls/code-service` — Service-layer code and shared runtime service abstractions.
- `@atls/code-test` — Testing utilities, workers, and shared test infrastructure.
- `@atls/code-typescript` — TypeScript-specific helpers, build support, and shared TS raijin.

<details>
<summary>Group details: `code`</summary>

<!-- sync:package-card:atls-code-changelog -->

#### `@atls/code-changelog`

- Location: `code/code-changelog`
- Group: `code`
- Visibility: `public`
- Purpose: Provides utilities for generating and managing changelogs.
- When to use: Use when release notes or change history need to be produced automatically.
- Example: `Generate a changelog from recent commits.`
- Tags: `code`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 2, devDeps 1, peerDeps 0

<!-- sync:package-card:atls-code-commit -->

#### `@atls/code-commit`

- Location: `code/code-commit`
- Group: `code`
- Visibility: `public`
- Purpose: Handles commit-related code workflows and conventions.
- When to use: Use when a tool needs to create, validate, or format commit data.
- Example: `Build a commit message from a release task.`
- Tags: `code`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 10, devDeps 2, peerDeps 0

<!-- sync:package-card:atls-code-configuration -->

#### `@atls/code-configuration`

- Location: `code/code-configuration`
- Group: `code`
- Visibility: `public`
- Purpose: Manages code configuration loading, validation, and defaults.
- When to use: Use when an app needs to read or validate project configuration.
- Example: `Load workspace settings from a config file.`
- Tags: `code`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 1, devDeps 1, peerDeps 0

<!-- sync:package-card:atls-code-format -->

#### `@atls/code-format`

- Location: `code/code-format`
- Group: `code`
- Visibility: `public`
- Purpose: Supports code formatting operations and formatting rules.
- When to use: Use when code must be formatted consistently across a project.
- Example: `Format source files before committing changes.`
- Tags: `code`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 5, devDeps 1, peerDeps 0

<!-- sync:package-card:atls-code-github -->

#### `@atls/code-github`

- Location: `code/code-github`
- Group: `code`
- Visibility: `public`
- Purpose: GitHub-related code utilities and integrations used across packages.
- When to use: Use when you need GitHub API helpers, repository metadata handling, or GitHub-focused raijin.
- Example: `Add a helper for generating GitHub release links.`
- Tags: `code`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 2, devDeps 1, peerDeps 1

<!-- sync:package-card:atls-code-icons -->

#### `@atls/code-icons`

- Location: `code/code-icons`
- Group: `code`
- Visibility: `public`
- Purpose: Shared icon assets and icon-related code for the platform.
- When to use: Use when building or exporting reusable icons for UI packages.
- Example: `Publish a new SVG icon set for application menus.`
- Tags: `code`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 7, devDeps 4, peerDeps 0

<!-- sync:package-card:atls-code-jsr -->

#### `@atls/code-jsr`

- Location: `code/code-jsr`
- Group: `code`
- Visibility: `public`
- Purpose: Code for JSR publishing and JSR-compatible package workflows.
- When to use: Use when preparing packages or raijin for JSR distribution.
- Example: `Generate JSR package metadata from source files.`
- Tags: `code`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 1, devDeps 0, peerDeps 0

<!-- sync:package-card:atls-code-lint -->

#### `@atls/code-lint`

- Location: `code/code-lint`
- Group: `code`
- Visibility: `public`
- Purpose: Linting utilities, rules, and shared validation logic.
- When to use: Use when creating reusable lint rules or lint-related helpers.
- Example: `Implement a custom rule for import ordering.`
- Tags: `code`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 3, devDeps 1, peerDeps 2

<!-- sync:package-card:atls-code-pack -->

#### `@atls/code-pack`

- Location: `code/code-pack`
- Group: `code`
- Visibility: `public`
- Purpose: Packaging helpers for building and preparing distributable artifacts.
- When to use: Use when you need shared logic for pack, publish, or artifact preparation.
- Example: `Create a helper that assembles package tarball contents.`
- Tags: `code`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 4, devDeps 1, peerDeps 0

<!-- sync:package-card:atls-code-schematics -->

#### `@atls/code-schematics`

- Location: `code/code-schematics`
- Group: `code`
- Visibility: `public`
- Purpose: Schematics and generators for scaffolding projects and libraries.
- When to use: Use when building templates, generators, or schematic factories.
- Example: `Add a schematic that scaffolds a new workspace package.`
- Tags: `code`
- Scripts: `build`, `build:library`, `build:schematic-factory`, `postpack`, `prepack`
- Dependencies: deps 3, devDeps 8, peerDeps 2

<!-- sync:package-card:atls-code-service -->

#### `@atls/code-service`

- Location: `code/code-service`
- Group: `code`
- Visibility: `public`
- Purpose: Service-layer code and shared runtime service abstractions.
- When to use: Use when implementing reusable services, adapters, or service contracts.
- Example: `Define a service for fetching remote configuration.`
- Tags: `code`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 7, devDeps 5, peerDeps 0

<!-- sync:package-card:atls-code-test -->

#### `@atls/code-test`

- Location: `code/code-test`
- Group: `code`
- Visibility: `public`
- Purpose: Testing utilities, workers, and shared test infrastructure.
- When to use: Use when creating helpers for unit, integration, or worker-based tests.
- Example: `Provide a worker that runs browser-like test scenarios.`
- Tags: `code`
- Scripts: `build`, `build:worker`, `postpack`, `prepack`
- Dependencies: deps 3, devDeps 1, peerDeps 0

<!-- sync:package-card:atls-code-typescript -->

#### `@atls/code-typescript`

- Location: `code/code-typescript`
- Group: `code`
- Visibility: `public`
- Purpose: TypeScript-specific helpers, build support, and shared TS raijin.
- When to use: Use when you need shared TypeScript configuration, transforms, or worker raijin.
- Example: `Add a worker that validates tsconfig compatibility.`
- Tags: `code`
- Scripts: `build`, `build:worker`, `postpack`, `prepack`
- Dependencies: deps 2, devDeps 2, peerDeps 0

</details>

## Group `config`

Configuration packages and shared presets

Compact list:

- `@atls/config-commitlint` — Shared Commitlint configuration for commit message validation.
- `@atls/config-eslint` — Shared ESLint configuration and presets.
- `@atls/config-prettier` — Shared Prettier configuration for formatting consistency.
- `@atls/config-typescript` — Shared TypeScript configuration presets and compiler settings.

<details>
<summary>Group details: `config`</summary>

<!-- sync:package-card:atls-config-commitlint -->

#### `@atls/config-commitlint`

- Location: `config/commitlint`
- Group: `config`
- Visibility: `public`
- Purpose: Shared Commitlint configuration for commit message validation.
- When to use: Use when standardizing commit message rules across repositories.
- Example: `Extend the shared commitlint preset in a package.`
- Tags: `config`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 0, devDeps 1, peerDeps 0

<!-- sync:package-card:atls-config-eslint -->

#### `@atls/config-eslint`

- Location: `config/eslint`
- Group: `config`
- Visibility: `public`
- Purpose: Shared ESLint configuration and presets.
- When to use: Use when you need consistent linting rules across packages.
- Example: `Import the base ESLint config for a React package.`
- Tags: `config`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 16, devDeps 3, peerDeps 0

<!-- sync:package-card:atls-config-prettier -->

#### `@atls/config-prettier`

- Location: `config/prettier`
- Group: `config`
- Visibility: `public`
- Purpose: Shared Prettier configuration for formatting consistency.
- When to use: Use when aligning formatting rules across the monorepo.
- Example: `Apply the shared Prettier config to a new workspace.`
- Tags: `config`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 2, devDeps 1, peerDeps 0

<!-- sync:package-card:atls-config-typescript -->

#### `@atls/config-typescript`

- Location: `config/typescript`
- Group: `config`
- Visibility: `public`
- Purpose: Shared TypeScript configuration presets and compiler settings.
- When to use: Use when packages should inherit the same TS compiler options.
- Example: `Reference the base tsconfig from a library package.`
- Tags: `config`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 0, devDeps 0, peerDeps 0

</details>

## Group `runtime`

Runtime modules and execution infrastructure

Compact list:

- `@atls/code-runtime` — Runtime abstractions and shared execution-layer code.

<details>
<summary>Group details: `runtime`</summary>

<!-- sync:package-card:atls-code-runtime -->

#### `@atls/code-runtime`

- Location: `runtime/code-runtime`
- Group: `runtime`
- Visibility: `public`
- Purpose: Runtime abstractions and shared execution-layer code.
- When to use: Use when building shared runtime libraries, schematics, or execution helpers.
- Example: `Implement a runtime helper for bootstrapping services.`
- Tags: `runtime`
- Scripts: `build`, `build:library`, `build:schematic`, `postpack`, `prepack`
- Dependencies: deps 14, devDeps 3, peerDeps 0

</details>

## Group `webpack`

Webpack integrations and build adapters

Compact list:

- `@atls/webpack-proto-imports-loader` — Webpack loader for proto import handling and build-time import transformation.
- `@atls/webpack-start-server-plugin` — Webpack plugin for starting and coordinating a development server.

<details>
<summary>Group details: `webpack`</summary>

<!-- sync:package-card:atls-webpack-proto-imports-loader -->

#### `@atls/webpack-proto-imports-loader`

- Location: `webpack/webpack-proto-imports-loader`
- Group: `webpack`
- Visibility: `public`
- Purpose: Webpack loader for proto import handling and build-time import transformation.
- When to use: Use when webpack builds need custom import resolution or proto-based imports.
- Example: `Transform proto imports during bundle compilation.`
- Tags: `webpack`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 3, devDeps 9, peerDeps 0

<!-- sync:package-card:atls-webpack-start-server-plugin -->

#### `@atls/webpack-start-server-plugin`

- Location: `webpack/webpack-start-server-plugin`
- Group: `webpack`
- Visibility: `public`
- Purpose: Webpack plugin for starting and coordinating a development server.
- When to use: Use when a webpack build should automatically start or manage a server process.
- Example: `Start a local preview server after compilation.`
- Tags: `webpack`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 1, devDeps 1, peerDeps 0

</details>

## Group `prettier`

Formatting and Prettier integrations

Compact list:

- `@atls/prettier-plugin` — Custom Prettier plugin for formatting project-specific syntax or files.

<details>
<summary>Group details: `prettier`</summary>

<!-- sync:package-card:atls-prettier-plugin -->

#### `@atls/prettier-plugin`

- Location: `prettier/plugin`
- Group: `prettier`
- Visibility: `public`
- Purpose: Custom Prettier plugin for formatting project-specific syntax or files.
- When to use: Use when Prettier needs custom parsing or printing behavior.
- Example: `Format a custom config file format with the plugin.`
- Tags: `prettier`
- Scripts: `build`, `postpack`, `prepack`
- Dependencies: deps 7, devDeps 3, peerDeps 0

</details>

## Group `cli`

Compact list of CLI packages and their role

Compact list:

- `@atls/cli-ui-error-info-component` — Renders a compact error summary for CLI output.
- `@atls/cli-ui-file-link-component` — Displays a clickable or styled link to a file path in terminal UI.
- `@atls/cli-ui-file-path-component` — Formats file system paths for consistent CLI presentation.
- `@atls/cli-ui-format-progress-component` — Shows progress for formatting tasks in CLI output.
- `@atls/cli-ui-git-commit-component` — Presents git commit information in a terminal-friendly format.
- `@atls/cli-ui-icons-progress-component` — Provides icon-based progress indicators for CLI states.
- `@atls/cli-ui-line-component` — Renders a single formatted line for CLI messages.
- `@atls/cli-ui-lint-progress-component` — Displays linting progress in CLI output.
- `@atls/cli-ui-lint-result-component` — Summarizes lint results with warnings and errors.
- `@atls/cli-ui-log-record-component` — Formats a single log record for terminal display.
- `@atls/cli-ui-pretty-logs-component` — Turns raw logs into a readable, styled CLI log view.
- `@atls/cli-ui-raw-output-component` — Outputs unformatted raw text for CLI consumers.
- `@atls/cli-ui-renderer-static-component` — Renders static CLI content that does not change over time.
- `@atls/cli-ui-schematics-component` — Shows schematics or generator-related information in CLI.
- `@atls/cli-ui-service-progress-component` — Displays progress for service-related operations.
- `@atls/cli-ui-source-preview-component` — Previews source code snippets in terminal output.
- `@atls/cli-ui-stack-trace-component` — Formats stack traces for readable CLI error output.
- `@atls/cli-ui-test-failure-component` — Summarizes failed test results in CLI output.
- `@atls/cli-ui-test-progress-component` — Shows progress while tests are running.
- `@atls/cli-ui-typescript-diagnostic-component` — Displays TypeScript diagnostics in a readable CLI format.
- `@atls/cli-ui-typescript-progress-component` — Shows progress for TypeScript type-checking tasks.

<details>
<summary>Group details: `cli`</summary>

_Compact cards for this group_

<!-- sync:package-card:atls-cli-ui-error-info-component -->

#### `@atls/cli-ui-error-info-component`

- Purpose: Renders a compact error summary for CLI output.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-error-info`

<!-- sync:package-card:atls-cli-ui-file-link-component -->

#### `@atls/cli-ui-file-link-component`

- Purpose: Displays a clickable or styled link to a file path in terminal UI.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-file-link`

<!-- sync:package-card:atls-cli-ui-file-path-component -->

#### `@atls/cli-ui-file-path-component`

- Purpose: Formats file system paths for consistent CLI presentation.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-file-path`

<!-- sync:package-card:atls-cli-ui-format-progress-component -->

#### `@atls/cli-ui-format-progress-component`

- Purpose: Shows progress for formatting tasks in CLI output.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-format-progress`

<!-- sync:package-card:atls-cli-ui-git-commit-component -->

#### `@atls/cli-ui-git-commit-component`

- Purpose: Presents git commit information in a terminal-friendly format.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-git-commit`

<!-- sync:package-card:atls-cli-ui-icons-progress-component -->

#### `@atls/cli-ui-icons-progress-component`

- Purpose: Provides icon-based progress indicators for CLI states.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-icons-progress`

<!-- sync:package-card:atls-cli-ui-line-component -->

#### `@atls/cli-ui-line-component`

- Purpose: Renders a single formatted line for CLI messages.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-line`

<!-- sync:package-card:atls-cli-ui-lint-progress-component -->

#### `@atls/cli-ui-lint-progress-component`

- Purpose: Displays linting progress in CLI output.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-lint-progress`

<!-- sync:package-card:atls-cli-ui-lint-result-component -->

#### `@atls/cli-ui-lint-result-component`

- Purpose: Summarizes lint results with warnings and errors.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-lint-result`

<!-- sync:package-card:atls-cli-ui-log-record-component -->

#### `@atls/cli-ui-log-record-component`

- Purpose: Formats a single log record for terminal display.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-log-record`

<!-- sync:package-card:atls-cli-ui-pretty-logs-component -->

#### `@atls/cli-ui-pretty-logs-component`

- Purpose: Turns raw logs into a readable, styled CLI log view.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-pretty-logs`

<!-- sync:package-card:atls-cli-ui-raw-output-component -->

#### `@atls/cli-ui-raw-output-component`

- Purpose: Outputs unformatted raw text for CLI consumers.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-raw-output`

<!-- sync:package-card:atls-cli-ui-renderer-static-component -->

#### `@atls/cli-ui-renderer-static-component`

- Purpose: Renders static CLI content that does not change over time.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-render-static`

<!-- sync:package-card:atls-cli-ui-schematics-component -->

#### `@atls/cli-ui-schematics-component`

- Purpose: Shows schematics or generator-related information in CLI.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-schematics-component`

<!-- sync:package-card:atls-cli-ui-service-progress-component -->

#### `@atls/cli-ui-service-progress-component`

- Purpose: Displays progress for service-related operations.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-service-progress`

<!-- sync:package-card:atls-cli-ui-source-preview-component -->

#### `@atls/cli-ui-source-preview-component`

- Purpose: Previews source code snippets in terminal output.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-source-preview`

<!-- sync:package-card:atls-cli-ui-stack-trace-component -->

#### `@atls/cli-ui-stack-trace-component`

- Purpose: Formats stack traces for readable CLI error output.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-stack-trace`

<!-- sync:package-card:atls-cli-ui-test-failure-component -->

#### `@atls/cli-ui-test-failure-component`

- Purpose: Summarizes failed test results in CLI output.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-test-failure`

<!-- sync:package-card:atls-cli-ui-test-progress-component -->

#### `@atls/cli-ui-test-progress-component`

- Purpose: Shows progress while tests are running.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-test-progress`

<!-- sync:package-card:atls-cli-ui-typescript-diagnostic-component -->

#### `@atls/cli-ui-typescript-diagnostic-component`

- Purpose: Displays TypeScript diagnostics in a readable CLI format.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-typescript-diagnostic`

<!-- sync:package-card:atls-cli-ui-typescript-progress-component -->

#### `@atls/cli-ui-typescript-progress-component`

- Purpose: Shows progress for TypeScript type-checking tasks.
- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-types-check-progress`

</details>
