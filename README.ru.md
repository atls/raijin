![Raijin](.github/assets/raijin-banner.png)

# Raijin

[![Raijin Docs RU](https://img.shields.io/badge/Raijin%20Docs-RU-0b5fff)](README.ru.md)
[![Raijin Docs EN](https://img.shields.io/badge/Raijin%20Docs-EN-1f8a70)](README.md)
[![npm version](https://img.shields.io/npm/v/%40atls%2Fraijin.svg)](https://www.npmjs.com/package/@atls/raijin)
[![BSD-3-Clause license](https://img.shields.io/github/license/atls/raijin)](LICENSE)

Raijin превращает общие инженерные договорённости в рабочий процесс, который команда может запускать каждый день. Форматирование, линтинг, проверка типов, тесты и сборка следуют единым контрактам в разных проектах, а общей точкой входа служит Yarn.

Использовать Raijin можно в команде или соло. У инженеров и агентов есть один набор команд и проверок, а в новом проекте — уже знакомый порядок работы. Правила и инструменты можно расширять под свою команду по мере развития этих контрактов.

## Первый запуск

Если начинаете с нуля:

```sh
yarn dlx @atls/raijin init --type project
```

Если интегрируете Raijin в рабочий проект:

```sh
yarn dlx @atls/raijin update
```

Требования к проекту, подключение хуков и пример CI — в [настройке Raijin](./docs/raijin/setup.ru.md).

## Команды

| Задача                      | Команды                                                                                                            | Подробности                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Проверки проекта            | `yarn check`, `yarn format`, `yarn lint`, `yarn typecheck`, `yarn test`, `yarn test unit`, `yarn test integration` | [check](./packages/plugins/check/README.md), [test](./packages/plugins/test/README.md) и связанные возможности |
| Проверки коммита            | `yarn commit staged`, `yarn commit message`, `yarn commit message lint`                                            | [commit](./packages/plugins/commit/README.md)                                                                  |
| Каркас                      | `yarn generate project`                                                                                            | [generate](./packages/plugins/generate/README.md)                                                              |
| Библиотека                  | `yarn library build`                                                                                               | [library](./packages/plugins/library/README.md)                                                                |
| Сервис                      | `yarn service build`, `yarn service build --standalone`, `yarn service dev`, `yarn service start`                  | [service](./packages/plugins/service/README.md)                                                                |
| Next.js                     | `yarn renderer build`, `yarn renderer dev`, `yarn renderer start`                                                  | [renderer](./packages/plugins/renderer/README.md)                                                              |
| Обновление проверенной пары | `yarn set version atls`                                                                                            | [essentials](./packages/plugins/essentials/README.md) и [публичный установщик](./packages/raijin/README.md)    |
