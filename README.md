![raijin-github-cover](https://github.com/user-attachments/assets/ac98b900-ee3c-4ea8-a081-e83a1f5f3282)

# Atlantis Raijin

[![Raijin Docs RU](https://img.shields.io/badge/Raijin%20Docs-RU-0b5fff)](README.md)
[![Raijin Docs EN](https://img.shields.io/badge/Raijin%20Docs-EN-1f8a70)](README_EN.md)

<!-- sync:root-what -->

## Что это

Raijin — командный слой на Yarn для проектов и монорепозиториев Node.js/TypeScript. Пакет `@atls/raijin` и проверенный Yarn runtime дают одни и те же команды для разработки, Git hooks и CI. Raijin связывает готовые инструменты, но не заменяет Yarn, TypeScript, ESLint, Next.js или их настройки.

<!-- sync:root-audience -->

## Для кого

- Для команд с несколькими Node.js/TypeScript-проектами или Yarn-монорепозиториями, где одни проверки повторяются в разных `package.json`
- Для проектов, которым важно одинаково запускать проверки локально, перед коммитом и в pull request

Если одному проекту хватает нескольких обычных scripts, подключать Raijin необязательно.

<!-- sync:root-capabilities -->

## Что умеет Raijin

- `yarn check` проходит весь проект и может исправить форматирование; `yarn check --verify --since <ref>` проверяет изменённые и зависящие от них workspaces без записи файлов
- `yarn commit staged` запускает проверки подготовленных файлов по принадлежащей проекту конфигурации lint-staged
- `library build`, `service build/dev/start`, `renderer build/dev/start` и `image pack` покрывают соответствующие сценарии; подробности остаются в документации владельцев команд
- `generate project` создаёт каркас, а публичные `init/update` устанавливают проверенную пару пакета и runtime после её публикации

<!-- sync:root-quickstart -->

## Быстрый старт

Нужны Node.js `>=24.15.0 <25` и доступный Yarn/Corepack. Релиз `@atls/raijin@0.7.0` не содержит проверенного `yarn.js` для нового установщика: приведённые ниже команды публичного подключения применимы только после публикации v2 с соответствующим файлом релиза.

### Новый проект после выпуска v2

```bash
yarn dlx @atls/raijin init --type project
```

Запускайте из пустого каталога; для библиотеки используйте `--type library`. Установщик проверяет пару пакета и файла `.yarn/releases/yarn.js`, затем создаёт каркас. До публикации v2 этот сетевой путь не подтверждён; проверка установленного локального пакета не заменяет её.

### Существующий проект после выпуска v2

```bash
yarn dlx @atls/raijin update
```

Запускайте из корня Yarn-проекта с `package.json`, где `"type": "module"`. Установщик откажет проекту с другим module scope до изменения файлов. В монорепозитории member workspace не является отдельным Yarn-проектом; независимому вложенному проекту нужен собственный `yarn.lock`.

### Перед первым коммитом

После подключения [настройте проверки подготовленных файлов](./docs/raijin/quickstart.ru.md#staged-checks): Raijin устанавливает hooks через Husky, но не придумывает за проект конфигурацию lint-staged.

### Локальная проверка установленного проекта

```bash
yarn check
```

`check` запускает форматирование, lint, typecheck, unit и integration tests. Для проверки без изменения файлов используйте `yarn check --verify`. [Три области проверки](./docs/raijin/verification.md) — весь проект, staged-файлы и изменённые workspaces в PR — не взаимозаменяемы.

<!-- sync:root-consumer-howto -->

## Как использовать в чужом проекте

Начните с [быстрого старта](./docs/raijin/quickstart.ru.md). Он показывает подключение, собственную конфигурацию staged-проверок и пример CI. Для Next.js под Yarn PnP отдельно проверьте ESM-область пакета и [команды renderer](./packages/plugins/renderer/README.md).

<!-- sync:root-read-more -->

## Где читать дальше

- [Быстрый старт и CI](./docs/raijin/quickstart.ru.md)
- [Как различать проверки](./docs/raijin/verification.md)
- [Документация команд и пакетов](./docs/raijin/README.ru.md)
- [English README](./README_EN.md)
