# Raijin Packages

Сгруппированные карточки workspace-пакетов

## Public package contract

Публичная поверхность Raijin публикуется как npm-пакет:

- `@atls/raijin` — `packages/raijin`

## Internal workspace map

<!-- sync:packages-groups -->

## Group `raijin`

Публичный пакет Raijin и его initializer

<details>
<summary>Подробности группы `raijin`</summary>

<!-- sync:package-card:atls-raijin -->

#### `@atls/raijin`

- Локация: `packages/raijin`
- Группа: `raijin`
- Видимость: `public`
- Описание: Public Raijin initializer and runtime package
- Скрипты: `build`, `build:library`, `build:project-generation`, `postpack`, `prepack`

</details>

## Group `plugins`

Приватные пакеты плагинов и их точки входа

<details>
<summary>Подробности группы `plugins`</summary>

<!-- sync:package-card:atls-yarn-plugin-check -->

#### `@atls/yarn-plugin-check`

- Локация: `packages/plugins/check`
- Группа: `plugins`
- Видимость: `private`
- Описание: Project verification and affected-workspace checks
- Скрипты: `build`

<!-- sync:package-card:atls-yarn-plugin-commit -->

#### `@atls/yarn-plugin-commit`

- Локация: `packages/plugins/commit`
- Группа: `plugins`
- Видимость: `private`
- Описание: Commit messages and staged-file verification
- Скрипты: `build`

<!-- sync:package-card:atls-yarn-plugin-essentials -->

#### `@atls/yarn-plugin-essentials`

- Локация: `packages/plugins/essentials`
- Группа: `plugins`
- Видимость: `private`
- Описание: Raijin runtime version command
- Скрипты: `build`

<!-- sync:package-card:atls-yarn-plugin-format -->

#### `@atls/yarn-plugin-format`

- Локация: `packages/plugins/format`
- Группа: `plugins`
- Видимость: `private`
- Описание: Project-aware formatting through Prettier
- Скрипты: `build`

<!-- sync:package-card:atls-yarn-plugin-generate -->

#### `@atls/yarn-plugin-generate`

- Локация: `packages/plugins/generate`
- Группа: `plugins`
- Видимость: `private`
- Описание: Project scaffolding commands
- Скрипты: `build`

<!-- sync:package-card:atls-yarn-plugin-image -->

#### `@atls/yarn-plugin-image`

- Локация: `packages/plugins/image`
- Группа: `plugins`
- Видимость: `private`
- Описание: Project-root container builds through Cloud Native Buildpacks
- Скрипты: `build`

<!-- sync:package-card:atls-yarn-plugin-library -->

#### `@atls/yarn-plugin-library`

- Локация: `packages/plugins/library`
- Группа: `plugins`
- Видимость: `private`
- Описание: Library builds and package artifact preparation
- Скрипты: `build`

<!-- sync:package-card:atls-yarn-plugin-lint -->

#### `@atls/yarn-plugin-lint`

- Локация: `packages/plugins/lint`
- Группа: `plugins`
- Видимость: `private`
- Описание: Project-aware linting through ESLint
- Скрипты: `build`

<!-- sync:package-card:atls-yarn-plugin-renderer -->

#### `@atls/yarn-plugin-renderer`

- Локация: `packages/plugins/renderer`
- Группа: `plugins`
- Видимость: `private`
- Описание: Native Next.js build, development and start commands
- Скрипты: `build`

<!-- sync:package-card:atls-yarn-plugin-service -->

#### `@atls/yarn-plugin-service`

- Локация: `packages/plugins/service`
- Группа: `plugins`
- Видимость: `private`
- Описание: Node.js application build, development and start commands
- Скрипты: `build`

<!-- sync:package-card:atls-yarn-plugin-test -->

#### `@atls/yarn-plugin-test`

- Локация: `packages/plugins/test`
- Группа: `plugins`
- Видимость: `private`
- Описание: Project test discovery and Node.js test execution
- Скрипты: `build`

<!-- sync:package-card:atls-yarn-plugin-tools -->

#### `@atls/yarn-plugin-tools`

- Локация: `packages/plugins/tools`
- Группа: `plugins`
- Видимость: `private`
- Описание: Yarn environment and repository hook integration
- Скрипты: `build`

<!-- sync:package-card:atls-yarn-plugin-typescript -->

#### `@atls/yarn-plugin-typescript`

- Локация: `packages/plugins/typescript`
- Группа: `plugins`
- Видимость: `private`
- Описание: Project-aware TypeScript verification
- Скрипты: `build`

</details>

## Group `assembly`

Прочая группа workspace-пакетов

<details>
<summary>Подробности группы `assembly`</summary>

<!-- sync:package-card:atls-raijin-assembly -->

#### `@atls/raijin-assembly`

- Скрипты: `build`, `build:bundle`, `build:clean`, `build:dist`, `build:dynamic-require`, `build:materialize`
- Локация: `packages/assembly`

</details>

## Group `cli-ui`

Прочая группа workspace-пакетов

<details>
<summary>Подробности группы `cli-ui`</summary>

<!-- sync:package-card:atls-cli-ui -->

#### `@atls/cli-ui`

- Скрипты: `build`
- Локация: `packages/cli-ui`

</details>
