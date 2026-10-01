![raijin-github-cover](https://github.com/user-attachments/assets/ac98b900-ee3c-4ea8-a081-e83a1f5f3282)

# Atlantis Raijin

[![Raijin Docs RU](https://img.shields.io/badge/Raijin%20Docs-RU-0b5fff)](README.md)
[![Raijin Docs EN](https://img.shields.io/badge/Raijin%20Docs-EN-1f8a70)](README_EN.md)

Raijin — единый инженерный контур для проектов Node.js и TypeScript на Yarn. Он поставляется как версионный Yarn-бандл и даёт команде общий способ проверять изменения, готовить коммиты и собирать результат. В разных репозиториях эти действия остаются узнаваемыми — локально и в CI.

Правила форматирования, анализа кода и тестирования задаёт сам проект. Raijin проводит их через общие команды и понятные области проверки, чтобы результат можно было повторить, а не выяснять, какая из похожих команд на самом деле запускалась.

## Начать работу

Для первого запуска нужны Yarn и Node.js в диапазоне, который объявляет [пакет Raijin](./packages/raijin/package.json). Новый проект создавайте в пустом каталоге:

```bash
yarn dlx @atls/raijin init --type project
```

Для библиотеки используйте `--type library`. Если проект уже существует, подключите или обновите Raijin из корня этого Yarn-проекта:

```bash
yarn dlx @atls/raijin update
```

Существующий проект должен использовать ES-модули; установщик не меняет формат его модулей или конфигурацию инструментов. Подробные шаги, включая Git-хуки и CI, — в [быстром старте](./docs/raijin/quickstart.ru.md).

## Проверки

- `yarn check` проходит весь проект и может исправить форматирование
- `yarn commit staged` проверяет подготовленные к коммиту файлы по правилам проекта
- `yarn check --verify --since <ref>` проверяет затронутую область в CI, не меняя файлы

Для сборки библиотек и сервисов, Next.js и образов есть отдельные команды. [Карта команд](./docs/raijin/README.ru.md) ведёт к подробностям каждой из них.

## Читать дальше

- [Быстрый старт и настройка CI](./docs/raijin/quickstart.ru.md)
- [Карта команд](./docs/raijin/README.ru.md)
- [English README](./README_EN.md)
