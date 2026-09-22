# Raijin Packages

Grouped cards for workspace packages

## Public package contract

Raijin public surface is published as npm package:

- `@atls/raijin` — `packages/raijin`

## Internal workspace map

<!-- sync:packages-groups -->

## Group `raijin`

Public Raijin package and initializer

<details>
<summary>Group details: `raijin`</summary>

<!-- sync:package-card:atls-raijin -->

#### `@atls/raijin`

- Location: `packages/raijin`
- Group: `raijin`
- Visibility: `public`
- Description: Public Raijin initializer and runtime package
- Scripts: `build`, `build:library`, `build:project-generation`, `postpack`, `prepack`

</details>

## Group `plugins`

Private plugin packages and their entrypoints

<details>
<summary>Group details: `plugins`</summary>

<!-- sync:package-card:atls-yarn-plugin-check -->

#### `@atls/yarn-plugin-check`

- Location: `packages/plugins/check`
- Group: `plugins`
- Visibility: `private`
- Description: Project verification and affected-workspace checks
- Scripts: `build`

<!-- sync:package-card:atls-yarn-plugin-commit -->

#### `@atls/yarn-plugin-commit`

- Location: `packages/plugins/commit`
- Group: `plugins`
- Visibility: `private`
- Description: Commit messages and staged-file verification
- Scripts: `build`

<!-- sync:package-card:atls-yarn-plugin-essentials -->

#### `@atls/yarn-plugin-essentials`

- Location: `packages/plugins/essentials`
- Group: `plugins`
- Visibility: `private`
- Description: Raijin runtime version command
- Scripts: `build`

<!-- sync:package-card:atls-yarn-plugin-format -->

#### `@atls/yarn-plugin-format`

- Location: `packages/plugins/format`
- Group: `plugins`
- Visibility: `private`
- Description: Project-aware formatting through Prettier
- Scripts: `build`

<!-- sync:package-card:atls-yarn-plugin-generate -->

#### `@atls/yarn-plugin-generate`

- Location: `packages/plugins/generate`
- Group: `plugins`
- Visibility: `private`
- Description: Project scaffolding commands
- Scripts: `build`

<!-- sync:package-card:atls-yarn-plugin-image -->

#### `@atls/yarn-plugin-image`

- Location: `packages/plugins/image`
- Group: `plugins`
- Visibility: `private`
- Description: Project-root container builds through Cloud Native Buildpacks
- Scripts: `build`

<!-- sync:package-card:atls-yarn-plugin-library -->

#### `@atls/yarn-plugin-library`

- Location: `packages/plugins/library`
- Group: `plugins`
- Visibility: `private`
- Description: Library builds and package artifact preparation
- Scripts: `build`

<!-- sync:package-card:atls-yarn-plugin-lint -->

#### `@atls/yarn-plugin-lint`

- Location: `packages/plugins/lint`
- Group: `plugins`
- Visibility: `private`
- Description: Project-aware linting through ESLint
- Scripts: `build`

<!-- sync:package-card:atls-yarn-plugin-renderer -->

#### `@atls/yarn-plugin-renderer`

- Location: `packages/plugins/renderer`
- Group: `plugins`
- Visibility: `private`
- Description: Native Next.js build, development and start commands
- Scripts: `build`

<!-- sync:package-card:atls-yarn-plugin-service -->

#### `@atls/yarn-plugin-service`

- Location: `packages/plugins/service`
- Group: `plugins`
- Visibility: `private`
- Description: Node.js application build, development and start commands
- Scripts: `build`

<!-- sync:package-card:atls-yarn-plugin-test -->

#### `@atls/yarn-plugin-test`

- Location: `packages/plugins/test`
- Group: `plugins`
- Visibility: `private`
- Description: Project test discovery and Node.js test execution
- Scripts: `build`

<!-- sync:package-card:atls-yarn-plugin-tools -->

#### `@atls/yarn-plugin-tools`

- Location: `packages/plugins/tools`
- Group: `plugins`
- Visibility: `private`
- Description: Yarn environment and repository hook integration
- Scripts: `build`

<!-- sync:package-card:atls-yarn-plugin-typescript -->

#### `@atls/yarn-plugin-typescript`

- Location: `packages/plugins/typescript`
- Group: `plugins`
- Visibility: `private`
- Description: Project-aware TypeScript verification
- Scripts: `build`

</details>

## Group `assembly`

Other workspace packages

<details>
<summary>Group details: `assembly`</summary>

<!-- sync:package-card:atls-raijin-assembly -->

#### `@atls/raijin-assembly`

- Scripts: `build`, `build:bundle`, `build:clean`, `build:dist`, `build:dynamic-require`, `build:materialize`
- Location: `packages/assembly`

</details>

## Group `cli-ui`

Other workspace packages

<details>
<summary>Group details: `cli-ui`</summary>

<!-- sync:package-card:atls-cli-ui -->

#### `@atls/cli-ui`

- Scripts: `build`
- Location: `packages/cli-ui`

</details>
