# Руководства Raijin

Подключение описано в быстром старте. Здесь — команды Raijin и ссылки на их подробное поведение.

## С чего начать

- Создать или подключить проект: [быстрый старт](./quickstart.ru.md)
- Различить локальную проверку, хук и CI: [корневой README](../../README.md)
- Уточнить аргументы установленной команды: `yarn <command> --help`

## Команды по задаче

| Задача                      | Команды                                                                         | Где читать дальше                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Проверки проекта            | `check`, `format`, `lint`, `typecheck`, `test`, `test unit`, `test integration` | [check](../../packages/plugins/check/README.md), [test](../../packages/plugins/test/README.md) и связанные возможности |
| Проверки коммита            | `commit staged`, `commit message`, `commit message lint`                        | [commit](../../packages/plugins/commit/README.md)                                                                      |
| Каркас                      | `generate project`                                                              | [generate](../../packages/plugins/generate/README.md)                                                                  |
| Библиотека                  | `library build`                                                                 | [library](../../packages/plugins/library/README.md)                                                                    |
| Сервис                      | `service build`, `service dev`, `service start`                                 | [service](../../packages/plugins/service/README.md)                                                                    |
| Next.js                     | `renderer build`, `renderer dev`, `renderer start`                              | [renderer](../../packages/plugins/renderer/README.md)                                                                  |
| Образ                       | `image pack`                                                                    | [image](../../packages/plugins/image/README.md)                                                                        |
| Обновление проверенной пары | `set version atls`                                                              | [essentials](../../packages/plugins/essentials/README.md) и [публичный установщик](../../packages/raijin/README.md)    |

Публичные `init` и `update` подключают пару пакета и Yarn, но не входят в список команд установленного Yarn. Обычные команды Yarn, например `workspaces list` и `npm publish`, остаются командами Yarn.
