![raijin-github-cover](https://github.com/user-attachments/assets/ac98b900-ee3c-4ea8-a081-e83a1f5f3282)

# Raijin

[![Raijin Docs RU](https://img.shields.io/badge/Raijin%20Docs-RU-0b5fff)](README.md)
[![Raijin Docs EN](https://img.shields.io/badge/Raijin%20Docs-EN-1f8a70)](README_EN.md)
[![npm version](https://img.shields.io/npm/v/%40atls%2Fraijin.svg)](https://www.npmjs.com/package/@atls/raijin)
[![BSD-3-Clause license](https://img.shields.io/github/license/atls/raijin)](LICENSE)

Raijin — инструмент для организации инженерной работы. Он помогает формировать культуру команды: правила и конвенции заложены в продукт и работают прямо в проектах. Устойчивые конвенции помогают выстроить инженерную работу так, чтобы в разных проектах команда опиралась на одни и те же принципы и требования к качеству.

## Начать

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
| Сервис                      | `yarn service build`, `yarn service dev`, `yarn service start`                                                     | [service](./packages/plugins/service/README.md)                                                                |
| Next.js                     | `yarn renderer build`, `yarn renderer dev`, `yarn renderer start`                                                  | [renderer](./packages/plugins/renderer/README.md)                                                              |
| Образ                       | `yarn image pack`                                                                                                  | [image](./packages/plugins/image/README.md)                                                                    |
| Обновление проверенной пары | `yarn set version atls`                                                                                            | [essentials](./packages/plugins/essentials/README.md) и [публичный установщик](./packages/raijin/README.md)    |
