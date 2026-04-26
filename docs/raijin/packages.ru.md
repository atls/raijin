# Raijin Packages

Сгруппированные карточки workspace-пакетов

<!-- sync:packages-groups -->

## Group `yarn`

Пакеты кастомного Yarn CLI, плагинов и bundle-инфраструктуры

Короткий список:

- `@atls/yarn-cli` — Приватная реализация Yarn CLI для автоматизации репозитория и релизных процессов.
- `@atls/yarn-cli-tools` — Вспомогательные инструменты и хелперы, используемые внутренним Yarn CLI.
- `@atls/yarn-pack-utils` — Утилиты для упаковки, pack и подготовки публикации в Yarn-процессах.
- `@atls/yarn-plugin-badges` — Yarn-плагин для генерации и управления бейджами репозитория.
- `@atls/yarn-plugin-changelog` — Yarn-плагин для генерации changelog и работы с релиз-нотами.
- `@atls/yarn-plugin-check` — Yarn-плагин для проверок репозитория и команд валидации.
- `@atls/yarn-plugin-checks` — Плагин расширенных проверок для нескольких сценариев валидации в Yarn.
- `@atls/yarn-plugin-cli-publish` — Yarn-плагин для публикации через CLI и автоматизации релизов.
- `@atls/yarn-plugin-commit` — Плагин Yarn для автоматизации и правил, связанных с коммитами.
- `@atls/yarn-plugin-essentials` — Основной плагин Yarn с базовой общей функциональностью.
- `@atls/yarn-plugin-export` — Плагин Yarn для экспорта артефактов или метаданных проекта.
- `@atls/yarn-plugin-files` — Плагин Yarn для работы с файлами и файловыми сценариями.
- `@atls/yarn-plugin-format` — Плагин Yarn для форматирования кода и файлов проекта.
- `@atls/yarn-plugin-image` — Плагин Yarn для обработки изображений и графических ресурсов.
- `@atls/yarn-plugin-jsr` — Плагин Yarn для публикации в JSR или интеграции с ним.
- `@atls/yarn-plugin-library` — Плагин Yarn для рабочих процессов библиотечных проектов.
- `@atls/yarn-plugin-lint` — Плагин Yarn для линтинга и проверок качества кода.
- `@atls/yarn-plugin-pnp-patch` — Плагин Yarn для патчинга поведения Plug'n'Play и связанных загрузчиков.
- `@atls/yarn-plugin-release` — Плагин Yarn для автоматизации релизов и публикации.
- `@atls/yarn-plugin-renderer` — Плагин Yarn для рендеринга вывода, например шаблонов или отчетов.
- `@atls/yarn-plugin-schematics` — Плагин Yarn для схем и генерации каркаса проекта.
- `@atls/yarn-plugin-service` — Плагин Yarn для сервисных инструментов и оркестрации.
- `@atls/yarn-plugin-test` — Плагин Yarn для тестирования и автоматизации тестов.
- `@atls/yarn-plugin-tools` — Плагин Yarn для общих инструментов и утилит разработчика.
- `@atls/yarn-plugin-typescript` — Плагин Yarn для поддержки TypeScript-сборки и интеграции.
- `@atls/yarn-plugin-ui` — Плагин Yarn для UI-сценариев и инструментов интерфейса.
- `@atls/yarn-plugin-workspaces` — Плагин Yarn для управления workspace и координации монорепозитория.
- `@atls/yarn-run-utils` — Утилитарный пакет для запуска команд и работы с процессами в сценариях Yarn.
- `@atls/yarn-test-utils` — Утилитарный пакет для тестовых помощников и настройки тестов в проектах Yarn.
- `@atls/yarn-workspace-utils` — Утилитарный пакет для функций-помощников workspace и монорепозитория.

<details>
<summary>Подробности группы `yarn`</summary>

<!-- sync:package-card:atls-yarn-cli -->

#### `@atls/yarn-cli`

- Локация: `yarn/cli`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Приватная реализация Yarn CLI для автоматизации репозитория и релизных процессов.
- Когда использовать: Используйте при расширении внутренних CLI-команд для build, fix, version или release-задач.
- Пример: `Добавить команду, которая повышает версии пакетов и обновляет changelog.`
- Теги: `yarn`
- Скрипты: `build`, `build:bundle`, `build:clean`, `build:dist`, `build:fix`, `build:schemaic`, `build:version`, `fix`, `postpack`, `prepack`
- Зависимости: deps 54, devDeps 0, peerDeps 0

<!-- sync:package-card:atls-yarn-cli-tools -->

#### `@atls/yarn-cli-tools`

- Локация: `yarn/cli-tools`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Вспомогательные инструменты и хелперы, используемые внутренним Yarn CLI.
- Когда использовать: Используйте для общих утилит команд CLI и автоматизации.
- Пример: `Создать хелпер для разбора CLI-флагов и путей workspace.`
- Теги: `yarn`
- Скрипты: отсутствуют
- Зависимости: deps 53, devDeps 0, peerDeps 0

<!-- sync:package-card:atls-yarn-pack-utils -->

#### `@atls/yarn-pack-utils`

- Локация: `yarn/pack-utils`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Утилиты для упаковки, pack и подготовки публикации в Yarn-процессах.
- Когда использовать: Используйте для переиспользуемой логики архивов пакетов или проверок публикации.
- Пример: `Сделать утилиту, которая проверяет файлы, попадающие в tarball пакета.`
- Теги: `yarn`
- Скрипты: отсутствуют
- Зависимости: deps 1, devDeps 7, peerDeps 0

<!-- sync:package-card:atls-yarn-plugin-badges -->

#### `@atls/yarn-plugin-badges`

- Локация: `yarn/plugin-badges`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Yarn-плагин для генерации и управления бейджами репозитория.
- Когда использовать: Используйте для автоматизации создания бейджей или обновления их метаданных.
- Пример: `Сгенерировать бейджи README для статуса сборки и версии пакета.`
- Теги: `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 1, devDeps 5, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-changelog -->

#### `@atls/yarn-plugin-changelog`

- Локация: `yarn/plugin-changelog`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Yarn-плагин для генерации changelog и работы с релиз-нотами.
- Когда использовать: Используйте для автоматического обновления changelog во время релизов.
- Пример: `Создать релиз-ноты из слитых коммитов.`
- Теги: `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 2, devDeps 3, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-check -->

#### `@atls/yarn-plugin-check`

- Локация: `yarn/plugin-check`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Yarn-плагин для проверок репозитория и команд валидации.
- Когда использовать: Используйте при добавлении команд, проверяющих состояние workspace или соответствие политикам.
- Пример: `Запустить проверку согласованности package manifests.`
- Теги: `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 0, devDeps 3, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-checks -->

#### `@atls/yarn-plugin-checks`

- Локация: `yarn/plugin-checks`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин расширенных проверок для нескольких сценариев валидации в Yarn.
- Когда использовать: Используйте, когда нужен набор команд валидации для CI или локальной проверки.
- Пример: `Выполнить набор проверок целостности workspace.`
- Теги: `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 15, devDeps 10, peerDeps 3

<!-- sync:package-card:atls-yarn-plugin-cli-publish -->

#### `@atls/yarn-plugin-cli-publish`

- Локация: `yarn/plugin-cli-publish`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Yarn-плагин для публикации через CLI и автоматизации релизов.
- Когда использовать: Используйте, когда публикация пакетов должна управляться внутренними CLI-командами.
- Пример: `Опубликовать пакет в registry одной командой.`
- Теги: `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 0, devDeps 5, peerDeps 3

<!-- sync:package-card:atls-yarn-plugin-commit -->

#### `@atls/yarn-plugin-commit`

- Локация: `yarn/plugin-commit`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для автоматизации и правил, связанных с коммитами.
- Когда использовать: Используйте, когда нужны помощники для процесса коммитов в экосистеме плагинов Yarn.
- Пример: `Соберите плагин commit перед упаковкой для распространения.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 10, devDeps 6, peerDeps 3

<!-- sync:package-card:atls-yarn-plugin-essentials -->

#### `@atls/yarn-plugin-essentials`

- Локация: `yarn/plugin-essentials`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Основной плагин Yarn с базовой общей функциональностью.
- Когда использовать: Используйте для общих возможностей, которые переиспользуются другими плагинами Yarn.
- Пример: `Подключите essentials как зависимость для нескольких возможностей плагинов.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 2, devDeps 4, peerDeps 3

<!-- sync:package-card:atls-yarn-plugin-export -->

#### `@atls/yarn-plugin-export`

- Локация: `yarn/plugin-export`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для экспорта артефактов или метаданных проекта.
- Когда использовать: Используйте, когда плагину нужно экспортировать сгенерированные файлы или структурированный вывод.
- Пример: `Экспортируйте конфигурацию workspace в удобный для использования формат.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 2, devDeps 5, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-files -->

#### `@atls/yarn-plugin-files`

- Локация: `yarn/plugin-files`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для работы с файлами и файловыми сценариями.
- Когда использовать: Используйте, когда плагину нужно читать, записывать, копировать или преобразовывать файлы.
- Пример: `Сгенерируйте файлы во время сборки и упакуйте их затем.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 3, devDeps 3, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-format -->

#### `@atls/yarn-plugin-format`

- Локация: `yarn/plugin-format`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для форматирования кода и файлов проекта.
- Когда использовать: Используйте, когда нужны правила форматирования или автоматизация форматирования в workspace.
- Пример: `Запускайте проверку форматирования перед публикацией плагина.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 8, devDeps 6, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-image -->

#### `@atls/yarn-plugin-image`

- Локация: `yarn/plugin-image`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для обработки изображений и графических ресурсов.
- Когда использовать: Используйте, когда плагин работает с изображениями, оптимизацией или генерацией.
- Пример: `Обрабатывайте изображения как часть сборочного пайплайна.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 6, devDeps 5, peerDeps 3

<!-- sync:package-card:atls-yarn-plugin-jsr -->

#### `@atls/yarn-plugin-jsr`

- Локация: `yarn/plugin-jsr`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для публикации в JSR или интеграции с ним.
- Когда использовать: Используйте, когда нужно подготовить пакеты для распространения через JSR.
- Пример: `Соберите и упакуйте плагин для релиза в JSR.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 2, devDeps 4, peerDeps 3

<!-- sync:package-card:atls-yarn-plugin-library -->

#### `@atls/yarn-plugin-library`

- Локация: `yarn/plugin-library`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для рабочих процессов библиотечных проектов.
- Когда использовать: Используйте, когда workspace предоставляет инструменты или соглашения для библиотек.
- Пример: `Используйте плагин library для стандартизации структуры пакета.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 11, devDeps 6, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-lint -->

#### `@atls/yarn-plugin-lint`

- Локация: `yarn/plugin-lint`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для линтинга и проверок качества кода.
- Когда использовать: Используйте, когда нужны правила линтинга, команды lint или контроль качества.
- Пример: `Запускайте lint перед сборкой и публикацией плагина.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 9, devDeps 7, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-pnp-patch -->

#### `@atls/yarn-plugin-pnp-patch`

- Локация: `yarn/plugin-pnp-patch`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для патчинга поведения Plug'n'Play и связанных загрузчиков.
- Когда использовать: Используйте, когда нужны кастомные исправления PnP, сборка загрузчиков или поддержка загрузки Yarn.
- Пример: `Соберите варианты source и loader перед упаковкой плагина PnP patch.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `build:loader`, `build:source`, `postpack`, `prepack`, `yarn:download`
- Зависимости: deps 5, devDeps 6, peerDeps 0

<!-- sync:package-card:atls-yarn-plugin-release -->

#### `@atls/yarn-plugin-release`

- Локация: `yarn/plugin-release`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для автоматизации релизов и публикации.
- Когда использовать: Используйте, когда нужны версионирование, changelog или управление релизом.
- Пример: `Подготовьте плагин release для автоматизации шагов публикации.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 3, devDeps 3, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-renderer -->

#### `@atls/yarn-plugin-renderer`

- Локация: `yarn/plugin-renderer`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для рендеринга вывода, например шаблонов или отчетов.
- Когда использовать: Используйте, когда плагину нужно преобразовать структурированный контент в итоговый вывод.
- Пример: `Рендерьте документационные артефакты во время сборки.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 3, devDeps 8, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-schematics -->

#### `@atls/yarn-plugin-schematics`

- Локация: `yarn/plugin-schematics`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для схем и генерации каркаса проекта.
- Когда использовать: Используйте, когда нужны генераторы новых файлов, модулей или настроек проекта.
- Пример: `Сгенерируйте каркас нового workspace с помощью плагина schematics.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 9, devDeps 9, peerDeps 5

<!-- sync:package-card:atls-yarn-plugin-service -->

#### `@atls/yarn-plugin-service`

- Локация: `yarn/plugin-service`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для сервисных инструментов и оркестрации.
- Когда использовать: Используйте, когда плагин координирует жизненный цикл сервисов или сервисные утилиты.
- Пример: `Запускайте сервисные помощники как часть команды workspace.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 11, devDeps 7, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-test -->

#### `@atls/yarn-plugin-test`

- Локация: `yarn/plugin-test`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для тестирования и автоматизации тестов.
- Когда использовать: Используйте, когда нужны команды тестирования, настройка тестов или их запуск.
- Пример: `Запускайте тесты плагина перед упаковкой и релизом.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 11, devDeps 8, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-tools -->

#### `@atls/yarn-plugin-tools`

- Локация: `yarn/plugin-tools`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для общих инструментов и утилит разработчика.
- Когда использовать: Используйте, когда плагин объединяет переиспользуемые инструменты для других workspace.
- Пример: `Переиспользуйте helpers из tools в нескольких плагинах Yarn.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 6, devDeps 5, peerDeps 0

<!-- sync:package-card:atls-yarn-plugin-typescript -->

#### `@atls/yarn-plugin-typescript`

- Локация: `yarn/plugin-typescript`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для поддержки TypeScript-сборки и интеграции.
- Когда использовать: Используйте, когда нужна компиляция TypeScript, типизация или TS-ориентированные инструменты.
- Пример: `Скомпилируйте исходники TypeScript перед публикацией плагина.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 11, devDeps 7, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-ui -->

#### `@atls/yarn-plugin-ui`

- Локация: `yarn/plugin-ui`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для UI-сценариев и инструментов интерфейса.
- Когда использовать: Используйте, когда плагин поддерживает генерацию UI, компоненты или интерфейсные ресурсы.
- Пример: `Соберите UI-артефакты как часть процесса релиза плагина.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 8, devDeps 7, peerDeps 2

<!-- sync:package-card:atls-yarn-plugin-workspaces -->

#### `@atls/yarn-plugin-workspaces`

- Локация: `yarn/plugin-workspaces`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Плагин Yarn для управления workspace и координации монорепозитория.
- Когда использовать: Используйте, когда нужны обнаружение workspace, оркестрация или помощники для монорепозитория.
- Пример: `Используйте утилиты workspace для координации сборок между пакетами.`
- Теги: `plugin`, `yarn`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 3, devDeps 4, peerDeps 2

<!-- sync:package-card:atls-yarn-run-utils -->

#### `@atls/yarn-run-utils`

- Локация: `yarn/run-utils`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Утилитарный пакет для запуска команд и работы с процессами в сценариях Yarn.
- Когда использовать: Используйте, когда скриптам или плагинам нужны общие помощники для выполнения команд.
- Пример: `Используйте run-utils для единообразного запуска команды сборки.`
- Теги: `utils`, `yarn`
- Скрипты: отсутствуют
- Зависимости: deps 1, devDeps 0, peerDeps 0

<!-- sync:package-card:atls-yarn-test-utils -->

#### `@atls/yarn-test-utils`

- Локация: `yarn/test-utils`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Утилитарный пакет для тестовых помощников и настройки тестов в проектах Yarn.
- Когда использовать: Используйте, когда тестам нужны общие фикстуры, моки или помощники настройки.
- Пример: `Импортируйте test-utils, чтобы упростить модульные тесты плагина.`
- Теги: `utils`, `yarn`
- Скрипты: отсутствуют
- Зависимости: deps 3, devDeps 0, peerDeps 0

<!-- sync:package-card:atls-yarn-workspace-utils -->

#### `@atls/yarn-workspace-utils`

- Локация: `yarn/workspace-utils`
- Группа: `yarn`
- Видимость: `private`
- Назначение: Утилитарный пакет для функций-помощников workspace и монорепозитория.
- Когда использовать: Используйте, когда пакетам нужна общая логика для путей workspace, метаданных или оркестрации.
- Пример: `Используйте workspace-utils для определения расположения пакетов.`
- Теги: `utils`, `yarn`
- Скрипты: отсутствуют
- Зависимости: deps 0, devDeps 1, peerDeps 0

</details>

## Group `code`

Базовые code-библиотеки для сборки, тестов и утилит

Короткий список:

- `@atls/code-changelog` — Предоставляет утилиты для генерации и управления changelog.
- `@atls/code-commit` — Обрабатывает рабочие процессы и соглашения, связанные с коммитами.
- `@atls/code-configuration` — Управляет загрузкой, проверкой и значениями по умолчанию для конфигурации кода.
- `@atls/code-format` — Поддерживает операции форматирования кода и правила форматирования.
- `@atls/code-github` — Утилиты и интеграции для GitHub, используемые в разных пакетах.
- `@atls/code-icons` — Общие иконки и код, связанный с иконками, для платформы.
- `@atls/code-jsr` — Код для публикации в JSR и рабочих процессов, совместимых с JSR.
- `@atls/code-lint` — Утилиты линтинга, правила и общая логика проверки.
- `@atls/code-pack` — Помощники для упаковки, сборки и подготовки артефактов к распространению.
- `@atls/code-schematics` — Схематики и генераторы для создания проектов и библиотек.
- `@atls/code-service` — Код сервисного слоя и общие абстракции runtime-сервисов.
- `@atls/code-test` — Тестовые утилиты, воркеры и общая тестовая инфраструктура.
- `@atls/code-typescript` — TypeScript-специфичные хелперы, поддержка сборки и общие TS-инструменты.

<details>
<summary>Подробности группы `code`</summary>

<!-- sync:package-card:atls-code-changelog -->

#### `@atls/code-changelog`

- Локация: `code/code-changelog`
- Группа: `code`
- Видимость: `public`
- Назначение: Предоставляет утилиты для генерации и управления changelog.
- Когда использовать: Используйте, когда нужно автоматически сформировать заметки релиза или историю изменений.
- Пример: `Сгенерировать changelog из последних коммитов.`
- Теги: `code`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 2, devDeps 1, peerDeps 0

<!-- sync:package-card:atls-code-commit -->

#### `@atls/code-commit`

- Локация: `code/code-commit`
- Группа: `code`
- Видимость: `public`
- Назначение: Обрабатывает рабочие процессы и соглашения, связанные с коммитами.
- Когда использовать: Используйте, когда инструмент должен создавать, проверять или форматировать данные коммита.
- Пример: `Сформировать сообщение коммита из задачи релиза.`
- Теги: `code`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 10, devDeps 2, peerDeps 0

<!-- sync:package-card:atls-code-configuration -->

#### `@atls/code-configuration`

- Локация: `code/code-configuration`
- Группа: `code`
- Видимость: `public`
- Назначение: Управляет загрузкой, проверкой и значениями по умолчанию для конфигурации кода.
- Когда использовать: Используйте, когда приложению нужно читать или проверять конфигурацию проекта.
- Пример: `Загрузить настройки workspace из файла конфигурации.`
- Теги: `code`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 1, devDeps 1, peerDeps 0

<!-- sync:package-card:atls-code-format -->

#### `@atls/code-format`

- Локация: `code/code-format`
- Группа: `code`
- Видимость: `public`
- Назначение: Поддерживает операции форматирования кода и правила форматирования.
- Когда использовать: Используйте, когда код нужно единообразно форматировать в проекте.
- Пример: `Отформатировать исходные файлы перед коммитом изменений.`
- Теги: `code`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 5, devDeps 1, peerDeps 0

<!-- sync:package-card:atls-code-github -->

#### `@atls/code-github`

- Локация: `code/code-github`
- Группа: `code`
- Видимость: `public`
- Назначение: Утилиты и интеграции для GitHub, используемые в разных пакетах.
- Когда использовать: Используйте для работы с GitHub API, метаданными репозиториев и GitHub-ориентированными инструментами.
- Пример: `Добавить хелпер для генерации ссылок на релизы GitHub.`
- Теги: `code`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 2, devDeps 1, peerDeps 1

<!-- sync:package-card:atls-code-icons -->

#### `@atls/code-icons`

- Локация: `code/code-icons`
- Группа: `code`
- Видимость: `public`
- Назначение: Общие иконки и код, связанный с иконками, для платформы.
- Когда использовать: Используйте при создании или экспорте переиспользуемых иконок для UI-пакетов.
- Пример: `Опубликовать новый набор SVG-иконок для меню приложения.`
- Теги: `code`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 7, devDeps 4, peerDeps 0

<!-- sync:package-card:atls-code-jsr -->

#### `@atls/code-jsr`

- Локация: `code/code-jsr`
- Группа: `code`
- Видимость: `public`
- Назначение: Код для публикации в JSR и рабочих процессов, совместимых с JSR.
- Когда использовать: Используйте при подготовке пакетов или инструментов для распространения через JSR.
- Пример: `Сгенерировать метаданные JSR-пакета из исходных файлов.`
- Теги: `code`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 1, devDeps 0, peerDeps 0

<!-- sync:package-card:atls-code-lint -->

#### `@atls/code-lint`

- Локация: `code/code-lint`
- Группа: `code`
- Видимость: `public`
- Назначение: Утилиты линтинга, правила и общая логика проверки.
- Когда использовать: Используйте для создания переиспользуемых правил линтера или вспомогательных функций.
- Пример: `Реализовать кастомное правило для порядка импортов.`
- Теги: `code`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 3, devDeps 1, peerDeps 2

<!-- sync:package-card:atls-code-pack -->

#### `@atls/code-pack`

- Локация: `code/code-pack`
- Группа: `code`
- Видимость: `public`
- Назначение: Помощники для упаковки, сборки и подготовки артефактов к распространению.
- Когда использовать: Используйте для общей логики pack, publish или подготовки артефактов.
- Пример: `Создать хелпер, который собирает содержимое tarball пакета.`
- Теги: `code`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 4, devDeps 1, peerDeps 0

<!-- sync:package-card:atls-code-schematics -->

#### `@atls/code-schematics`

- Локация: `code/code-schematics`
- Группа: `code`
- Видимость: `public`
- Назначение: Схематики и генераторы для создания проектов и библиотек.
- Когда использовать: Используйте при создании шаблонов, генераторов или фабрик схем.
- Пример: `Добавить схему, которая создаёт новый workspace-пакет.`
- Теги: `code`
- Скрипты: `build`, `build:library`, `build:schematic-factory`, `postpack`, `prepack`
- Зависимости: deps 3, devDeps 8, peerDeps 2

<!-- sync:package-card:atls-code-service -->

#### `@atls/code-service`

- Локация: `code/code-service`
- Группа: `code`
- Видимость: `public`
- Назначение: Код сервисного слоя и общие абстракции runtime-сервисов.
- Когда использовать: Используйте при реализации переиспользуемых сервисов, адаптеров или контрактов сервисов.
- Пример: `Определить сервис для получения удалённой конфигурации.`
- Теги: `code`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 7, devDeps 5, peerDeps 0

<!-- sync:package-card:atls-code-test -->

#### `@atls/code-test`

- Локация: `code/code-test`
- Группа: `code`
- Видимость: `public`
- Назначение: Тестовые утилиты, воркеры и общая тестовая инфраструктура.
- Когда использовать: Используйте для хелперов unit-, integration- или worker-тестов.
- Пример: `Предоставить воркер для запуска сценариев тестов в браузероподобной среде.`
- Теги: `code`
- Скрипты: `build`, `build:worker`, `postpack`, `prepack`
- Зависимости: deps 3, devDeps 1, peerDeps 0

<!-- sync:package-card:atls-code-typescript -->

#### `@atls/code-typescript`

- Локация: `code/code-typescript`
- Группа: `code`
- Видимость: `public`
- Назначение: TypeScript-специфичные хелперы, поддержка сборки и общие TS-инструменты.
- Когда использовать: Используйте для общей TypeScript-конфигурации, трансформаций или инструментов воркера.
- Пример: `Добавить воркер, который проверяет совместимость tsconfig.`
- Теги: `code`
- Скрипты: `build`, `build:worker`, `postpack`, `prepack`
- Зависимости: deps 2, devDeps 2, peerDeps 0

</details>

## Group `config`

Пакеты конфигурации и shared presets

Короткий список:

- `@atls/config-commitlint` — Общая конфигурация Commitlint для проверки сообщений коммитов.
- `@atls/config-eslint` — Общая конфигурация ESLint и пресеты.
- `@atls/config-prettier` — Общая конфигурация Prettier для единообразного форматирования.
- `@atls/config-typescript` — Общие пресеты TypeScript и настройки компилятора.

<details>
<summary>Подробности группы `config`</summary>

<!-- sync:package-card:atls-config-commitlint -->

#### `@atls/config-commitlint`

- Локация: `config/commitlint`
- Группа: `config`
- Видимость: `public`
- Назначение: Общая конфигурация Commitlint для проверки сообщений коммитов.
- Когда использовать: Используйте для стандартизации правил сообщений коммитов в репозиториях.
- Пример: `Подключить общий preset commitlint в пакете.`
- Теги: `config`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 0, devDeps 1, peerDeps 0

<!-- sync:package-card:atls-config-eslint -->

#### `@atls/config-eslint`

- Локация: `config/eslint`
- Группа: `config`
- Видимость: `public`
- Назначение: Общая конфигурация ESLint и пресеты.
- Когда использовать: Используйте для единых правил линтинга во всех пакетах.
- Пример: `Импортировать базовую ESLint-конфигурацию для React-пакета.`
- Теги: `config`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 16, devDeps 3, peerDeps 0

<!-- sync:package-card:atls-config-prettier -->

#### `@atls/config-prettier`

- Локация: `config/prettier`
- Группа: `config`
- Видимость: `public`
- Назначение: Общая конфигурация Prettier для единообразного форматирования.
- Когда использовать: Используйте для выравнивания правил форматирования во всём монорепозитории.
- Пример: `Применить общую конфигурацию Prettier к новому workspace.`
- Теги: `config`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 2, devDeps 1, peerDeps 0

<!-- sync:package-card:atls-config-typescript -->

#### `@atls/config-typescript`

- Локация: `config/typescript`
- Группа: `config`
- Видимость: `public`
- Назначение: Общие пресеты TypeScript и настройки компилятора.
- Когда использовать: Используйте, когда пакетам нужно наследовать одинаковые опции компилятора TS.
- Пример: `Сослаться на базовый tsconfig из пакета библиотеки.`
- Теги: `config`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 0, devDeps 0, peerDeps 0

</details>

## Group `runtime`

Runtime-модули и инфраструктура исполнения

Короткий список:

- `@atls/code-runtime` — Абстракции runtime и общий код уровня исполнения.

<details>
<summary>Подробности группы `runtime`</summary>

<!-- sync:package-card:atls-code-runtime -->

#### `@atls/code-runtime`

- Локация: `runtime/code-runtime`
- Группа: `runtime`
- Видимость: `public`
- Назначение: Абстракции runtime и общий код уровня исполнения.
- Когда использовать: Используйте при создании общих runtime-библиотек, схем или хелперов исполнения.
- Пример: `Реализовать runtime-хелпер для запуска сервисов.`
- Теги: `runtime`
- Скрипты: `build`, `build:library`, `build:schematic`, `postpack`, `prepack`
- Зависимости: deps 14, devDeps 3, peerDeps 0

</details>

## Group `webpack`

Webpack-интеграции и сборочные адаптеры

Короткий список:

- `@atls/webpack-proto-imports-loader` — Webpack-loader для обработки proto-импортов и преобразования импортов на этапе сборки.
- `@atls/webpack-start-server-plugin` — Webpack-плагин для запуска и координации dev-сервера.

<details>
<summary>Подробности группы `webpack`</summary>

<!-- sync:package-card:atls-webpack-proto-imports-loader -->

#### `@atls/webpack-proto-imports-loader`

- Локация: `webpack/webpack-proto-imports-loader`
- Группа: `webpack`
- Видимость: `public`
- Назначение: Webpack-loader для обработки proto-импортов и преобразования импортов на этапе сборки.
- Когда использовать: Используйте, когда сборке webpack нужна кастомная резолюция импортов или proto-импорты.
- Пример: `Преобразовать proto-импорты во время сборки бандла.`
- Теги: `webpack`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 3, devDeps 9, peerDeps 0

<!-- sync:package-card:atls-webpack-start-server-plugin -->

#### `@atls/webpack-start-server-plugin`

- Локация: `webpack/webpack-start-server-plugin`
- Группа: `webpack`
- Видимость: `public`
- Назначение: Webpack-плагин для запуска и координации dev-сервера.
- Когда использовать: Используйте, когда сборка webpack должна автоматически запускать или управлять сервером.
- Пример: `Запустить локальный preview-сервер после компиляции.`
- Теги: `webpack`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 1, devDeps 1, peerDeps 0

</details>

## Group `prettier`

Форматирование и Prettier-интеграции

Короткий список:

- `@atls/prettier-plugin` — Кастомный плагин Prettier для форматирования специфичного синтаксиса или файлов.

<details>
<summary>Подробности группы `prettier`</summary>

<!-- sync:package-card:atls-prettier-plugin -->

#### `@atls/prettier-plugin`

- Локация: `prettier/plugin`
- Группа: `prettier`
- Видимость: `public`
- Назначение: Кастомный плагин Prettier для форматирования специфичного синтаксиса или файлов.
- Когда использовать: Используйте, когда Prettier требуется кастомное поведение парсинга или вывода.
- Пример: `Отформатировать кастомный формат конфигурационного файла с помощью плагина.`
- Теги: `prettier`
- Скрипты: `build`, `postpack`, `prepack`
- Зависимости: deps 7, devDeps 3, peerDeps 0

</details>

## Group `cli`

Компактный список CLI-пакетов и их роль

Короткий список:

- `@atls/cli-ui-error-info-component` — Отображает краткую сводку ошибки для вывода в CLI.
- `@atls/cli-ui-file-link-component` — Показывает кликабельную или стилизованную ссылку на путь к файлу в терминальном интерфейсе.
- `@atls/cli-ui-file-path-component` — Форматирует пути файловой системы для единообразного отображения в CLI.
- `@atls/cli-ui-format-progress-component` — Показывает прогресс задач форматирования в выводе CLI.
- `@atls/cli-ui-git-commit-component` — Показывает информацию о git-коммите в удобном для терминала формате.
- `@atls/cli-ui-icons-progress-component` — Предоставляет индикаторы прогресса на основе иконок для состояний CLI.
- `@atls/cli-ui-line-component` — Отображает одну форматированную строку для сообщений CLI.
- `@atls/cli-ui-lint-progress-component` — Показывает прогресс линтинга в выводе CLI.
- `@atls/cli-ui-lint-result-component` — Сводит результаты линтинга с предупреждениями и ошибками.
- `@atls/cli-ui-log-record-component` — Форматирует одну запись лога для отображения в терминале.
- `@atls/cli-ui-pretty-logs-component` — Преобразует сырые логи в читаемый, стилизованный вид для CLI.
- `@atls/cli-ui-raw-output-component` — Выводит неформатированный сырой текст для потребителей CLI.
- `@atls/cli-ui-renderer-static-component` — Отображает статический контент CLI, который не меняется со временем.
- `@atls/cli-ui-schematics-component` — Показывает информацию о схематиках или генераторах в CLI.
- `@atls/cli-ui-service-progress-component` — Показывает прогресс операций, связанных с сервисами.
- `@atls/cli-ui-source-preview-component` — Предпросматривает фрагменты исходного кода в выводе терминала.
- `@atls/cli-ui-stack-trace-component` — Форматирует stack trace для читаемого вывода ошибок в CLI.
- `@atls/cli-ui-test-failure-component` — Сводит результаты упавших тестов в выводе CLI.
- `@atls/cli-ui-test-progress-component` — Показывает прогресс во время выполнения тестов.
- `@atls/cli-ui-typescript-diagnostic-component` — Отображает диагностические сообщения TypeScript в читаемом формате CLI.
- `@atls/cli-ui-typescript-progress-component` — Показывает прогресс задач проверки типов TypeScript.

<details>
<summary>Подробности группы `cli`</summary>

_Компактные карточки для этой группы_

<!-- sync:package-card:atls-cli-ui-error-info-component -->

#### `@atls/cli-ui-error-info-component`

- Назначение: Отображает краткую сводку ошибки для вывода в CLI.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-error-info`

<!-- sync:package-card:atls-cli-ui-file-link-component -->

#### `@atls/cli-ui-file-link-component`

- Назначение: Показывает кликабельную или стилизованную ссылку на путь к файлу в терминальном интерфейсе.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-file-link`

<!-- sync:package-card:atls-cli-ui-file-path-component -->

#### `@atls/cli-ui-file-path-component`

- Назначение: Форматирует пути файловой системы для единообразного отображения в CLI.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-file-path`

<!-- sync:package-card:atls-cli-ui-format-progress-component -->

#### `@atls/cli-ui-format-progress-component`

- Назначение: Показывает прогресс задач форматирования в выводе CLI.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-format-progress`

<!-- sync:package-card:atls-cli-ui-git-commit-component -->

#### `@atls/cli-ui-git-commit-component`

- Назначение: Показывает информацию о git-коммите в удобном для терминала формате.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-git-commit`

<!-- sync:package-card:atls-cli-ui-icons-progress-component -->

#### `@atls/cli-ui-icons-progress-component`

- Назначение: Предоставляет индикаторы прогресса на основе иконок для состояний CLI.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-icons-progress`

<!-- sync:package-card:atls-cli-ui-line-component -->

#### `@atls/cli-ui-line-component`

- Назначение: Отображает одну форматированную строку для сообщений CLI.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-line`

<!-- sync:package-card:atls-cli-ui-lint-progress-component -->

#### `@atls/cli-ui-lint-progress-component`

- Назначение: Показывает прогресс линтинга в выводе CLI.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-lint-progress`

<!-- sync:package-card:atls-cli-ui-lint-result-component -->

#### `@atls/cli-ui-lint-result-component`

- Назначение: Сводит результаты линтинга с предупреждениями и ошибками.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-lint-result`

<!-- sync:package-card:atls-cli-ui-log-record-component -->

#### `@atls/cli-ui-log-record-component`

- Назначение: Форматирует одну запись лога для отображения в терминале.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-log-record`

<!-- sync:package-card:atls-cli-ui-pretty-logs-component -->

#### `@atls/cli-ui-pretty-logs-component`

- Назначение: Преобразует сырые логи в читаемый, стилизованный вид для CLI.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-pretty-logs`

<!-- sync:package-card:atls-cli-ui-raw-output-component -->

#### `@atls/cli-ui-raw-output-component`

- Назначение: Выводит неформатированный сырой текст для потребителей CLI.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-raw-output`

<!-- sync:package-card:atls-cli-ui-renderer-static-component -->

#### `@atls/cli-ui-renderer-static-component`

- Назначение: Отображает статический контент CLI, который не меняется со временем.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-render-static`

<!-- sync:package-card:atls-cli-ui-schematics-component -->

#### `@atls/cli-ui-schematics-component`

- Назначение: Показывает информацию о схематиках или генераторах в CLI.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-schematics-component`

<!-- sync:package-card:atls-cli-ui-service-progress-component -->

#### `@atls/cli-ui-service-progress-component`

- Назначение: Показывает прогресс операций, связанных с сервисами.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-service-progress`

<!-- sync:package-card:atls-cli-ui-source-preview-component -->

#### `@atls/cli-ui-source-preview-component`

- Назначение: Предпросматривает фрагменты исходного кода в выводе терминала.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-source-preview`

<!-- sync:package-card:atls-cli-ui-stack-trace-component -->

#### `@atls/cli-ui-stack-trace-component`

- Назначение: Форматирует stack trace для читаемого вывода ошибок в CLI.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-stack-trace`

<!-- sync:package-card:atls-cli-ui-test-failure-component -->

#### `@atls/cli-ui-test-failure-component`

- Назначение: Сводит результаты упавших тестов в выводе CLI.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-test-failure`

<!-- sync:package-card:atls-cli-ui-test-progress-component -->

#### `@atls/cli-ui-test-progress-component`

- Назначение: Показывает прогресс во время выполнения тестов.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-test-progress`

<!-- sync:package-card:atls-cli-ui-typescript-diagnostic-component -->

#### `@atls/cli-ui-typescript-diagnostic-component`

- Назначение: Отображает диагностические сообщения TypeScript в читаемом формате CLI.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-typescript-diagnostic`

<!-- sync:package-card:atls-cli-ui-typescript-progress-component -->

#### `@atls/cli-ui-typescript-progress-component`

- Назначение: Показывает прогресс задач проверки типов TypeScript.
- Скрипты: `build`, `postpack`, `prepack`
- Локация: `cli/cli-ui-types-check-progress`

</details>
