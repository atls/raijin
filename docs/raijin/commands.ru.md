# Raijin Commands

Карта команд из `yarn/plugin-*` и bundle `@atls/yarn-cli`

<!-- sync:commands-active -->
## Active (можно маршрутизировать)

### Домен `badges`

<!-- sync:command-card:badges-generate -->
#### `badges generate`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-badges`
- Класс: `BadgesCommand`
- Назначение: Сгенерировать бейджи или связанные с ними артефакты для репозитория.
- Когда использовать: Используйте, когда нужно обновить бейджи проекта после изменения метаданных или статуса.
- Пример: `yarn badges generate`
- Теги: `badges`
- Исходник: `yarn/plugin-badges/sources/badges.command.ts`

### Домен `changelog`

<!-- sync:command-card:changelog-generate -->
#### `changelog generate`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-changelog`
- Класс: `ChangelogGenerateCommand`
- Назначение: Сгенерировать запись или содержимое changelog на основе изменений в проекте.
- Когда использовать: Используйте перед релизом, когда нужен обновленный changelog по последним изменениям.
- Пример: `yarn changelog generate`
- Теги: `changelog`
- Исходник: `yarn/plugin-changelog/sources/changelog-generate.command.ts`

### Домен `check`

<!-- sync:command-card:check -->
#### `check`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-check`
- Класс: `CheckCommand`
- Назначение: Запустить общие проверки валидации репозитория.
- Когда использовать: Используйте для быстрой проверки, что рабочее пространство в корректном состоянии.
- Пример: `yarn check`
- Теги: `check`
- Исходник: `yarn/plugin-check/sources/check.command.ts`

### Домен `checks`

<!-- sync:command-card:checks-lint -->
#### `checks lint`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-checks`
- Класс: `ChecksLintCommand`
- Назначение: Запустить lint-проверки в составе набора checks.
- Когда использовать: Используйте, когда нужно проверить стиль кода и lint-правила проекта.
- Пример: `yarn checks lint`
- Теги: `checks`
- Исходник: `yarn/plugin-checks/sources/checks-lint.command.tsx`

<!-- sync:command-card:checks-release -->
#### `checks release`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-checks`
- Класс: `ChecksReleaseCommand`
- Назначение: Запустить проверки, связанные с релизом, перед публикацией или созданием тега.
- Когда использовать: Используйте, чтобы подтвердить готовность релиза и заранее найти блокирующие проблемы.
- Пример: `yarn checks release`
- Теги: `checks`
- Исходник: `yarn/plugin-checks/sources/checks-release.command.ts`

<!-- sync:command-card:checks-run -->
#### `checks run`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-checks`
- Класс: `ChecksRunCommand`
- Назначение: Запустить полный пайплайн checks для репозитория.
- Когда использовать: Используйте, когда нужна широкая проверка перед merge или релизом.
- Пример: `yarn checks run`
- Теги: `checks`
- Исходник: `yarn/plugin-checks/sources/checks-run.command.ts`

<!-- sync:command-card:checks-test-integration -->
#### `checks test integration`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-checks`
- Класс: `ChecksTestIntegrationCommand`
- Назначение: Запустить интеграционные тесты проекта.
- Когда использовать: Используйте для проверки взаимодействия модулей, сервисов или внешних зависимостей.
- Пример: `yarn checks test integration`
- Теги: `checks`
- Исходник: `yarn/plugin-checks/sources/checks-test-integration.command.ts`

<!-- sync:command-card:checks-test-unit -->
#### `checks test unit`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-checks`
- Класс: `ChecksTestUnitCommand`
- Назначение: Запустить модульные тесты проекта.
- Когда использовать: Используйте для проверки отдельных функций, компонентов или модулей.
- Пример: `yarn checks test unit`
- Теги: `checks`
- Исходник: `yarn/plugin-checks/sources/checks-test-unit.command.ts`

<!-- sync:command-card:checks-typecheck -->
#### `checks typecheck`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-checks`
- Класс: `ChecksTypeCheckCommand`
- Назначение: Запустить проверку типов TypeScript.
- Когда использовать: Используйте, когда нужно найти ошибки типов без запуска полного набора тестов.
- Пример: `yarn checks typecheck`
- Теги: `checks`
- Исходник: `yarn/plugin-checks/sources/checks-typecheck.command.tsx`

### Домен `commit`

<!-- sync:command-card:commit-message -->
#### `commit message`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-commit`
- Класс: `CommitMessageCommand`
- Назначение: Создать или помочь с генерацией сообщения коммита.
- Когда использовать: Используйте, когда нужно сообщение коммита на основе текущих staged-изменений.
- Пример: `yarn commit message`
- Теги: `commit`
- Исходник: `yarn/plugin-commit/sources/commit-message.command.tsx`

<!-- sync:command-card:commit-message-lint -->
#### `commit message lint`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-commit`
- Класс: `CommitMessageLintCommand`
- Назначение: Проверить формат и соглашения сообщения коммита.
- Когда использовать: Используйте перед коммитом или в CI, чтобы убедиться, что сообщения соответствуют правилам проекта.
- Пример: `yarn commit message lint`
- Теги: `commit`
- Исходник: `yarn/plugin-commit/sources/commit-message-lint.command.ts`

<!-- sync:command-card:commit-staged -->
#### `commit staged`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-commit`
- Класс: `CommitStagedCommand`
- Назначение: Закоммитить текущие staged-изменения.
- Когда использовать: Используйте после подготовки файлов, когда готовы создать коммит.
- Пример: `yarn commit staged`
- Теги: `commit`
- Исходник: `yarn/plugin-commit/sources/commit-staged.command.ts`

### Домен `essentials`

<!-- sync:command-card:set-version-atls -->
#### `set version atls`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-essentials`
- Класс: `SetVersionCommand`
- Назначение: Установить или обновить версию ATLS-проекта.
- Когда использовать: Используйте при подготовке повышения версии репозитория или набора пакетов.
- Пример: `yarn set version atls`
- Теги: `essentials`
- Исходник: `yarn/plugin-essentials/sources/commands/set-version.command.ts`

### Домен `export`

<!-- sync:command-card:export -->
#### `export`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-export`
- Класс: `WorkspaceExportCommand`
- Назначение: Экспортировать артефакты workspace или пакета для дальнейшего использования.
- Когда использовать: Используйте, когда нужно получить распространяемый результат из workspace.
- Пример: `yarn export`
- Теги: `export`
- Исходник: `yarn/plugin-export/sources/commands/workspace-export.command.ts`

### Домен `files`

<!-- sync:command-card:files-changed-list -->
#### `files changed list`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-files`
- Класс: `FilesChangedListCommand`
- Назначение: Вывести список измененных файлов в репозитории или workspace.
- Когда использовать: Используйте, когда нужно оценить объем последних изменений.
- Пример: `yarn files changed list`
- Теги: `files`
- Исходник: `yarn/plugin-files/sources/files-changed-list.command.ts`

### Домен `format`

<!-- sync:command-card:format -->
#### `format`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-format`
- Класс: `FormatCommand`
- Назначение: Отформатировать исходные файлы по правилам проекта.
- Когда использовать: Используйте перед коммитом, чтобы сохранить единый стиль кода.
- Пример: `yarn format`
- Теги: `format`
- Исходник: `yarn/plugin-format/sources/format.command.tsx`

### Домен `image`

<!-- sync:command-card:image-pack -->
#### `image pack`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-image`
- Класс: `ImagePackCommand`
- Назначение: Упаковать или собрать image-ресурсы проекта.
- Когда использовать: Используйте, когда изображения нужно подготовить для распространения или деплоя.
- Пример: `yarn image pack`
- Теги: `image`
- Исходник: `yarn/plugin-image/sources/image-pack.command.ts`

### Домен `jsr`

<!-- sync:command-card:jsr-publish -->
#### `jsr publish`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-jsr`
- Класс: `JsrPublishCommand`
- Назначение: Опубликовать пакет в JSR.
- Когда использовать: Используйте, когда пакет готов к публикации в реестр JSR.
- Пример: `yarn jsr publish`
- Теги: `jsr`
- Исходник: `yarn/plugin-jsr/sources/jsr-publish.command.ts`

### Домен `library`

<!-- sync:command-card:library-build -->
#### `library build`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-library`
- Класс: `LibraryBuildCommand`
- Назначение: Собрать библиотеку или артефакты библиотеки.
- Когда использовать: Используйте при подготовке библиотеки к тестированию, упаковке или релизу.
- Пример: `yarn library build`
- Теги: `library`
- Исходник: `yarn/plugin-library/sources/library-build.command.tsx`

### Домен `lint`

<!-- sync:command-card:lint -->
#### `lint`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-lint`
- Класс: `LintCommand`
- Назначение: Запустить lint-процесс проекта.
- Когда использовать: Используйте для поиска проблем качества кода и стиля во всей кодовой базе.
- Пример: `yarn lint`
- Теги: `lint`
- Исходник: `yarn/plugin-lint/sources/lint.command.tsx`

### Домен `release`

<!-- sync:command-card:release-create -->
#### `release create`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-release`
- Класс: `ReleaseCreateCommand`
- Назначение: Создать новый релиз проекта.
- Когда использовать: Используйте, когда все проверки завершены и вы готовы опубликовать релиз.
- Пример: `yarn release create`
- Теги: `release`
- Исходник: `yarn/plugin-release/sources/release-create.command.ts`

### Домен `renderer`

<!-- sync:command-card:renderer-build -->
#### `renderer build`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-renderer`
- Класс: `RendererBuildCommand`
- Назначение: Собрать renderer-приложение или его артефакты.
- Когда использовать: Используйте при подготовке renderer к деплою или упаковке.
- Пример: `yarn renderer build`
- Теги: `renderer`
- Исходник: `yarn/plugin-renderer/sources/commands/renderer-build.command.ts`

<!-- sync:command-card:renderer-dev -->
#### `renderer dev`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-renderer`
- Класс: `RendererDevCommand`
- Назначение: Запустить renderer в режиме разработки.
- Когда использовать: Используйте во время активной разработки, когда нужен запущенный renderer.
- Пример: `yarn renderer dev`
- Теги: `renderer`
- Исходник: `yarn/plugin-renderer/sources/commands/renderer-dev.command.ts`

### Домен `service`

<!-- sync:command-card:service-build -->
#### `service build`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-service`
- Класс: `ServiceBuildCommand`
- Назначение: Собрать сервисное приложение или его артефакты.
- Когда использовать: Используйте при подготовке сервиса к деплою, тестированию или упаковке.
- Пример: `yarn service build`
- Теги: `service`
- Исходник: `yarn/plugin-service/sources/service-build.command.tsx`

<!-- sync:command-card:service-dev -->
#### `service dev`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-service`
- Класс: `ServiceDevCommand`
- Назначение: Запустить сервис в режиме разработки с поддержкой быстрого цикла изменений.
- Когда использовать: Используйте, когда нужно запустить сервис локально во время активной разработки или отладки.
- Пример: `yarn service dev`
- Теги: `development`, `service`
- Исходник: `yarn/plugin-service/sources/service-dev.command.tsx`

### Домен `test`

<!-- sync:command-card:test -->
#### `test`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-test`
- Класс: `TestCommand`
- Назначение: Запустить стандартный набор тестов для проекта.
- Когда использовать: Используйте для общей проверки перед коммитом или после изменений, которые могут повлиять на поведение.
- Пример: `yarn test`
- Теги: `quality`, `test`
- Исходник: `yarn/plugin-test/sources/test.command.ts`

<!-- sync:command-card:test-integration -->
#### `test integration`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-test`
- Класс: `TestIntegrationCommand`
- Назначение: Запустить интеграционные тесты, проверяющие взаимодействие компонентов или внешних зависимостей.
- Когда использовать: Используйте, когда нужно проверить сквозные сценарии, API-контракты или поведение нескольких модулей.
- Пример: `yarn test integration`
- Теги: `integration`, `test`
- Исходник: `yarn/plugin-test/sources/test-integration.command.ts`

<!-- sync:command-card:test-unit -->
#### `test unit`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-test`
- Класс: `TestUnitCommand`
- Назначение: Запустить модульные тесты для изолированных функций, модулей или классов.
- Когда использовать: Используйте для быстрой проверки небольших изменений кода или логики в изоляции.
- Пример: `yarn test unit`
- Теги: `test`, `unit`
- Исходник: `yarn/plugin-test/sources/test-unit.command.ts`

### Домен `tools`

<!-- sync:command-card:tools-sync -->
#### `tools sync`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-tools`
- Класс: `ToolsSyncCommand`
- Назначение: Синхронизировать конфигурацию инструментов проекта и связанные сгенерированные файлы.
- Когда использовать: Используйте после изменения общих настроек инструментов или когда сгенерированные конфиги могли устареть.
- Пример: `yarn tools sync`
- Теги: `sync`, `tools`
- Исходник: `yarn/plugin-tools/sources/commands/sync/tools-sync.command.ts`

<!-- sync:command-card:tools-sync-tsconfig -->
#### `tools sync tsconfig`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-tools`
- Класс: `ToolsSyncTSConfigCommand`
- Назначение: Синхронизировать файлы конфигурации TypeScript, например варианты tsconfig.
- Когда использовать: Используйте, когда меняются настройки TypeScript-проекта и нужно пересоздать или выровнять tsconfig-файлы.
- Пример: `yarn tools sync tsconfig`
- Теги: `sync`, `tools`, `tsconfig`, `typescript`
- Исходник: `yarn/plugin-tools/sources/commands/sync/tools-sync-tsconfig.command.ts`

<!-- sync:command-card:tools-sync-typescript -->
#### `tools sync typescript`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-tools`
- Класс: `ToolsSyncTypeScriptCommand`
- Назначение: Синхронизировать инструменты и сгенерированную настройку, связанную с TypeScript.
- Когда использовать: Используйте после изменений в инфраструктуре TypeScript, шаблонах или общих настройках компилятора.
- Пример: `yarn tools sync typescript`
- Теги: `sync`, `tools`, `typescript`
- Исходник: `yarn/plugin-tools/sources/commands/sync/tools-sync-typescript.command.ts`

### Домен `typescript`

<!-- sync:command-card:typecheck -->
#### `typecheck`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-typescript`
- Класс: `TypeCheckCommand`
- Назначение: Запустить проверку типов TypeScript без создания артефактов сборки.
- Когда использовать: Используйте для поиска ошибок типов во время разработки или в CI перед сборкой и релизом.
- Пример: `yarn typecheck`
- Теги: `quality`, `typescript`
- Исходник: `yarn/plugin-typescript/sources/typecheck.command.tsx`

### Домен `ui`

<!-- sync:command-card:ui-icons-generate -->
#### `ui icons generate`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-ui`
- Класс: `UiIconsGenerateCommand`
- Назначение: Сгенерировать ассеты и/или исходные файлы, связанные с UI-иконками.
- Когда использовать: Используйте, когда меняются исходники иконок или нужно обновить сгенерированные результаты.
- Пример: `yarn ui icons generate`
- Теги: `generate`, `icons`, `ui`
- Исходник: `yarn/plugin-ui/sources/commands/ui-icons-generate.command.tsx`

### Домен `workspaces`

<!-- sync:command-card:workspaces-changed-foreach -->
#### `workspaces changed foreach`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-workspaces`
- Класс: `WorkspacesChangedForeachCommand`
- Назначение: Запустить команду по всем изменённым workspace-пакетам.
- Когда использовать: Используйте, чтобы применять проверки, сборку или другие повторяющиеся операции только к затронутым workspace.
- Пример: `yarn workspaces changed foreach`
- Теги: `changed`, `foreach`, `workspaces`
- Исходник: `yarn/plugin-workspaces/sources/workspaces-changed-foreach.command.ts`

<!-- sync:command-card:workspaces-changed-list -->
#### `workspaces changed list`
- Статус: `active`
- Плагин: `@atls/yarn-plugin-workspaces`
- Класс: `WorkspacesChangedListCommand`
- Назначение: Вывести список изменённых workspace-пакетов.
- Когда использовать: Используйте, когда нужно понять, какие пакеты затронуты, прежде чем запускать команды по workspace.
- Пример: `yarn workspaces changed list`
- Теги: `changed`, `list`, `workspaces`
- Исходник: `yarn/plugin-workspaces/sources/workspaces-changed-list.command.ts`

<!-- sync:commands-inactive -->
## Inactive (не маршрутизировать)

### Домен `schematics`

<!-- sync:command-card:generate-project -->
#### `generate project`
- Статус: `inactive`
- Плагин: `@atls/yarn-plugin-schematics`
- Класс: `GenerateProjectCommand`
- Назначение: Сгенерировать новый проект из шаблонов schematics.
- Когда использовать: Используйте при создании новой структуры проекта из готовых шаблонов.
- Пример: `yarn generate project`
- Теги: `schematics`
- Исходник: `yarn/plugin-schematics/sources/commands/generate-project.command.tsx`
- Маршрутизация: не использовать (plugin is in bundle but not exported from plugin index)

