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

## Group `yarn`

Пакеты кастомного Yarn CLI, плагинов и bundle-инфраструктуры

<details>
<summary>Подробности группы `yarn`</summary>

<!-- sync:package-card:atls-raijin-assembly -->

#### `@atls/raijin-assembly`

- Локация: `yarn/cli`
- Группа: `yarn`
- Видимость: `private`
- Скрипты: `build`, `build:bundle`, `build:clean`, `build:dist`, `build:dynamic-require`, `build:materialize`

<!-- sync:package-card:atls-yarn-pack-utils -->

#### `@atls/yarn-pack-utils`

- Локация: `yarn/pack-utils`
- Группа: `yarn`
- Видимость: `private`
- Скрипты: отсутствуют

<!-- sync:package-card:atls-yarn-plugin-check -->

#### `@atls/yarn-plugin-check`

- Локация: `yarn/plugin-check`
- Группа: `yarn`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-checks -->

#### `@atls/yarn-plugin-checks`

- Локация: `yarn/plugin-checks`
- Группа: `yarn`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-essentials -->

#### `@atls/yarn-plugin-essentials`

- Локация: `yarn/plugin-essentials`
- Группа: `yarn`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-export -->

#### `@atls/yarn-plugin-export`

- Локация: `yarn/plugin-export`
- Группа: `yarn`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-files -->

#### `@atls/yarn-plugin-files`

- Локация: `yarn/plugin-files`
- Группа: `yarn`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-generate -->

#### `@atls/yarn-plugin-generate`

- Локация: `yarn/plugin-generate`
- Группа: `yarn`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-image -->

#### `@atls/yarn-plugin-image`

- Локация: `yarn/plugin-image`
- Группа: `yarn`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-release -->

#### `@atls/yarn-plugin-release`

- Локация: `yarn/plugin-release`
- Группа: `yarn`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-renderer -->

#### `@atls/yarn-plugin-renderer`

- Локация: `yarn/plugin-renderer`
- Группа: `yarn`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-tools -->

#### `@atls/yarn-plugin-tools`

- Локация: `yarn/plugin-tools`
- Группа: `yarn`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-workspaces -->

#### `@atls/yarn-plugin-workspaces`

- Локация: `yarn/plugin-workspaces`
- Группа: `yarn`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

</details>

## Group `plugins`

Приватные пакеты плагинов и их точки входа

<details>
<summary>Подробности группы `plugins`</summary>

<!-- sync:package-card:atls-yarn-plugin-commit -->

#### `@atls/yarn-plugin-commit`

- Локация: `packages/plugins/commit`
- Группа: `plugins`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-format -->

#### `@atls/yarn-plugin-format`

- Локация: `packages/plugins/format`
- Группа: `plugins`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-library -->

#### `@atls/yarn-plugin-library`

- Локация: `packages/plugins/library`
- Группа: `plugins`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-lint -->

#### `@atls/yarn-plugin-lint`

- Локация: `packages/plugins/lint`
- Группа: `plugins`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-service -->

#### `@atls/yarn-plugin-service`

- Локация: `packages/plugins/service`
- Группа: `plugins`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-test -->

#### `@atls/yarn-plugin-test`

- Локация: `packages/plugins/test`
- Группа: `plugins`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-yarn-plugin-typescript -->

#### `@atls/yarn-plugin-typescript`

- Локация: `packages/plugins/typescript`
- Группа: `plugins`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

</details>

## Group `code`

Базовые code-библиотеки для сборки, тестов и утилит

<details>
<summary>Подробности группы `code`</summary>

<!-- sync:package-card:atls-code-commit -->

#### `@atls/code-commit`

- Локация: `code/code-commit`
- Группа: `code`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-code-format -->

#### `@atls/code-format`

- Локация: `code/code-format`
- Группа: `code`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-code-github -->

#### `@atls/code-github`

- Локация: `code/code-github`
- Группа: `code`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-code-lint -->

#### `@atls/code-lint`

- Локация: `code/code-lint`
- Группа: `code`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

<!-- sync:package-card:atls-code-pack -->

#### `@atls/code-pack`

- Локация: `code/code-pack`
- Группа: `code`
- Видимость: `private`
- Скрипты: `build`, `postpack`, `prepack`

</details>

## Group `cli`

Пакеты представления командного интерфейса

<details>
<summary>Подробности группы `cli`</summary>

<!-- sync:package-card:atls-cli-ui-git-commit-component -->

#### `@atls/cli-ui-git-commit-component`

- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-git-commit`

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
