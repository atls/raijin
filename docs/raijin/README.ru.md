# Руководства Raijin

Начните с проверенной пары пакета и runtime, затем выберите команду под свою задачу. Raijin сохраняет единый контракт команд для локальной работы, hooks и CI; Yarn и остальные инструменты сохраняют собственное поведение.

<!-- sync:router-scenarios -->

## Куда идти по задаче

- Создать или подключить проект, настроить hooks и взять пример CI: [быстрый старт](./quickstart.ru.md)
- Различить полную, staged- и changed-workspace проверку: [области проверки](./verification.md)
- Узнать точный синтаксис установленного runtime: `yarn --help` и `yarn <command> --help`

<!-- sync:router-read-order -->

## Порядок чтения

1. [quickstart.ru.md](./quickstart.ru.md)
2. [verification.md](./verification.md)

<!-- sync:router-command-map -->

## Команды по задаче

| Задача                      | Сохранённые команды                                                             | Подробный владелец                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Проверки проекта            | `check`, `format`, `lint`, `typecheck`, `test`, `test unit`, `test integration` | [check](../../packages/plugins/check/README.md), [test](../../packages/plugins/test/README.md) и связанные возможности |
| Проверки коммита            | `commit staged`, `commit message`, `commit message lint`                        | [commit](../../packages/plugins/commit/README.md)                                                                      |
| Каркас                      | `generate project`                                                              | [generate](../../packages/plugins/generate/README.md)                                                                  |
| Библиотека                  | `library build`                                                                 | [library](../../packages/plugins/library/README.md)                                                                    |
| Сервис                      | `service build`, `service dev`, `service start`                                 | [service](../../packages/plugins/service/README.md)                                                                    |
| Next.js                     | `renderer build`, `renderer dev`, `renderer start`                              | [renderer](../../packages/plugins/renderer/README.md)                                                                  |
| Образ                       | `image pack`                                                                    | [image](../../packages/plugins/image/README.md)                                                                        |
| Обновление проверенной пары | `set version atls`                                                              | [essentials](../../packages/plugins/essentials/README.md) и [публичный установщик](../../packages/raijin/README.md)    |

Публичный бинарник `raijin init/update` — путь подключения после публикации соответствующего выпуска v2, а не дополнительная зарегистрированная команда Yarn. Штатные команды Yarn, например `workspaces list` и `npm publish`, не становятся командами Raijin. В репозитории исходников `yarn raijin:check` сверяет сборку и проверенный runtime; потребителю этот внутренний script не нужен.
