![toolset-github-cover](https://user-images.githubusercontent.com/102182195/234980835-78ed0fdb-c692-4b0e-ac95-b46c8cbd17a4.png)

# Atlantis Toolset

Монорепозиторий с набором инструментов и утилит, разработанных нашей командой, чтобы упростить разработку и работу над проектами.

Инструменты предназначены для использования в проектах на JavaScript и TypeScript и направлены на обеспечение согласованного опыта разработки и повышения производительности.

## Начало использования

**ВАЖНО:** Мы используем [собственный бандл `yarn`](https://yarnpkg.com/builder/cli/build/bundle).

Для начала использования нашей сборки:

Первая установка:

- `yarn set version https://raw.githubusercontent.com/atls/raijin/master/yarn/cli/dist/yarn.mjs` - эта команда установит вместо стокового `yarn` наш и положит в папку .yarn/releases, если же наша сборка уже установлена - произойдёт обновление до актуальной версии

Обновление бандла в уже установленном проекте:

- `yarn set version atls` - обновление бандла и обновление `@atls/code-runtime` до последней версии

## Основные скрипты `yarn` для нашей работы

Помимо стандартных скриптов `yarn` мы используем наши кастомные для облегчения работы:

### Общие

- `yarn check` - выполняет `typecheck`, `lint`, `format`. Выполняется так же автоматически при коммитах с помощью `husky`. <span style="font-weight: bold">Выполняем перед созданием Pull Request</span>
- `yarn files changed list` - вывод списка измененных файлов
- `yarn commit ...` - работа с коммитами
  - `message` - сообщение коммита
  - `staged` - стэйдж коммита

### Основные проверки

- `yarn typecheck` - проверяет тайпчеком проект
- `yarn lint` - проверяет линтером проект
  - `--cache` - использует кэш для скорости

### Форматирование

- `yarn format` - форматирует весь проект по нашему конфигу `prettier`

### Билд

- `yarn service build` - билд проекта
- `yarn service dev` - дев разработка проекта
- `yarn library build`
- `yarn image pack`

#### Настройка `image pack`

`package.json` энтрипоинта может содержать следующие параметры:

```json
  "packConfiguration": {
    "builderTag": "22",
    "buildpackVersion": "0.1.1",
    "require": [
      "curl",
      "htop"
    ]
  }
```

Где:

- `builderTag` - версия NodeJS для использования в образе. [Доступные опции](https://hub.docker.com/r/atlantislab/builder-base/tags)
- `buildpackVersion` - buildpacks to use. [Доступные опции](https://hub.docker.com/r/atlantislab/buildpack-yarn-workspace/tags)
- `require` - array of additional dependencies to be available in final image. [Доступные опции под префиксом `atlantislab/buildpack-extension-...`](https://hub.docker.com/u/atlantislab)

### Тестирование

- `yarn test ...` - тестирование
  - `integration` - интеграционные тесты. Запускает тесты лежащие в папках `integration`
  - `unit` - юнит тесты
    - `название файла/теста` - запускает только тесты в названии которых или названии файлов
      есть введенное название

В качестве параметров:

- `--watch` - запуск тестов при изменении в связанных с ними файлов
- `--watchAll` - запуск тестов при изменении в любых файлах

### Проверка проекта на ошибки

- `yarn workspaces changed foreach image pack` - билд пакетов с изменениями.
- `yarn workspaces foreach image pack` - билд приложения целиком.

### Генерация

- `yarn generate` - генерация схематики проекта
- `yarn badges generate` - генерирует бэйджи в корневом **README.md** по версиям в корневом **package.json**

## Наши файлы конфигурации

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://github.com/atls/raijin/blob/master/config/typescript/src/index.ts)
[![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)](https://github.com/atls/raijin/blob/master/config/eslint/src/index.ts)
[![Prettier](https://img.shields.io/badge/prettier-1A2C34?style=for-the-badge&logo=prettier&logoColor=F7BA3E)](https://github.com/atls/raijin/blob/master/config/prettier/src/index.ts)
[![Webpack](https://img.shields.io/badge/webpack-%238DD6F9.svg?style=for-the-badge&logo=webpack&logoColor=black)](https://github.com/atls/raijin/blob/master/code/code-service/src/webpack.config.ts)
