# Raijin Docs

Роутер для работы с кастомным Yarn-бандлом `atls` в чистом треде

<!-- sync:router-read-order -->
## Порядок чтения

1. `docs/raijin/quickstart.ru.md`
2. `docs/raijin/commands.ru.md`
3. `docs/raijin/packages.ru.md`
4. `docs/raijin/index.v1.json`
5. `docs/raijin/semantics.v1.json`

<!-- sync:router-quick-rules -->
## Правила маршрутизации

- Модели маршрутизируют только команды со `status = active`
- `inactive` команды считаются недоступными и не рекомендуются
- Источник фактов: `index.v1.json`; источник смысла: `semantics.v1.json`

<!-- sync:router-generation -->
## Генерация и проверки

- `yarn raijin:generate`
- `yarn raijin:generate:semantics` (on-demand, нужен `OPENAI_API_KEY`)
- `yarn raijin:check`

<!-- sync:router-coverage -->
## Покрытие текущей версии

- Команд: 36 (active: 35, inactive: 1)
- Workspace-пакетов: 72
- Последняя генерация: 2026-04-02T02:33:11.721Z

