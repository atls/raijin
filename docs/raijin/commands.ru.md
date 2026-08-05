# Raijin Commands

Карта команд, собранная из runtime `@atls/yarn-cli`

<!-- sync:commands-active -->

## Active (можно маршрутизировать)

### Домен `badges`

- Команды: `badges generate`

<details>
<summary>Подробности домена `badges`</summary>

<!-- sync:command-card:badges-generate -->

#### `badges generate`

- Статус: `active`
- Описание: generate package badges in the project README
- Использование: `yarn badges generate`
- Пример: `yarn badges generate`
- Плагин: `@atls/yarn-plugin-badges`

</details>

### Домен `check`

- Команды: `check`

<details>
<summary>Подробности домена `check`</summary>

<!-- sync:command-card:check -->

#### `check`

- Статус: `active`
- Описание: run formatting, type checking, and linting
- Использование: `yarn check ...`
- Пример: `yarn check`
- Пример: `yarn check yarn/plugin-check/sources`
- Плагин: `@atls/yarn-plugin-check`

</details>

### Домен `checks`

- Команды: `checks lint`, `checks release`, `checks run`, `checks test integration`, `checks test unit`, `checks typecheck`

<details>
<summary>Подробности домена `checks`</summary>

> Важно: `checks` рассчитан на запуск в раннерах GitHub Actions, требует `GITHUB_TOKEN` и контекст проверки (`context.repo`, `GITHUB_SHA`)

<!-- sync:command-card:checks-lint -->

#### `checks lint`

- Статус: `active`
- Описание: report lint results to GitHub Checks
- Использование: `yarn checks lint [--changed]`
- Пример: `yarn checks lint`
- Плагин: `@atls/yarn-plugin-checks`

<!-- sync:command-card:checks-release -->

#### `checks release`

- Статус: `active`
- Описание: run the release GitHub check for changed workspaces
- Использование: `yarn checks release [--no-private]`
- Пример: `yarn checks release`
- Плагин: `@atls/yarn-plugin-checks`

<!-- sync:command-card:checks-run -->

#### `checks run`

- Статус: `active`
- Описание: run the standard GitHub check sequence
- Использование: `yarn checks run [--changed] [--no-release]`
- Пример: `yarn checks run`
- Плагин: `@atls/yarn-plugin-checks`

<!-- sync:command-card:checks-test-integration -->

#### `checks test integration`

- Статус: `active`
- Описание: report integration test results to GitHub Checks
- Использование: `yarn checks test integration`
- Пример: `yarn checks test integration`
- Плагин: `@atls/yarn-plugin-checks`

<!-- sync:command-card:checks-test-unit -->

#### `checks test unit`

- Статус: `active`
- Описание: report unit test results to GitHub Checks
- Использование: `yarn checks test unit`
- Пример: `yarn checks test unit`
- Плагин: `@atls/yarn-plugin-checks`

<!-- sync:command-card:checks-typecheck -->

#### `checks typecheck`

- Статус: `active`
- Описание: report TypeScript diagnostics to GitHub Checks
- Использование: `yarn checks typecheck [--changed]`
- Пример: `yarn checks typecheck`
- Плагин: `@atls/yarn-plugin-checks`

</details>

### Домен `commit`

- Команды: `commit message`, `commit message lint`, `commit staged`

<details>
<summary>Подробности домена `commit`</summary>

<!-- sync:command-card:commit-message -->

#### `commit message`

- Статус: `active`
- Описание: create a conventional commit message interactively
- Использование: `yarn commit message ...`
- Пример: `yarn commit message`
- Плагин: `@atls/yarn-plugin-commit`

<!-- sync:command-card:commit-message-lint -->

#### `commit message lint`

- Статус: `active`
- Описание: validate commit messages against project scopes
- Использование: `yarn commit message lint`
- Пример: `yarn commit message lint`
- Плагин: `@atls/yarn-plugin-commit`

<!-- sync:command-card:commit-staged -->

#### `commit staged`

- Статус: `active`
- Описание: run project checks for staged files
- Использование: `yarn commit staged ...`
- Пример: `yarn commit staged`
- Плагин: `@atls/yarn-plugin-commit`

</details>

### Домен `essentials`

- Команды: `set version atls`

<details>
<summary>Подробности домена `essentials`</summary>

<!-- sync:command-card:set-version-atls -->

#### `set version atls`

- Статус: `active`
- Описание: lock the Yarn version used by the project
- Использование: `yarn set version atls`
- Пример: `yarn set version atls`
- Плагин: `@atls/yarn-plugin-essentials`

</details>

### Домен `export`

- Команды: `export`

<details>
<summary>Подробности домена `export`</summary>

<!-- sync:command-card:export -->

#### `export`

- Статус: `active`
- Описание: export a workspace and its production dependencies
- Использование: `yarn export <-d,--destination #0>`
- Пример: `yarn export`
- Плагин: `@atls/yarn-plugin-export`

</details>

### Домен `files`

- Команды: `files changed list`

<details>
<summary>Подробности домена `files`</summary>

<!-- sync:command-card:files-changed-list -->

#### `files changed list`

- Статус: `active`
- Описание: list files changed since the comparison base
- Использование: `yarn files changed list [--json]`
- Пример: `yarn files changed list`
- Плагин: `@atls/yarn-plugin-files`

</details>

### Домен `format`

- Команды: `format`

<details>
<summary>Подробности домена `format`</summary>

<!-- sync:command-card:format -->

#### `format`

- Статус: `active`
- Описание: format project files
- Использование: `yarn format ...`
- Пример: `yarn format`
- Плагин: `@atls/yarn-plugin-format`

</details>

### Домен `image`

- Команды: `image pack`

<details>
<summary>Подробности домена `image`</summary>

<!-- sync:command-card:image-pack -->

#### `image pack`

- Статус: `active`
- Описание: build and optionally publish a container image
- Использование: `yarn image pack [-r,--registry #0] [-t,--tag-policy #0] [-p,--publish] [--platform #0]`
- Пример: `yarn image pack`
- Контракт: `packConfiguration` по умолчанию использует `ghcr.io/atls/buildpack-yarn-workspace:24`.
- Контракт: `packConfiguration.builderTag` выбирает поддерживаемый Node/buildpack-канал.
- Контракт: `packConfiguration.buildpackVersion` фиксирует неизменяемый buildpack tag для rollback.
- Контракт: `packConfiguration.buildpack` переопределяет полную buildpack-ссылку.
- Плагин: `@atls/yarn-plugin-image`

</details>

### Домен `library`

- Команды: `library build`

<details>
<summary>Подробности домена `library`</summary>

<!-- sync:command-card:library-build -->

#### `library build`

- Статус: `active`
- Описание: build a library workspace
- Использование: `yarn library build [-t,--target #0]`
- Пример: `yarn library build`
- Плагин: `@atls/yarn-plugin-library`

</details>

### Домен `lint`

- Команды: `lint`

<details>
<summary>Подробности домена `lint`</summary>

<!-- sync:command-card:lint -->

#### `lint`

- Статус: `active`
- Описание: lint project files
- Использование: `yarn lint [--fix] [--cache] ...`
- Пример: `yarn lint`
- Плагин: `@atls/yarn-plugin-lint`

</details>

### Домен `raijin`

- Команды: `raijin sync`, `raijin sync tsconfig`, `raijin sync typescript`

<details>
<summary>Подробности домена `raijin`</summary>

<!-- sync:command-card:raijin-sync -->

#### `raijin sync`

- Статус: `active`
- Описание: synchronize Raijin project support files
- Использование: `yarn raijin sync`
- Пример: `yarn raijin sync`
- Плагин: `@atls/yarn-plugin-tools`

<!-- sync:command-card:raijin-sync-tsconfig -->

#### `raijin sync tsconfig`

- Статус: `active`
- Описание: synchronize Raijin TypeScript configuration
- Использование: `yarn raijin sync tsconfig`
- Пример: `yarn raijin sync tsconfig`
- Плагин: `@atls/yarn-plugin-tools`

<!-- sync:command-card:raijin-sync-typescript -->

#### `raijin sync typescript`

- Статус: `active`
- Описание: synchronize the Raijin TypeScript dependency
- Использование: `yarn raijin sync typescript`
- Пример: `yarn raijin sync typescript`
- Плагин: `@atls/yarn-plugin-tools`

</details>

### Домен `release`

- Команды: `release create`, `release version apply`, `release version defer`

<details>
<summary>Подробности домена `release`</summary>

<!-- sync:command-card:release-create -->

#### `release create`

- Статус: `active`
- Описание: create and publish a project release
- Использование: `yarn release create`
- Пример: `yarn release create`
- Плагин: `@atls/yarn-plugin-release`

<!-- sync:command-card:release-version-apply -->

#### `release version apply`

- Статус: `active`
- Описание: apply deferred workspace versions
- Использование: `yarn release version apply [--workspace #0] [--github-output #0] [--since #0]`
- Пример: `yarn release version apply`
- Плагин: `@atls/yarn-plugin-release`

<!-- sync:command-card:release-version-defer -->

#### `release version defer`

- Статус: `active`
- Описание: defer version bumps for changed workspaces
- Использование: `yarn release version defer [--since #0] [--dry-run]`
- Пример: `yarn release version defer`
- Плагин: `@atls/yarn-plugin-release`

</details>

### Домен `renderer`

- Команды: `renderer build`, `renderer dev`, `renderer start`

<details>
<summary>Подробности домена `renderer`</summary>

<!-- sync:command-card:renderer-build -->

#### `renderer build`

- Статус: `active`
- Описание: build a renderer production artifact
- Использование: `yarn renderer build`
- Пример: `yarn renderer build`
- Плагин: `@atls/yarn-plugin-renderer`

<!-- sync:command-card:renderer-dev -->

#### `renderer dev`

- Статус: `active`
- Описание: run a renderer in development mode
- Использование: `yarn renderer dev [--tunnel] [--https]`
- Пример: `yarn renderer dev`
- Плагин: `@atls/yarn-plugin-renderer`

<!-- sync:command-card:renderer-start -->

#### `renderer start`

- Статус: `active`
- Описание: start a built renderer artifact
- Использование: `yarn renderer start`
- Пример: `yarn renderer start`
- Плагин: `@atls/yarn-plugin-renderer`

</details>

### Домен `schematics`

- Команды: `generate project`

<details>
<summary>Подробности домена `schematics`</summary>

<!-- sync:command-card:generate-project -->

#### `generate project`

- Статус: `active`
- Описание: generate a Raijin project scaffold
- Использование: `yarn generate project [-t,--type #0]`
- Пример: `yarn generate project`
- Плагин: `@atls/yarn-plugin-schematics`

</details>

### Домен `service`

- Команды: `service build`, `service dev`, `service start`

<details>
<summary>Подробности домена `service`</summary>

<!-- sync:command-card:service-build -->

#### `service build`

- Статус: `active`
- Описание: build a service production artifact
- Использование: `yarn service build [-w,--show-warnings]`
- Пример: `yarn service build`
- Плагин: `@atls/yarn-plugin-service`

<!-- sync:command-card:service-dev -->

#### `service dev`

- Статус: `active`
- Описание: run a service in development mode
- Использование: `yarn service dev [-w,--show-warnings]`
- Пример: `yarn service dev`
- Плагин: `@atls/yarn-plugin-service`

<!-- sync:command-card:service-start -->

#### `service start`

- Статус: `active`
- Описание: start a built service artifact
- Использование: `yarn service start`
- Пример: `yarn service start`
- Плагин: `@atls/yarn-plugin-service`

</details>

### Домен `test`

- Команды: `test`, `test integration`, `test unit`

<details>
<summary>Подробности домена `test`</summary>

<!-- sync:command-card:test -->

#### `test`

- Статус: `active`
- Описание: run all workspace tests
- Использование: `yarn test [-t,--target #0] [-w,--watch] [--test-reporter #0] ...`
- Пример: `yarn test`
- Плагин: `@atls/yarn-plugin-test`

<!-- sync:command-card:test-integration -->

#### `test integration`

- Статус: `active`
- Описание: run integration tests
- Использование: `yarn test integration [-t,--target #0] [-w,--watch] [--test-reporter #0] ...`
- Пример: `yarn test integration`
- Плагин: `@atls/yarn-plugin-test`

<!-- sync:command-card:test-unit -->

#### `test unit`

- Статус: `active`
- Описание: run unit tests
- Использование: `yarn test unit [-t,--target #0] [-w,--watch] [--test-reporter #0] ...`
- Пример: `yarn test unit`
- Плагин: `@atls/yarn-plugin-test`

</details>

### Домен `typescript`

- Команды: `typecheck`

<details>
<summary>Подробности домена `typescript`</summary>

<!-- sync:command-card:typecheck -->

#### `typecheck`

- Статус: `active`
- Описание: type-check project sources
- Использование: `yarn typecheck ...`
- Пример: `yarn typecheck`
- Плагин: `@atls/yarn-plugin-typescript`

</details>

### Домен `ui`

- Команды: `ui icons generate`

<details>
<summary>Подробности домена `ui`</summary>

<!-- sync:command-card:ui-icons-generate -->

#### `ui icons generate`

- Статус: `active`
- Описание: generate icon components from source assets
- Использование: `yarn ui icons generate [-n, --native]`
- Пример: `yarn ui icons generate`
- Плагин: `@atls/yarn-plugin-ui`

</details>

### Домен `workspaces`

- Команды: `workspaces changed foreach`, `workspaces changed list`

<details>
<summary>Подробности домена `workspaces`</summary>

<!-- sync:command-card:workspaces-changed-foreach -->

#### `workspaces changed foreach`

- Статус: `active`
- Описание: run a command in changed workspaces
- Использование: `yarn workspaces changed foreach [--exclude #0] [-v,--verbose] [-p,--parallel] [-W,--worktree] [-A,--all] [-R,--recursive] [--since #0] [-i,--interlaced] [--no-private] [-t,--topological] [--topological-dev] [-j,--jobs #0] <commandName> ...`
- Пример: `yarn workspaces changed foreach`
- Плагин: `@atls/yarn-plugin-workspaces`

<!-- sync:command-card:workspaces-changed-list -->

#### `workspaces changed list`

- Статус: `active`
- Описание: list changed workspaces
- Использование: `yarn workspaces changed list [--json]`
- Пример: `yarn workspaces changed list`
- Плагин: `@atls/yarn-plugin-workspaces`

</details>
