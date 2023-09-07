![toolset-github-cover](https://user-images.githubusercontent.com/102182195/234980835-78ed0fdb-c692-4b0e-ac95-b46c8cbd17a4.png)

# Atlantis Toolset

[//]: # 'VERSIONS'

[<img src="https://img.shields.io/static/v1?style=for-the-badge&label=%40atls%2Fcode-service&message=0.0.22&labelColor=ECEEF5&color=D7DCEB">](https://npmjs.com/package/@atls/code-service) [<img src="https://img.shields.io/static/v1?style=for-the-badge&label=%40atls%2Fschematics&message=0.0.17&labelColor=ECEEF5&color=D7DCEB">](https://npmjs.com/package/@atls/schematics)

[//]: # 'VERSIONS'

Монорепозиторий с набором инструментов и утилит, разработанных нашей командой, чтобы упростить разработку и работу над проектами.

Инструменты предназначены для использования в проектах на JavaScript и TypeScript и направлены на обеспечение согласованного опыта разработки и повышения производительности.

## ⚒️&nbsp;&nbsp;Некоторые из инструментов, включённых в этот репозиторий:

📦&nbsp;&nbsp; `Конфигурации для разных инструментов и библиотек (например, Jest, TypeScript, Prettier)` <br>
<br>
✨&nbsp;&nbsp; `Линтинг и форматирование кода`<br>
<br>
🔒&nbsp;&nbsp; `Pre-commit хуки для обеспечения качества кода`<br>
<br>
🧪&nbsp;&nbsp; `Тест-раннеры и утилиты`<br>
<br>
🏗️&nbsp;&nbsp; `Инструменты для сборки и бандлеры`<br>
<br>
📚&nbsp;&nbsp; `Генераторы кода и шаблоны`

## Основные скрипты `yarn` для нашей работы

Помимо стандартных скриптов `yarn` мы используем наши кастомные для облегчения работы:

### Общие

- `yarn check` - выполняет `typecheck`, `lint`, `format`. Выполняется так же автоматически при коммитах с помощью `husky`. <span style="font-weight: bold">Выполняем перед созданием Pull Request</span>
- `yarn files changed list` - вывод списка измененных файлов
- `yarn commit ...` - работа с коммитами
  - `message` - сообщение коммита
  - `staged` - стэйдж коммита
- `yarn set version https://raw.githubusercontent.com/atls/tools/master/yarn/cli/bundles/yarn.js` - обновление `yarn` в проекте

### Основные проверки

- `yarn typecheck` - проверяет тайпчеком проект
- `yarn lint` - проверяет линтером проект

### Форматирование

- `yarn format` - форматирует весь проект по нашему конфигу `prettier`

### Генерация

- `yarn generate project` - генерация схематики проекта
- `yarn badges generate` - генерирует бэйджи в корневом **README.md** по версиям в корневом **package.json**

### Билд

- `yarn service build` - билд проекта
- `yarn service dev` - дев разработка проекта
- `yarn library build`
- `yarn image pack`

### Тестирование

- `yarn test ...` - тестирование
  - `integration` - интеграционные тесты
  - `unit` - юнит тесты

### Проверка проекта на ошибки

- `yarn workspaces changed foreach image pack --publish --tag-policy hash-timestamp --registry some` - билд пакетов с изменениями.
- `yarn workspaces foreach image pack --publish --tag-policy hash-timestamp --registry some` - билд приложения целиком.

## Наши файлы конфигурации

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://github.com/atls/tools/blob/557cd9458c527b060e02316bc35469e208a800f2/config/typescript/src/index.ts)
[![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)](https://github.com/atls/tools/blob/557cd9458c527b060e02316bc35469e208a800f2/config/eslint/src/index.ts)
[![Prettier](https://img.shields.io/badge/prettier-1A2C34?style=for-the-badge&logo=prettier&logoColor=F7BA3E)](https://github.com/atls/tools/blob/557cd9458c527b060e02316bc35469e208a800f2/config/prettier/src/index.ts)
[![Jest](https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white)](https://github.com/atls/tools/blob/557cd9458c527b060e02316bc35469e208a800f2/config/jest/src/index.ts)
[![Webpack](https://img.shields.io/badge/webpack-%238DD6F9.svg?style=for-the-badge&logo=webpack&logoColor=black)](https://github.com/atls/tools/blob/8537e2f78ca5a2bd925548efce21a2d5c4800543/code/code-service/src/webpack.config.ts)

## Ресурсы

Бэйджи:

- https://github.com/Ileriayo/markdown-badges
- https://dev.to/envoy_/150-badges-for-github-pnk
