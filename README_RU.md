![raijin-github-cover](https://user-images.githubusercontent.com/102182195/234980835-78ed0fdb-c692-4b0e-ac95-b46c8cbd17a4.png)

# Atlantis Raijin

[![Raijin Docs RU](https://img.shields.io/badge/Raijin%20Docs-RU-0b5fff)](docs/README.ru.md)
[![Raijin Docs EN](https://img.shields.io/badge/Raijin%20Docs-EN-1f8a70)](docs/README.md)

<!-- sync:root-what -->

## Что это

Raijin — это набор команд и пакетов для монорепозиториев, поставляемый как кастомный Yarn-бандл `atls`
Цель — дать единый способ запускать проверки, сборку, релиз и сервисные утилиты в разных проектах

<!-- sync:root-audience -->

## Для кого

- Для команд, которые поддерживают несколько `Node.js`/`TypeScript` проектов
- Для разработчиков, которым нужен единый контракт команд в локальной среде и в `GitHub Actions`
- Для опенсорс и внутренних репозиториев, где важны предсказуемые проверки и обновления

<!-- sync:root-capabilities -->

## Что умеет Raijin

- Проверки кода: `check`, `lint`, `typecheck`, `test`, `checks *`
- Работа с изменениями: `files changed *`, `workspaces changed *`
- Сборка и выпуск: `service build`, `library build`, `release create`, `npm publish`
- Генераторы и служебные команды для инфраструктуры монорепозитория

<!-- sync:root-quickstart -->

## Быстрый старт

### Новый проект

```bash
yarn set version https://raw.githubusercontent.com/atls/raijin/master/yarn/cli/dist/yarn.mjs
yarn set version atls
```

Ожидаемый результат:

- В проекте появляется/обновляется `.yarn/releases/yarn.mjs`
- Команды `raijin` становятся доступны через `yarn`

### Обновление

```bash
yarn set version atls
```

Ожидаемый результат:

- Подтягивается актуальная версия бандла

### Проверка

```bash
yarn check
yarn files changed list
yarn test unit
```

Ожидаемый результат:

- Команды выполняются без ошибки маршрутизации и с ожидаемым набором шагов

<!-- sync:root-consumer-howto -->

## Как использовать в чужом проекте

1. Подключите бандл по разделу [Быстрый старт](./docs/raijin/quickstart.ru.md)
2. Зафиксируйте изменения `.yarn/releases` и `.yarnrc.yml` в системе контроля версий
3. Обновляйте бандл командой `yarn set version atls` по мере выхода новых версий

<!-- sync:root-read-more -->

## Где читать дальше

- RU (по умолчанию): [docs/README.ru.md](docs/README.ru.md)
- EN: [docs/README.md](docs/README.md)
- Роутер раздела Raijin: [docs/raijin/README.ru.md](docs/raijin/README.ru.md)
- Быстрый старт: [docs/raijin/quickstart.ru.md](docs/raijin/quickstart.ru.md)
- Карта команд: [docs/raijin/commands.ru.md](docs/raijin/commands.ru.md)
- Карта пакетов: [docs/raijin/packages.ru.md](docs/raijin/packages.ru.md)
