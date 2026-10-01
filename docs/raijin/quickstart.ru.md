# Быстрый старт Raijin

Здесь — создание или подключение проекта, настройка проверок перед коммитом и пример CI. Подробности отдельных команд собраны в [карте команд](./README.ru.md).

## 1. Перед началом

- Для первого запуска нужны Yarn и Node.js в диапазоне `engines.node` [опубликованного пакета Raijin](https://www.npmjs.com/package/@atls/raijin)
- Новый проект создавайте в пустом каталоге. Существующий подключайте из корня Yarn-проекта с `"type": "module"` в `package.json`; [руководство Node.js](https://nodejs.org/api/packages.html#type) объясняет, что означает это поле
- Новый проект использует PnP и ES-модули. Обновление не переводит существующий проект на другой формат модулей

Установщик сверяет опубликованный пакет и соответствующий ему файл `yarn.js`. Если пара не сходится, он не переключает среду проекта.

## 2. Создать проект

```bash
yarn dlx @atls/raijin init --type project
```

Для библиотеки используйте `--type library`. После проверки пары установщик создаст каркас и запишет Yarn в `.yarn/releases/yarn.js`.

Если Git ещё не инициализирован, выполните `git init`, затем `yarn install`: так включатся хуки. Правила проверки перед коммитом [задайте сами](#staged-checks).

## 3. Подключить или обновить существующий проект

```bash
yarn dlx @atls/raijin update
```

Команда подключает последнюю опубликованную пару пакета и Yarn или обновляет уже установленную. Она не пересоздаёт проект и не заменяет его настройки TypeScript, ESLint, Prettier и lint-staged. В монорепозитории запускайте её из корня Yarn-проекта; независимому вложенному проекту нужен свой `yarn.lock`.

Зафиксируйте изменения `package.json`, `yarn.lock`, `.yarnrc.yml` и `.yarn/releases/yarn.js` одним коммитом вместе с нужными настройками проекта.

<a id="staged-checks"></a>

## 4. Проверки перед коммитом

Хук перед коммитом вызывает `yarn commit staged`. Какие файлы и чем проверять, решает проект: без его конфигурации lint-staged команда завершится ошибкой.

Raijin ставит хуки через Husky и не перезаписывает чужие действующие хуки. При конфликте подключение остановится; в CI и при упаковке образа хуки не ставятся. Подробности — в [описании установки](../../packages/raijin/README.md#git-hooks).

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

## 5. Проверить проект

```bash
yarn check
yarn check --verify
yarn check packages/app
```

Без аргументов `check` проходит весь Yarn-проект: форматирование, линтинг, типы и тесты. `--verify` проверяет то же самое, но не меняет файлы. Каталог сужает форматирование, линтинг и поиск тестов; TypeScript проверяет применимый проект по его `tsconfig.json`. Один файл запускает только форматирование, линтинг и проверку типов — без тестов. Подробности — в [документации check](../../packages/plugins/check/README.md).

## 6. Проверить pull request в CI

Версия Node для CI принадлежит вашему проекту. Если используете приведённый ниже пример, после `init` добавьте в его `package.json` поле `engines.node` с диапазоном из установленного `@atls/raijin`: установщик не копирует это поле.

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

Этот workflow добавляется в репозиторий вашего проекта. `fetch-depth: 0` сохраняет историю, нужную для сравнения с базой pull request. Проверка не меняет файлы и охватывает изменённые рабочие области вместе с зависящими от них.

## 7. Использовать Next.js под Yarn PnP

Если Next.js и Raijin работают в одном Yarn-проекте, корневому `package.json` нужен `"type": "module"`. Это правило Node.js для ES-модулей; [руководство Node.js](https://nodejs.org/api/packages.html#type) объясняет его подробнее. Исходники Next.js менять не нужно, а в монорепозитории у приложения остаётся собственный `tsconfig.json`.

```sh
yarn renderer build
yarn renderer start
yarn renderer dev
```

Эти команды передают сборку и запуск самому Next.js; под PnP сборка и разработка используют его [режим Webpack](https://nextjs.org/docs/app/api-reference/cli/next). Настройки приложения остаются за Next.js. Аргументы команд описаны в [renderer](../../packages/plugins/renderer/README.md).
