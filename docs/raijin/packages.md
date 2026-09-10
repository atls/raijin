# Raijin Packages

Grouped cards for workspace packages

## Public package contract

Raijin public surface is published as npm package:

- `@atls/raijin` — `yarn/raijin`

## Internal workspace map

<!-- sync:packages-groups -->

## Group `yarn`

Custom Yarn CLI, plugin, and bundle infrastructure packages

<details>
<summary>Group details: `yarn`</summary>

<!-- sync:package-card:atls-raijin -->

#### `@atls/raijin`

- Location: `yarn/raijin`
- Group: `yarn`
- Visibility: `public`
- Description: Public Raijin initializer and runtime package
- Scripts: `build`, `build:library`, `build:project-generation`, `postpack`, `prepack`

<!-- sync:package-card:atls-raijin-assembly -->

#### `@atls/raijin-assembly`

- Location: `yarn/cli`
- Group: `yarn`
- Visibility: `private`
- Scripts: `build`, `build:bundle`, `build:clean`, `build:dist`, `build:dynamic-require`, `build:materialize`

<!-- sync:package-card:atls-yarn-pack-utils -->

#### `@atls/yarn-pack-utils`

- Location: `yarn/pack-utils`
- Group: `yarn`
- Visibility: `private`
- Scripts: none

<!-- sync:package-card:atls-yarn-plugin-check -->

#### `@atls/yarn-plugin-check`

- Location: `yarn/plugin-check`
- Group: `yarn`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-checks -->

#### `@atls/yarn-plugin-checks`

- Location: `yarn/plugin-checks`
- Group: `yarn`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-essentials -->

#### `@atls/yarn-plugin-essentials`

- Location: `yarn/plugin-essentials`
- Group: `yarn`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-export -->

#### `@atls/yarn-plugin-export`

- Location: `yarn/plugin-export`
- Group: `yarn`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-files -->

#### `@atls/yarn-plugin-files`

- Location: `yarn/plugin-files`
- Group: `yarn`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-generate -->

#### `@atls/yarn-plugin-generate`

- Location: `yarn/plugin-generate`
- Group: `yarn`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-image -->

#### `@atls/yarn-plugin-image`

- Location: `yarn/plugin-image`
- Group: `yarn`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-library -->

#### `@atls/yarn-plugin-library`

- Location: `yarn/plugin-library`
- Group: `yarn`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-release -->

#### `@atls/yarn-plugin-release`

- Location: `yarn/plugin-release`
- Group: `yarn`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-renderer -->

#### `@atls/yarn-plugin-renderer`

- Location: `yarn/plugin-renderer`
- Group: `yarn`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-tools -->

#### `@atls/yarn-plugin-tools`

- Location: `yarn/plugin-tools`
- Group: `yarn`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-workspaces -->

#### `@atls/yarn-plugin-workspaces`

- Location: `yarn/plugin-workspaces`
- Group: `yarn`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

</details>

## Group `plugins`

Private plugin packages and their entrypoints

<details>
<summary>Group details: `plugins`</summary>

<!-- sync:package-card:atls-yarn-plugin-commit -->

#### `@atls/yarn-plugin-commit`

- Location: `packages/plugins/commit`
- Group: `plugins`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-format -->

#### `@atls/yarn-plugin-format`

- Location: `packages/plugins/format`
- Group: `plugins`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-lint -->

#### `@atls/yarn-plugin-lint`

- Location: `packages/plugins/lint`
- Group: `plugins`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-service -->

#### `@atls/yarn-plugin-service`

- Location: `packages/plugins/service`
- Group: `plugins`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-test -->

#### `@atls/yarn-plugin-test`

- Location: `packages/plugins/test`
- Group: `plugins`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-typescript -->

#### `@atls/yarn-plugin-typescript`

- Location: `packages/plugins/typescript`
- Group: `plugins`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

</details>

## Group `code`

Core code libraries for build, checks, and utilities

<details>
<summary>Group details: `code`</summary>

<!-- sync:package-card:atls-code-commit -->

#### `@atls/code-commit`

- Location: `code/code-commit`
- Group: `code`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-code-format -->

#### `@atls/code-format`

- Location: `code/code-format`
- Group: `code`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-code-github -->

#### `@atls/code-github`

- Location: `code/code-github`
- Group: `code`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-code-lint -->

#### `@atls/code-lint`

- Location: `code/code-lint`
- Group: `code`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-code-pack -->

#### `@atls/code-pack`

- Location: `code/code-pack`
- Group: `code`
- Visibility: `private`
- Scripts: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-code-typescript -->

#### `@atls/code-typescript`

- Location: `code/code-typescript`
- Group: `code`
- Visibility: `private`
- Scripts: `build`, `build:worker`, `postpack`, `prepack`

</details>

## Group `cli`

Command-line interface presentation packages

<details>
<summary>Group details: `cli`</summary>

<!-- sync:package-card:atls-cli-ui-git-commit-component -->

#### `@atls/cli-ui-git-commit-component`

- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-git-commit`

<!-- sync:package-card:atls-cli-ui-typescript-progress-component -->

#### `@atls/cli-ui-typescript-progress-component`

- Scripts: `build`, `postpack`, `prepack`
- Location: `cli/cli-ui-types-check-progress`

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
