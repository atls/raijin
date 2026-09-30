# Быстрый старт Raijin

Raijin устанавливается парой: пакет и проверенный Yarn. Здесь — шаги для проекта; подробности команд остаются в документации их пакетов.

<!-- sync:preflight -->

## 1. Перед началом

- Для первого запуска нужен Yarn/Corepack и Node.js в диапазоне `engines.node` пакета `@atls/raijin`
- Новый проект создавайте в пустом каталоге; существующий подключайте из корня Yarn-проекта с `"type": "module"` в `package.json`
- Новый проект использует PnP и ES-модули. Обновление сохраняет настройки проекта и не переводит CommonJS в ESM

Установщик сверяет опубликованный пакет и соответствующий ему файл `yarn.js`. Если пара не сходится, он не переключает среду проекта.

<!-- sync:new-project -->

## 2. Создать проект

```bash
yarn dlx @atls/raijin init --type project
```

Для библиотеки используйте `--type library`. После проверки пары установщик создаст каркас и запишет Yarn в `.yarn/releases/yarn.js`.

Если Git ещё не инициализирован, выполните `git init`, затем `yarn install`: так включатся хуки. Правила проверки перед коммитом [задайте сами](#staged-checks).

<!-- sync:existing-project -->

## 3. Подключить или обновить существующий проект

```bash
yarn dlx @atls/raijin update
```

Команда подключает последнюю опубликованную пару пакета и Yarn или обновляет уже установленную. Она не пересоздаёт проект и не заменяет его настройки TypeScript, ESLint, Prettier и lint-staged. В монорепозитории запускайте её из корня Yarn-проекта; независимому вложенному проекту нужен свой `yarn.lock`.

Зафиксируйте изменения `package.json`, `yarn.lock`, `.yarnrc.yml` и `.yarn/releases/yarn.js` одним коммитом вместе с нужными настройками проекта.

<!-- sync:staged-checks -->

<a id="staged-checks"></a>

## 4. Проверки перед коммитом

Хук перед коммитом вызывает `yarn commit staged`. Но Raijin не знает, какие файлы и чем проверяет ваш проект. Без конфигурации lint-staged команда завершится ошибкой.

Хуки устанавливаются через Husky. Raijin не перезаписывает чужие действующие хуки: при конфликте подключение остановится. В CI и при упаковке образа хуки не ставятся. Подробности — в [описании установки](../../packages/raijin/README.md#git-hooks).

Если конфигурация lint-staged уже есть, сохраните её. Новую можно записать в `package.json`, `.lintstagedrc` или `lint-staged.config.*` — используйте один вариант, принятый в проекте.

Пример для проекта с TypeScript и тестами, запускаемыми через Node; замените команды и маски файлов под свой проект:

```json
{
  "*.{yml,yaml,json,graphql,md}": "yarn format",
  "*.{js,mjs,cjs,jsx,ts,tsx}": ["yarn format", "yarn lint"],
  "*.{ts,tsx}": "yarn typecheck",
  "*.{test,spec}.{ts,tsx}": "yarn test unit"
}
```

Если внутри репозитория есть независимый Yarn-проект, ему нужна своя конфигурация: lint-staged берёт ближайшую и не объединяет её с корневой. Такой проект запускает собственные команды; подключать к нему Raijin только ради хуков не нужно.

Добавьте конфигурацию и изменённый файл в индекс Git, затем выполните из корня репозитория:

```bash
yarn commit staged
```

Убедитесь, что проверки действительно запустились для всех затронутых проектов. Пустой индекс этого не доказывает. Поведение команды при конфликте описано в [документации commit](../../packages/plugins/commit/README.md).

<!-- sync:verification -->

## 5. Проверить проект

```bash
yarn check
yarn check --verify
yarn check packages/app
```

Без аргументов `check` проходит весь Yarn-проект: форматирование, линтинг, типы и тесты. `--verify` проверяет то же самое, но не меняет файлы. Каталог сужает форматирование, линтинг и поиск тестов; TypeScript проверяет применимый проект по его `tsconfig.json`. Один файл запускает только форматирование, линтинг и проверку типов — без тестов. Подробности — в [документации check](../../packages/plugins/check/README.md).

<!-- sync:consumer-howto -->

## 6. Проверить pull request в CI

CI берёт версию Node из `package.json` вашего проекта. После `init` добавьте туда `engines.node` с диапазоном, указанным в установленном пакете `@atls/raijin`: установщик не копирует это поле.

```yaml
name: Verify
on: pull_request

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v7
        with:
          node-version-file: package.json
      - run: yarn install --immutable
      - run: yarn check --verify --since "$BASE_SHA"
        env:
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
```

Это пример для репозитория вашего проекта. `fetch-depth: 0` оставляет историю, нужную для сравнения с базой pull request. Raijin выбирает изменённые и зависящие от них рабочие области, а GitHub Actions запускает проверку. Собственные workflow Raijin создаются из Terraform в репозитории инфраструктуры; порождённую копию в `.github/workflows` не правят.

<!-- sync:nextjs -->

## 7. Использовать Next.js под Yarn PnP

Если Next.js и Raijin работают в одном Yarn-проекте, до подключения Raijin укажите `"type": "module"` в корневом `package.json`. Так Node.js определяет формат `.js`-файлов; подробнее — в [документации Node.js об ES-модулях](https://nodejs.org/api/packages.html#type). Исходники приложения менять не нужно. В монорепозитории у приложения остаётся собственный `tsconfig.json`.

```sh
yarn renderer build
yarn renderer start
yarn renderer dev
```

Raijin запускает Next из каталога выбранного приложения и передаёт ему аргументы команды. Для сборки и разработки под PnP используется [режим Webpack](https://nextjs.org/docs/app/api-reference/cli/next). Настройки, переменные окружения, результат сборки и сервер остаются за Next.js. Подробности — в [описании renderer-команд](../../packages/plugins/renderer/README.md).
