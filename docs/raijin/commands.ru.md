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
- Назначение: Сгенерировать бейджи или связанные с ними артефакты для репозитория.
- Когда использовать: Используйте, когда нужно обновить бейджи проекта после изменения метаданных или статуса.
- Пример: `yarn badges generate`
- Плагин: `@atls/yarn-plugin-badges`
- Исходник: `yarn/plugin-badges/sources/badges.command.ts`

</details>

### Домен `changelog`

- Команды: `changelog generate`

<details>
<summary>Подробности домена `changelog`</summary>

<!-- sync:command-card:changelog-generate -->

#### `changelog generate`

- Статус: `active`
- Назначение: Сгенерировать запись или содержимое changelog на основе изменений в проекте.
- Когда использовать: Используйте перед релизом, когда нужен обновленный changelog по последним изменениям.
- Пример: `yarn changelog generate`
- Плагин: `@atls/yarn-plugin-changelog`
- Исходник: `yarn/plugin-changelog/sources/changelog-generate.command.ts`

</details>

### Домен `check`

- Команды: `check`

<details>
<summary>Подробности домена `check`</summary>

<!-- sync:command-card:check -->

#### `check`

- Статус: `active`
- Назначение: Запустить общие проверки валидации репозитория.
- Когда использовать: Используйте для быстрой проверки, что рабочее пространство в корректном состоянии.
- Пример: `yarn check`
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
- Назначение: Запустить lint-проверки в составе набора checks.
- Когда использовать: Используйте, когда нужно проверить стиль кода и lint-правила проекта.
- Пример: `yarn checks lint`
- Плагин: `@atls/yarn-plugin-checks`
- Исходник: `yarn/plugin-checks/sources/checks-lint.command.tsx`

<!-- sync:command-card:checks-release -->

#### `checks release`

- Статус: `active`
- Назначение: Запустить проверки, связанные с релизом, перед публикацией или созданием тега.
- Когда использовать: Используйте, чтобы подтвердить готовность релиза и заранее найти блокирующие проблемы.
- Пример: `yarn checks release`
- Плагин: `@atls/yarn-plugin-checks`
- Исходник: `yarn/plugin-checks/sources/checks-release.command.ts`

<!-- sync:command-card:checks-run -->

#### `checks run`

- Статус: `active`
- Назначение: Запустить полный пайплайн checks для репозитория.
- Когда использовать: Используйте, когда нужна широкая проверка перед merge или релизом.
- Пример: `yarn checks run`
- Плагин: `@atls/yarn-plugin-checks`
- Исходник: `yarn/plugin-checks/sources/checks-run.command.ts`

<!-- sync:command-card:checks-test-integration -->

#### `checks test integration`

- Статус: `active`
- Назначение: Запустить интеграционные тесты проекта.
- Когда использовать: Используйте для проверки взаимодействия модулей, сервисов или внешних зависимостей.
- Пример: `yarn checks test integration`
- Плагин: `@atls/yarn-plugin-checks`
- Исходник: `yarn/plugin-checks/sources/checks-test-integration.command.ts`

<!-- sync:command-card:checks-test-unit -->

#### `checks test unit`

- Статус: `active`
- Назначение: Запустить модульные тесты проекта.
- Когда использовать: Используйте для проверки отдельных функций, компонентов или модулей.
- Пример: `yarn checks test unit`
- Плагин: `@atls/yarn-plugin-checks`
- Исходник: `yarn/plugin-checks/sources/checks-test-unit.command.ts`

<!-- sync:command-card:checks-typecheck -->

#### `checks typecheck`

- Статус: `active`
- Назначение: Запустить проверку типов TypeScript.
- Когда использовать: Используйте, когда нужно найти ошибки типов без запуска полного набора тестов.
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
- Назначение: Создать или помочь с генерацией сообщения коммита.
- Когда использовать: Используйте, когда нужно сообщение коммита на основе текущих staged-изменений.
- Пример: `yarn commit message`
- Плагин: `@atls/yarn-plugin-commit`
- Исходник: `yarn/plugin-commit/sources/commit-message.command.tsx`

<!-- sync:command-card:commit-message-lint -->

#### `commit message lint`

- Статус: `active`
- Назначение: Проверить формат и соглашения сообщения коммита.
- Когда использовать: Используйте перед коммитом или в CI, чтобы убедиться, что сообщения соответствуют правилам проекта.
- Пример: `yarn commit message lint`
- Плагин: `@atls/yarn-plugin-commit`
- Исходник: `yarn/plugin-commit/sources/commit-message-lint.command.ts`

<!-- sync:command-card:commit-staged -->

#### `commit staged`

- Статус: `active`
- Назначение: Закоммитить текущие staged-изменения.
- Когда использовать: Используйте после подготовки файлов, когда готовы создать коммит.
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
- Назначение: Установить или обновить версию ATLS-проекта.
- Когда использовать: Используйте при подготовке повышения версии репозитория или набора пакетов.
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
- Назначение: Экспортировать артефакты workspace или пакета для дальнейшего использования.
- Когда использовать: Используйте, когда нужно получить распространяемый результат из workspace.
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
- Назначение: Вывести список измененных файлов в репозитории или workspace.
- Когда использовать: Используйте, когда нужно оценить объем последних изменений.
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
- Назначение: Отформатировать исходные файлы по правилам проекта.
- Когда использовать: Используйте перед коммитом, чтобы сохранить единый стиль кода.
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
- Назначение: Упаковать или собрать image-ресурсы проекта.
- Когда использовать: Используйте, когда изображения нужно подготовить для распространения или деплоя.
- Пример: `yarn image pack`
- Плагин: `@atls/yarn-plugin-image`
- Исходник: `yarn/plugin-image/sources/image-pack.command.ts`

</details>

### Домен `jsr`

- Команды: `jsr publish`

<details>
<summary>Подробности домена `jsr`</summary>

<!-- sync:command-card:jsr-publish -->

#### `jsr publish`

- Статус: `active`
- Назначение: Опубликовать пакет в JSR.
- Когда использовать: Используйте, когда пакет готов к публикации в реестр JSR.
- Пример: `yarn jsr publish`
- Плагин: `@atls/yarn-plugin-jsr`
- Исходник: `yarn/plugin-jsr/sources/jsr-publish.command.ts`

</details>

### Домен `library`

- Команды: `library build`

<details>
<summary>Подробности домена `library`</summary>

<!-- sync:command-card:library-build -->

#### `library build`

- Статус: `active`
- Назначение: Собрать библиотеку или артефакты библиотеки.
- Когда использовать: Используйте при подготовке библиотеки к тестированию, упаковке или релизу.
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
- Назначение: Запустить lint-процесс проекта.
- Когда использовать: Используйте для поиска проблем качества кода и стиля во всей кодовой базе.
- Пример: `yarn lint`
- Плагин: `@atls/yarn-plugin-lint`
- Исходник: `yarn/plugin-lint/sources/lint.command.tsx`

</details>

### Домен `release`

- Команды: `release create`

<details>
<summary>Подробности домена `release`</summary>

<!-- sync:command-card:release-create -->

#### `release create`

- Статус: `active`
- Назначение: Создать новый релиз проекта.
- Когда использовать: Используйте, когда все проверки завершены и вы готовы опубликовать релиз.
- Пример: `yarn release create`
- Плагин: `@atls/yarn-plugin-release`
- Исходник: `yarn/plugin-release/sources/release-create.command.ts`

</details>

### Домен `renderer`

- Команды: `renderer build`, `renderer dev`

<details>
<summary>Подробности домена `renderer`</summary>

<!-- sync:command-card:renderer-build -->

#### `renderer build`

- Статус: `active`
- Назначение: Собрать renderer-приложение или его артефакты.
- Когда использовать: Используйте при подготовке renderer к деплою или упаковке.
- Пример: `yarn renderer build`
- Плагин: `@atls/yarn-plugin-renderer`
- Исходник: `yarn/plugin-renderer/sources/commands/renderer-build.command.ts`

<!-- sync:command-card:renderer-dev -->

#### `renderer dev`

- Статус: `active`
- Назначение: Запустить renderer в режиме разработки.
- Когда использовать: Используйте во время активной разработки, когда нужен запущенный renderer.
- Пример: `yarn renderer dev`
- Плагин: `@atls/yarn-plugin-renderer`
- Исходник: `yarn/plugin-renderer/sources/commands/renderer-dev.command.ts`

</details>

### Домен `service`

- Команды: `service build`, `service dev`

<details>
<summary>Подробности домена `service`</summary>

<!-- sync:command-card:service-build -->

#### `service build`

- Статус: `active`
- Назначение: Собрать сервисное приложение или его артефакты.
- Когда использовать: Используйте при подготовке сервиса к деплою, тестированию или упаковке.
- Пример: `yarn service build`
- Плагин: `@atls/yarn-plugin-service`
- Исходник: `yarn/plugin-service/sources/service-build.command.tsx`

<!-- sync:command-card:service-dev -->

#### `service dev`

- Статус: `active`
- Назначение: Запустить сервис в режиме разработки с поддержкой быстрого цикла изменений.
- Когда использовать: Используйте, когда нужно запустить сервис локально во время активной разработки или отладки.
- Пример: `yarn service dev`
- Плагин: `@atls/yarn-plugin-service`
- Исходник: `yarn/plugin-service/sources/service-dev.command.tsx`

</details>

### Домен `test`

- Команды: `test`, `test integration`, `test unit`

<details>
<summary>Подробности домена `test`</summary>

<!-- sync:command-card:test -->

#### `test`

- Статус: `active`
- Назначение: Запустить стандартный набор тестов для проекта.
- Когда использовать: Используйте для общей проверки перед коммитом или после изменений, которые могут повлиять на поведение.
- Пример: `yarn test`
- Плагин: `@atls/yarn-plugin-test`
- Исходник: `yarn/plugin-test/sources/test.command.ts`

<!-- sync:command-card:test-integration -->

#### `test integration`

- Статус: `active`
- Назначение: Запустить интеграционные тесты, проверяющие взаимодействие компонентов или внешних зависимостей.
- Когда использовать: Используйте, когда нужно проверить сквозные сценарии, API-контракты или поведение нескольких модулей.
- Пример: `yarn test integration`
- Плагин: `@atls/yarn-plugin-test`
- Исходник: `yarn/plugin-test/sources/test-integration.command.ts`

<!-- sync:command-card:test-unit -->

#### `test unit`

- Статус: `active`
- Назначение: Запустить модульные тесты для изолированных функций, модулей или классов.
- Когда использовать: Используйте для быстрой проверки небольших изменений кода или логики в изоляции.
- Пример: `yarn test unit`
- Плагин: `@atls/yarn-plugin-test`
- Исходник: `yarn/plugin-test/sources/test-unit.command.ts`

</details>

### Домен `tools`

- Команды: `tools sync`, `tools sync tsconfig`, `tools sync typescript`

<details>
<summary>Подробности домена `tools`</summary>

<!-- sync:command-card:tools-sync -->

#### `tools sync`

- Статус: `active`
- Назначение: Синхронизировать конфигурацию инструментов проекта и связанные сгенерированные файлы.
- Когда использовать: Используйте после изменения общих настроек инструментов или когда сгенерированные конфиги могли устареть.
- Пример: `yarn tools sync`
- Плагин: `@atls/yarn-plugin-tools`
- Исходник: `yarn/plugin-tools/sources/commands/sync/tools-sync.command.ts`

<!-- sync:command-card:tools-sync-tsconfig -->

#### `tools sync tsconfig`

- Статус: `active`
- Назначение: Синхронизировать файлы конфигурации TypeScript, например варианты tsconfig.
- Когда использовать: Используйте, когда меняются настройки TypeScript-проекта и нужно пересоздать или выровнять tsconfig-файлы.
- Пример: `yarn tools sync tsconfig`
- Плагин: `@atls/yarn-plugin-tools`
- Исходник: `yarn/plugin-tools/sources/commands/sync/tools-sync-tsconfig.command.ts`

<!-- sync:command-card:tools-sync-typescript -->

#### `tools sync typescript`

- Статус: `active`
- Назначение: Синхронизировать инструменты и сгенерированную настройку, связанную с TypeScript.
- Когда использовать: Используйте после изменений в инфраструктуре TypeScript, шаблонах или общих настройках компилятора.
- Пример: `yarn tools sync typescript`
- Плагин: `@atls/yarn-plugin-tools`
- Исходник: `yarn/plugin-tools/sources/commands/sync/tools-sync-typescript.command.ts`

</details>

### Домен `typescript`

- Команды: `typecheck`

<details>
<summary>Подробности домена `typescript`</summary>

<!-- sync:command-card:typecheck -->

#### `typecheck`

- Статус: `active`
- Назначение: Запустить проверку типов TypeScript без создания артефактов сборки.
- Когда использовать: Используйте для поиска ошибок типов во время разработки или в CI перед сборкой и релизом.
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
- Назначение: Сгенерировать ассеты и/или исходные файлы, связанные с UI-иконками.
- Когда использовать: Используйте, когда меняются исходники иконок или нужно обновить сгенерированные результаты.
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
- Назначение: Запустить команду по всем изменённым workspace-пакетам.
- Когда использовать: Используйте, чтобы применять проверки, сборку или другие повторяющиеся операции только к затронутым workspace.
- Пример: `yarn workspaces changed foreach`
- Плагин: `@atls/yarn-plugin-workspaces`
- Исходник: `yarn/plugin-workspaces/sources/workspaces-changed-foreach.command.ts`

<!-- sync:command-card:workspaces-changed-list -->

#### `workspaces changed list`

- Статус: `active`
- Назначение: Вывести список изменённых workspace-пакетов.
- Когда использовать: Используйте, когда нужно понять, какие пакеты затронуты, прежде чем запускать команды по workspace.
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
- Назначение: Сгенерировать новый проект из шаблонов schematics.
- Когда использовать: Используйте при создании новой структуры проекта из готовых шаблонов.
- Пример: `yarn generate project`
- Плагин: `@atls/yarn-plugin-schematics`
- Исходник: `yarn/plugin-schematics/sources/commands/generate-project.command.tsx`
- Маршрутизация: не использовать (plugin is in bundle but not exported from plugin index)

</details>
