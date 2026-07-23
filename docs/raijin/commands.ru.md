# Raijin Commands

Карта команд из `yarn/plugin-*` и bundle `@atls/yarn-cli`

<!-- sync:commands-active -->

## Active (можно маршрутизировать)

### Домен `badges`

- Команды: `badges generate`

<details>
<summary>Подробности домена `badges`</summary>

<!-- sync:command-card:badges-generate -->

#### `badges generate`

- Статус: `active`
- Пример: `yarn badges generate`
- Плагин: `@atls/yarn-plugin-badges`
- Исходник: `yarn/plugin-badges/sources/badges.command.ts`

</details>

### Домен `check`

- Команды: `check`

<details>
<summary>Подробности домена `check`</summary>

<!-- sync:command-card:check -->

#### `check`

- Статус: `active`
- Пример: `yarn check`
- Пример: `yarn check yarn/plugin-check/sources`
- Плагин: `@atls/yarn-plugin-check`
- Исходник: `yarn/plugin-check/sources/check.command.ts`

</details>

### Домен `checks`

- Команды: `checks lint`, `checks release`, `checks run`, `checks test integration`, `checks test unit`, `checks typecheck`

<details>
<summary>Подробности домена `checks`</summary>

> Важно: `checks` рассчитан на запуск в раннерах GitHub Actions, требует `GITHUB_TOKEN` и контекст проверки (`context.repo`, `GITHUB_SHA`)

<!-- sync:command-card:checks-lint -->

#### `checks lint`

- Статус: `active`
- Пример: `yarn checks lint`
- Плагин: `@atls/yarn-plugin-checks`
- Исходник: `yarn/plugin-checks/sources/checks-lint.command.tsx`

<!-- sync:command-card:checks-release -->

#### `checks release`

- Статус: `active`
- Пример: `yarn checks release`
- Плагин: `@atls/yarn-plugin-checks`
- Исходник: `yarn/plugin-checks/sources/checks-release.command.ts`

<!-- sync:command-card:checks-run -->

#### `checks run`

- Статус: `active`
- Пример: `yarn checks run`
- Плагин: `@atls/yarn-plugin-checks`
- Исходник: `yarn/plugin-checks/sources/checks-run.command.ts`

<!-- sync:command-card:checks-test-integration -->

#### `checks test integration`

- Статус: `active`
- Пример: `yarn checks test integration`
- Плагин: `@atls/yarn-plugin-checks`
- Исходник: `yarn/plugin-checks/sources/checks-test-integration.command.ts`

<!-- sync:command-card:checks-test-unit -->

#### `checks test unit`

- Статус: `active`
- Пример: `yarn checks test unit`
- Плагин: `@atls/yarn-plugin-checks`
- Исходник: `yarn/plugin-checks/sources/checks-test-unit.command.ts`

<!-- sync:command-card:checks-typecheck -->

#### `checks typecheck`

- Статус: `active`
- Пример: `yarn checks typecheck`
- Плагин: `@atls/yarn-plugin-checks`
- Исходник: `yarn/plugin-checks/sources/checks-typecheck.command.tsx`

</details>

### Домен `commit`

- Команды: `commit message`, `commit message lint`, `commit staged`

<details>
<summary>Подробности домена `commit`</summary>

<!-- sync:command-card:commit-message -->

#### `commit message`

- Статус: `active`
- Пример: `yarn commit message`
- Плагин: `@atls/yarn-plugin-commit`
- Исходник: `yarn/plugin-commit/sources/commit-message.command.tsx`

<!-- sync:command-card:commit-message-lint -->

#### `commit message lint`

- Статус: `active`
- Пример: `yarn commit message lint`
- Плагин: `@atls/yarn-plugin-commit`
- Исходник: `yarn/plugin-commit/sources/commit-message-lint.command.ts`

<!-- sync:command-card:commit-staged -->

#### `commit staged`

- Статус: `active`
- Пример: `yarn commit staged`
- Плагин: `@atls/yarn-plugin-commit`
- Исходник: `yarn/plugin-commit/sources/commit-staged.command.ts`

</details>

### Домен `essentials`

- Команды: `set version atls`

<details>
<summary>Подробности домена `essentials`</summary>

<!-- sync:command-card:set-version-atls -->

#### `set version atls`

- Статус: `active`
- Пример: `yarn set version atls`
- Плагин: `@atls/yarn-plugin-essentials`
- Исходник: `yarn/plugin-essentials/sources/commands/set-version.command.ts`

</details>

### Домен `export`

- Команды: `export`

<details>
<summary>Подробности домена `export`</summary>

<!-- sync:command-card:export -->

#### `export`

- Статус: `active`
- Пример: `yarn export`
- Плагин: `@atls/yarn-plugin-export`
- Исходник: `yarn/plugin-export/sources/commands/workspace-export.command.ts`

</details>

### Домен `files`

- Команды: `files changed list`

<details>
<summary>Подробности домена `files`</summary>

<!-- sync:command-card:files-changed-list -->

#### `files changed list`

- Статус: `active`
- Пример: `yarn files changed list`
- Плагин: `@atls/yarn-plugin-files`
- Исходник: `yarn/plugin-files/sources/files-changed-list.command.ts`

</details>

### Домен `format`

- Команды: `format`

<details>
<summary>Подробности домена `format`</summary>

<!-- sync:command-card:format -->

#### `format`

- Статус: `active`
- Пример: `yarn format`
- Плагин: `@atls/yarn-plugin-format`
- Исходник: `yarn/plugin-format/sources/format.command.tsx`

</details>

### Домен `image`

- Команды: `image pack`

<details>
<summary>Подробности домена `image`</summary>

<!-- sync:command-card:image-pack -->

#### `image pack`

- Статус: `active`
- Пример: `yarn image pack`
- Контракт: `packConfiguration` по умолчанию использует `ghcr.io/atls/buildpack-yarn-workspace:24`.
- Контракт: `packConfiguration.builderTag` выбирает поддерживаемый Node/buildpack-канал.
- Контракт: `packConfiguration.buildpackVersion` фиксирует неизменяемый buildpack tag для rollback.
- Контракт: `packConfiguration.buildpack` переопределяет полную buildpack-ссылку.
- Контракт: `--tags <alias,...>` добавляет дополнительные image tags в тот же вызов `pack build`.
- Плагин: `@atls/yarn-plugin-image`
- Исходник: `yarn/plugin-image/sources/image-pack.command.ts`

</details>

### Домен `library`

- Команды: `library build`

<details>
<summary>Подробности домена `library`</summary>

<!-- sync:command-card:library-build -->

#### `library build`

- Статус: `active`
- Пример: `yarn library build`
- Плагин: `@atls/yarn-plugin-library`
- Исходник: `yarn/plugin-library/sources/library-build.command.tsx`

</details>

### Домен `lint`

- Команды: `lint`

<details>
<summary>Подробности домена `lint`</summary>

<!-- sync:command-card:lint -->

#### `lint`

- Статус: `active`
- Пример: `yarn lint`
- Плагин: `@atls/yarn-plugin-lint`
- Исходник: `yarn/plugin-lint/sources/lint.command.tsx`

</details>

### Домен `raijin`

- Команды: `raijin sync`, `raijin sync tsconfig`, `raijin sync typescript`

<details>
<summary>Подробности домена `raijin`</summary>

<!-- sync:command-card:raijin-sync -->

#### `raijin sync`

- Статус: `active`
- Пример: `yarn raijin sync`
- Плагин: `@atls/yarn-plugin-tools`
- Исходник: `yarn/plugin-tools/sources/commands/sync/sync.command.ts`

<!-- sync:command-card:raijin-sync-tsconfig -->

#### `raijin sync tsconfig`

- Статус: `active`
- Пример: `yarn raijin sync tsconfig`
- Плагин: `@atls/yarn-plugin-tools`
- Исходник: `yarn/plugin-tools/sources/commands/sync/tsconfig.command.ts`

<!-- sync:command-card:raijin-sync-typescript -->

#### `raijin sync typescript`

- Статус: `active`
- Пример: `yarn raijin sync typescript`
- Плагин: `@atls/yarn-plugin-tools`
- Исходник: `yarn/plugin-tools/sources/commands/sync/typescript.command.ts`

</details>

### Домен `release`

- Команды: `release create`, `release version apply`, `release version defer`

<details>
<summary>Подробности домена `release`</summary>

<!-- sync:command-card:release-create -->

#### `release create`

- Статус: `active`
- Пример: `yarn release create`
- Плагин: `@atls/yarn-plugin-release`
- Исходник: `yarn/plugin-release/sources/release-create.command.ts`

<!-- sync:command-card:release-version-apply -->

#### `release version apply`

- Статус: `active`
- Пример: `yarn release version apply`
- Плагин: `@atls/yarn-plugin-release`
- Исходник: `yarn/plugin-release/sources/release-version-apply.command.ts`

<!-- sync:command-card:release-version-defer -->

#### `release version defer`

- Статус: `active`
- Пример: `yarn release version defer`
- Плагин: `@atls/yarn-plugin-release`
- Исходник: `yarn/plugin-release/sources/release-version-defer.command.ts`

</details>

### Домен `renderer`

- Команды: `renderer build`, `renderer dev`, `renderer start`

<details>
<summary>Подробности домена `renderer`</summary>

<!-- sync:command-card:renderer-build -->

#### `renderer build`

- Статус: `active`
- Пример: `yarn renderer build`
- Плагин: `@atls/yarn-plugin-renderer`
- Исходник: `yarn/plugin-renderer/sources/commands/renderer-build.command.ts`

<!-- sync:command-card:renderer-dev -->

#### `renderer dev`

- Статус: `active`
- Пример: `yarn renderer dev`
- Плагин: `@atls/yarn-plugin-renderer`
- Исходник: `yarn/plugin-renderer/sources/commands/renderer-dev.command.ts`

<!-- sync:command-card:renderer-start -->

#### `renderer start`

- Статус: `active`
- Пример: `yarn renderer start`
- Плагин: `@atls/yarn-plugin-renderer`
- Исходник: `yarn/plugin-renderer/sources/commands/renderer-start.command.ts`

</details>

### Домен `service`

- Команды: `service build`, `service dev`, `service start`

<details>
<summary>Подробности домена `service`</summary>

<!-- sync:command-card:service-build -->

#### `service build`

- Статус: `active`
- Пример: `yarn service build`
- Плагин: `@atls/yarn-plugin-service`
- Исходник: `yarn/plugin-service/sources/service-build.command.tsx`

<!-- sync:command-card:service-dev -->

#### `service dev`

- Статус: `active`
- Пример: `yarn service dev`
- Плагин: `@atls/yarn-plugin-service`
- Исходник: `yarn/plugin-service/sources/service-dev.command.tsx`

<!-- sync:command-card:service-start -->

#### `service start`

- Статус: `active`
- Пример: `yarn service start`
- Плагин: `@atls/yarn-plugin-service`
- Исходник: `yarn/plugin-service/sources/service-start.command.ts`

</details>

### Домен `test`

- Команды: `test`, `test integration`, `test unit`

<details>
<summary>Подробности домена `test`</summary>

<!-- sync:command-card:test -->

#### `test`

- Статус: `active`
- Пример: `yarn test`
- Плагин: `@atls/yarn-plugin-test`
- Исходник: `yarn/plugin-test/sources/test.command.ts`

<!-- sync:command-card:test-integration -->

#### `test integration`

- Статус: `active`
- Пример: `yarn test integration`
- Плагин: `@atls/yarn-plugin-test`
- Исходник: `yarn/plugin-test/sources/test-integration.command.ts`

<!-- sync:command-card:test-unit -->

#### `test unit`

- Статус: `active`
- Пример: `yarn test unit`
- Плагин: `@atls/yarn-plugin-test`
- Исходник: `yarn/plugin-test/sources/test-unit.command.ts`

</details>

### Домен `typescript`

- Команды: `typecheck`

<details>
<summary>Подробности домена `typescript`</summary>

<!-- sync:command-card:typecheck -->

#### `typecheck`

- Статус: `active`
- Пример: `yarn typecheck`
- Плагин: `@atls/yarn-plugin-typescript`
- Исходник: `yarn/plugin-typescript/sources/typecheck.command.tsx`

</details>

### Домен `ui`

- Команды: `ui icons generate`

<details>
<summary>Подробности домена `ui`</summary>

<!-- sync:command-card:ui-icons-generate -->

#### `ui icons generate`

- Статус: `active`
- Пример: `yarn ui icons generate`
- Плагин: `@atls/yarn-plugin-ui`
- Исходник: `yarn/plugin-ui/sources/commands/ui-icons-generate.command.tsx`

</details>

### Домен `workspaces`

- Команды: `workspaces changed foreach`, `workspaces changed list`

<details>
<summary>Подробности домена `workspaces`</summary>

<!-- sync:command-card:workspaces-changed-foreach -->

#### `workspaces changed foreach`

- Статус: `active`
- Пример: `yarn workspaces changed foreach`
- Плагин: `@atls/yarn-plugin-workspaces`
- Исходник: `yarn/plugin-workspaces/sources/workspaces-changed-foreach.command.ts`

<!-- sync:command-card:workspaces-changed-list -->

#### `workspaces changed list`

- Статус: `active`
- Пример: `yarn workspaces changed list`
- Плагин: `@atls/yarn-plugin-workspaces`
- Исходник: `yarn/plugin-workspaces/sources/workspaces-changed-list.command.ts`

</details>

<!-- sync:commands-inactive -->

## Inactive (не маршрутизировать)

### Домен `schematics`

- Команды: `generate project`

<details>
<summary>Подробности домена `schematics`</summary>

<!-- sync:command-card:generate-project -->

#### `generate project`

- Статус: `inactive`
- Пример: недоступен для inactive-команды
- Плагин: `@atls/yarn-plugin-schematics`
- Исходник: `yarn/plugin-schematics/sources/commands/generate-project.command.tsx`
- Маршрутизация: не использовать (plugin is in bundle but not exported from plugin index)

</details>
