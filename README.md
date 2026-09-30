![raijin-github-cover](https://github.com/user-attachments/assets/ac98b900-ee3c-4ea8-a081-e83a1f5f3282)

# Atlantis Raijin

[![Raijin Docs RU](https://img.shields.io/badge/Raijin%20Docs-RU-0b5fff)](README.md)
[![Raijin Docs EN](https://img.shields.io/badge/Raijin%20Docs-EN-1f8a70)](README_EN.md)

<!-- sync:root-what -->

## Что это

Raijin собирает команды разработки, проверок и сборки для проектов Node.js и TypeScript на Yarn. Их можно запускать локально, перед коммитом и в CI, выбирая подходящую область проверки. Правила остаются у Prettier, ESLint, TypeScript и самого проекта — Raijin не подменяет их настройки.

<!-- sync:root-audience -->

## Когда пригодится

Когда одна проверка живёт в скрипте проекта, другая — в хуке, а третья — в CI, они быстро начинают расходиться. Raijin полезен там, где этот набор нужно удерживать в нескольких проектах или монорепозитории. Для проекта с парой скриптов он может быть лишним.

<!-- sync:root-capabilities -->

## Что можно делать

- Проверять проект командой `yarn check`; `--verify` не меняет файлы
- Проверять подготовленные к коммиту файлы через `yarn commit staged` и собственную конфигурацию lint-staged
- Собирать библиотеки, запускать сервисы и Next.js, упаковывать образы — [карта команд](./docs/raijin/README.ru.md) показывает нужный вход
- Создать проект через `init` или подключить Raijin к существующему через `update`

<!-- sync:root-quickstart -->

## Быстрый старт

Нужен Node.js в диапазоне, указанном в [пакете Raijin](./packages/raijin/package.json), и доступный Yarn/Corepack. Установщик берёт опубликованный пакет вместе с соответствующим ему Yarn runtime и проверяет эту пару до подключения.

### Новый проект

```bash
yarn dlx @atls/raijin init --type project
```

Запускайте из пустого каталога; для библиотеки используйте `--type library`.

### Существующий проект

```bash
yarn dlx @atls/raijin update
```

Запускайте из корня Yarn-проекта, в `package.json` которого указано `"type": "module"`. Существующий проект с другим форматом модулей установщик не меняет. Для независимого вложенного проекта с собственным Yarn нужен отдельный `yarn.lock`.

### Перед первым коммитом

После подключения [настройте проверки перед коммитом](./docs/raijin/quickstart.ru.md#staged-checks). Raijin ставит хуки через Husky, но список проверок остаётся решением проекта.

### Как проверять изменения

```bash
yarn check
```

Локальный `check` проходит весь Yarn-проект: форматирование, линтинг, проверку типов и тесты. Перед коммитом `yarn commit staged` работает только с подготовленными файлами по правилам проекта. В pull request `yarn check --verify --since <ref>` без записи файлов проверяет изменённые и зависящие от них рабочие области. Это разные проверки; успешный хук не заменяет полную проверку проекта. [Точное поведение check](./packages/plugins/check/README.md) описано рядом с командой.

<!-- sync:root-consumer-howto -->

## Как подключить

[Быстрый старт](./docs/raijin/quickstart.ru.md) показывает настройку проекта, хуков и CI. Если используете Next.js под Yarn PnP, проверьте [настройку ES-модулей](./docs/raijin/quickstart.ru.md#7-использовать-nextjs-под-yarn-pnp).

<!-- sync:root-read-more -->

## Где читать дальше

- [Быстрый старт и CI](./docs/raijin/quickstart.ru.md)
- [Документация команд и пакетов](./docs/raijin/README.ru.md)
- [English README](./README_EN.md)
